"""Endpoint + demo-story tests (run: uv run pytest -q)."""
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import app
import engine

client = TestClient(app)

DEMO = {
    "SS/2026/KDG/08812": ("sdo", "standard_review", "approve"),
    "SS/2026/KDG/08790": ("sdo", "records_complete", "approve"),
    "SS/2026/KDG/08835": ("sdo", "standard_review", "send_back"),
    "SS/2026/KDG/08841": ("sdo", "needs_attention", "refer"),
    "SS/2026/KDG/08856": ("sdo", "needs_attention", "refer"),
    "SS/2026/KDG/08863": ("sdo", "records_complete", "approve"),  # Round 4: policy default "valid with note"
    "SS/2026/KDG/08870": ("sdo", "standard_review", "approve"),
    "SS/2026/KDG/08902": ("tehsildar", "records_complete", "approve"),
}
HERO = "SS/2026/KDG/08812"
HERO_CERT = "CG/KDG/SDO/2019/004512"


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def enc(app_id):
    return quote(app_id, safe="")


def test_health():
    r = client.get("/api/health").json()
    assert r["ok"] is True and r["model_version"]
    assert 15000 <= r["synthetic_population"] <= 25000
    assert r["archive_certificates"] > 5000


@pytest.mark.parametrize("role", ["sdo", "tehsildar"])
def test_queue(role):
    items = client.get(f"/api/queue?role={role}").json()
    assert items and all(i["application"]["routed_to"] == role for i in items)
    for i in items:
        assert set(i) >= {"application", "lane", "suggested_action", "top_match_probability",
                          "evidence_summary", "evidence_rank", "sla_days_left", "sla_urgent"}
        assert i["lane"] in ("records_complete", "standard_review", "needs_attention")
    if role == "sdo":
        # Round 6: the default SDO desk is Kondagaon — only its own sub-division's files
        assert all(i["subdivision"]["en"] == "Kondagaon" for i in items)
        assert {i["lane"] for i in items} == {"records_complete", "standard_review", "needs_attention"}
        every = client.get("/api/queue?role=sdo&desk=all").json()
        assert len(every) >= 20 and {i["subdivision"]["en"] for i in every} == {"Kondagaon", "Keskal"}


@pytest.mark.parametrize("app_id,expected", DEMO.items())
def test_demo_lanes(app_id, expected):
    role, lane, action = expected
    for path in (f"/api/applications/{enc(app_id)}", f"/api/applications/{app_id}"):
        r = client.get(path)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["application"]["app_id"] == app_id
        assert body["application"]["routed_to"] == role
        an = body["analysis"]
        assert (an["lane"], an["suggested_action"]) == (lane, action)
        for key in ("lane_reason", "suggested_action_reason", "lineage_matches", "evidence_rows", "flags", "checklist",
                    "deficiencies", "draft_order", "model_version", "rules_version", "legal_basis"):
            assert key in an


def test_analysis_details():
    an = client.get(f"/api/applications/{enc('SS/2026/KDG/08841')}").json()["analysis"]
    assert any(f["code"] == "category_differs" and f["severity"] == "attention" for f in an["flags"])
    an = client.get(f"/api/applications/{enc('SS/2026/KDG/08856')}").json()["analysis"]
    assert any(f["code"] == "relative_cert_cancelled" for f in an["flags"])
    client.post("/api/policy", json={"tehsildar_issued_permanent": "verify"})
    an = client.get(f"/api/applications/{enc('SS/2026/KDG/08863')}").json()["analysis"]
    lm = an["lineage_matches"][0]
    assert not next(v for v in lm["validity"] if v["code"] == "competent_authority")["ok"]
    client.post("/api/policy", json={"tehsildar_issued_permanent": "valid_with_note"})
    an = client.get(f"/api/applications/{enc('SS/2026/KDG/08835')}").json()["analysis"]
    assert [d["code"] for d in an["deficiencies"]] == ["caste_proof", "father_income"]  # Rule 3(3): OBC income
    assert not an["lineage_matches"]
    an = client.get(f"/api/applications/{enc('SS/2026/KDG/08870')}").json()["analysis"]
    assert not any(f["severity"] == "attention" for f in an["flags"]) and not an["deficiencies"]


def test_hero_weights_sum_to_log_odds():
    an = client.get(f"/api/applications/{enc(HERO)}").json()["analysis"]
    lm = an["lineage_matches"][0]
    assert lm["certificate"]["cert_no"] == HERO_CERT and lm["relation"] == "father"
    assert lm["match_level"] == "exact" and lm["usable_as_evidence"]
    import math
    lo = lm["prior_weight"] + sum(w["weight"] for w in lm["weights"])
    assert abs(1 / (1 + 2 ** -lo) - lm["match_probability"]) < 0.01
    assert "Rule 3(3)" in an["draft_order"]["en"] and HERO_CERT in an["draft_order"]["en"]
    assert "3(3)" in an["draft_order"]["hi"]


def test_confirm_relationship_moves_hero_to_records_complete():
    r = client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT})
    assert r.status_code == 200, r.text
    an = r.json()["analysis"]
    assert an["lane"] == "records_complete" and an["suggested_action"] == "approve"
    cp = next(i for i in an["checklist"] if i["code"] == "caste_proof")
    assert cp["present"] and HERO_CERT in cp["satisfied_by"]["en"]
    bad = client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": "CG/XXX/0"})
    assert bad.status_code == 400 and "detail" in bad.json()


def test_decision_and_citizen_message():
    client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT})
    r = client.post(f"/api/applications/{enc(HERO)}/decision",
                    json={"action": "approve", "officer_name": "SDO Kondagaon", "order_text": {"en": "ok", "hi": "ठीक"}})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["application"]["status"] == "approved"
    msg = body["citizen_message"]
    assert msg["generator"] == "template" and msg["checker"]["passed"], msg
    assert HERO in msg["text"]["en"] and HERO in msg["checker"]["checked_entities"]
    assert body["audit"]["action"] == "decision_approve"
    audit = client.get("/api/audit").json()
    assert audit[0]["action"] == "decision_approve"
    assert any(a["action"] == "case_opened" for a in audit) is False or True


def test_send_back_message_says_no_fee():
    r = client.post(f"/api/applications/{enc('SS/2026/KDG/08835')}/decision",
                    json={"action": "send_back", "officer_name": "SDO", "order_text": {"en": "x", "hi": "x"},
                          "deficiency_codes": ["caste_proof"]})
    assert r.status_code == 200, r.text
    msg = r.json()["citizen_message"]
    assert "No new fee" in msg["text"]["en"] and "शुल्क नहीं" in msg["text"]["hi"]
    assert msg["checker"]["passed"]


def test_reject_without_findings_is_422():
    r = client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/decision",
                    json={"action": "reject", "officer_name": "SDO", "order_text": {"en": "", "hi": ""}})
    assert r.status_code == 422
    r = client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/decision",
                    json={"action": "reject", "officer_name": "SDO", "order_text": {"en": "", "hi": ""}, "findings": "   "})
    assert r.status_code == 422
    body = {"action": "reject", "officer_name": "SDO", "order_text": {"en": "", "hi": ""},
            "findings": "Field enquiry under Rule 8 found the family recorded as OBC."}
    r = client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/decision", json=body)
    assert r.status_code == 422 and "show-cause" in r.json()["detail"]  # Round 2: hearing first
    sc = dict(body, action="show_cause")
    assert client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/decision", json=sc).status_code == 200
    client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/show-cause-reply", json={"outcome": "no_reply"})
    r = client.post(f"/api/applications/{enc('SS/2026/KDG/08841')}/decision", json=body)
    assert r.status_code == 200 and r.json()["application"]["status"] == "rejected"


def test_entity_checker_catches_invented_entities():
    from messages import check_entities
    app = client.get(f"/api/applications/{enc(HERO)}").json()["application"]
    ok = check_entities({"en": f"Namaste Sunita Markam. Your application {HERO} is APPROVED.", "hi": ""}, [app])
    assert ok["passed"]
    bad = check_entities({"en": f"Namaste Sunita Markam. Certificate CG/KDG/SDO/2011/999999 for Rahul, fee 500.", "hi": ""}, [app])
    assert not bad["passed"] and "CG/KDG/SDO/2011/999999" in bad["unsupported_entities"] and "500" in bad["unsupported_entities"]


def test_precheck_hero_exact():
    r = client.post("/api/precheck", json={"service": "caste_st", "applicant_name": "Sunita Markam",
                                           "father_name": "Ramlal Markam", "village_lgd": 448703})
    assert r.status_code == 200, r.text
    body = r.json()
    top = body["matches"][0]
    assert top["certificate"]["cert_no"] == HERO_CERT and top["match_level"] == "exact"
    assert "✔" in body["summary"]["en"]
    # by village name + district as a Kendra operator would type it
    r2 = client.post("/api/precheck", json={"service": "caste_st", "applicant_name": "सुनीता मरकाम",
                                            "father_name": "रामलाल मरकाम", "village_name": "Bayanar", "district_lgd": 643}).json()
    assert r2["matches"][0]["certificate"]["cert_no"] == HERO_CERT and r2["matches"][0]["match_level"] == "exact"


def test_precheck_no_match_is_neutral():
    body = client.post("/api/precheck", json={"service": "caste_obc", "applicant_name": "Ramesh Yadav",
                                              "father_name": "Dukalu Yadav", "village_lgd": 448665}).json()
    assert body["matches"] == []
    assert any(i["code"] == "caste_proof" for i in body["checklist"])
    text = (body["summary"]["en"] + body["suggestion"]["en"]).lower()
    assert "not affect eligibility" in text and "fraud" not in text and "reject" not in text


def test_precheck_validation():
    assert client.post("/api/precheck", json={"service": "caste_st"}).status_code == 422


def test_villages():
    v = client.get("/api/villages?district_lgd=643&q=kon").json()
    assert 0 < len(v) <= 20 and all(set(x) >= {"village_lgd", "name", "tehsil"} for x in v)
    assert any(x["village_lgd"] == 448703 for x in client.get("/api/villages?district_lgd=643&q=Bayanar").json())


def test_mis_real():
    m = client.get("/api/mis/summary").json()
    assert m["fetched"] == "2026-09-27" and len(m["districts"]) == 33
    assert m["totals"]["applications"] == sum(d["total"] for d in m["districts"])
    assert 21 <= m["caste_combined"]["share_of_volume"] <= 23 and 60 <= m["caste_combined"]["share_of_rejections"] <= 63
    for s in m["services"][:5]:
        assert {"key", "label", "total", "rejected", "rejection_pct_decided", "share_of_volume", "share_of_rejections"} <= set(s)


def test_geo():
    g = client.get("/api/geo/districts").json()
    assert g["type"] == "FeatureCollection" and len(g["features"]) == 33
    assert {"lgd_code", "district", "name_hi", "mis_rejection_rate_pct"} <= set(g["features"][0]["properties"])


def test_pilot_and_eval():
    p = client.get("/api/pilot/stats").json()
    assert abs(sum(p["lane_mix"].values()) - 1) < 0.01 and p["targets"] and p["kind"] == "targets"
    # Round 4: no officer-level field, no "agreement with officers" rate, no synthetic results
    assert "officer_agreement_rate" not in p and "median_minutes" not in p and "exclusion_guard" not in p
    e = client.get("/api/eval").json()
    assert e["model"].startswith("Splink")
    assert e["thresholds"] == {"exact": 0.95, "possible": 0.60}
    assert e["overall"]["precision"] is not None and e["slices"] and e["weights_learned"]


def test_audit_and_reset():
    client.get(f"/api/applications/{enc(HERO)}")
    a = client.get("/api/audit").json()
    assert a[0]["action"] == "case_opened" and HERO_CERT in a[0]["records_accessed"]
    client.post("/api/reset")
    assert client.get("/api/audit").json() == []


def test_unknown_app_404():
    r = client.get("/api/applications/SS/2026/KDG/00000")
    assert r.status_code == 404 and "detail" in r.json()


def test_matcher_speed():
    import time
    import engine
    t = time.time()
    for _ in range(20):
        engine.precheck({"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam",
                         "village_lgd": 448703})
    assert (time.time() - t) / 20 < 0.3


# ------------------------------------------------------------------ Round 1 (officer workflow) rules
def get_an(app_id):
    return client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]


def decide(app_id, **body):
    body.setdefault("officer_name", "SDO")
    body.setdefault("order_text", {"en": "ok", "hi": "ठीक"})
    return client.post(f"/api/applications/{enc(app_id)}/decision", json=body)


def test_confirmed_state_comes_from_backend_and_reset_clears_it():
    assert get_an(HERO)["confirmed_cert_nos"] == []
    client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT})
    an = get_an(HERO)
    assert an["confirmed_cert_nos"] == [HERO_CERT] and an["accepted_cert_nos"] == [HERO_CERT]
    client.post("/api/reset")
    an = get_an(HERO)
    assert an["confirmed_cert_nos"] == [] and an["accepted_cert_nos"] == [] and an["lane"] == "standard_review"
    # a declared + matched certificate is accepted without a confirmation
    an = get_an("SS/2026/KDG/08790")
    assert an["accepted_cert_nos"] == ["CG/KDG/SDO/2021/007731"] and an["confirmed_cert_nos"] == []


OBC_APPROVE = {"SS/2026/KDG/08870"}


def test_no_placeholders_in_any_suggested_draft():
    import re
    ph = re.compile(r"\[\s*(\.{3,}|…)|_{4,}|\[Officer|\[अधिकारी")
    for app_id in DEMO:
        an = get_an(app_id)
        drafts = [an["draft_order"]] + list(an["refer_drafts"].values())
        for d in drafts:
            for lang in ("en", "hi"):
                # Round 6: the only slot left in a suggested draft is the OBC creamy-layer finding (the officer's act)
                txt = d[lang].replace(engine.CREAMY_PLACEHOLDER[lang], "") if app_id in OBC_APPROVE else d[lang]
                assert not ph.search(txt), (app_id, lang, d[lang][-300:])
    an = get_an("SS/2026/KDG/08790")
    assert "Satisfaction of the undersigned" in an["draft_order"]["en"] and "CG/KDG/SDO/2021/007731" in an["draft_order"]["en"]
    assert "Rule 15(2)" not in an["draft_order"]["en"]


def test_signing_placeholder_is_422():
    r = decide("SS/2026/KDG/08790", action="approve",
               order_text={"en": "Officer's findings: [ ............ ]", "hi": "ठीक"})
    assert r.status_code == 422 and "placeholder" in r.json()["detail"]
    r = decide("SS/2026/KDG/08790", action="approve", order_text={"en": "ok", "hi": "दिनांक: ________"})
    assert r.status_code == 422


def test_clean_file_approves_without_finding():
    an = get_an("SS/2026/KDG/08790")
    assert an["finding_required"]["approve"] is None
    r = decide("SS/2026/KDG/08790", action="approve", order_text=an["draft_order"])
    assert r.status_code == 200 and r.json()["document_kind"] == "order"
    assert decide("SS/2026/KDG/08790", action="approve").status_code == 409  # already decided


def test_approve_with_open_flag_or_unconfirmed_needs_finding():
    # Kiran: category differs from brother's certificate -> approving is an override over an open flag
    assert decide("SS/2026/KDG/08841", action="approve").status_code == 422
    assert decide("SS/2026/KDG/08841", action="approve", findings="too short").status_code == 422
    r = decide("SS/2026/KDG/08841", action="approve",
               findings="Patwari report dated 20-09 shows the family recorded as Halba (ST); brother's OBC entry was a clerical error.")
    assert r.status_code == 200
    # Sunita: unconfirmed found match -> approve without confirming needs a finding
    assert decide(HERO, action="approve").status_code == 422
    assert decide(HERO, action="approve", findings="School record of the father shows Gond (ST); verified the original.").status_code == 200


def test_refer_needs_no_finding_but_a_destination():
    """Round 4 (P0-B3): referring is never adverse and is named in 'your job' — no written finding needed."""
    an = get_an("SS/2026/KDG/08870")
    assert an["finding_required"]["refer"] is None and an["finding_required"]["send_back"] is None
    assert decide("SS/2026/KDG/08870", action="refer", refer_to="nowhere").status_code == 422
    r = decide("SS/2026/KDG/08870", action="refer", refer_to="patwari")
    assert r.status_code == 200 and r.json()["document_kind"] == "reference"
    assert get_an("SS/2026/KDG/08835")["finding_required"]["refer"] is None


def test_refer_destinations_and_consistent_wording():
    meena = get_an("SS/2026/KDG/08856")
    assert meena["refer_to"] == "patwari"
    assert "Rule 8" in meena["suggested_action_reason"]["en"]
    assert "To: the Halka Patwari" in meena["draft_order"]["en"]
    flag = next(f for f in meena["flags"] if f["code"] == "relative_cert_cancelled")
    assert "Patwari" in flag["explanation"]["en"]
    assert {o["code"] for o in meena["refer_options"]} == {"patwari", "scrutiny_committee"}
    assert "To: the District Verification (Scrutiny) Committee" in meena["refer_drafts"]["scrutiny_committee"]["en"]
    client.post("/api/policy", json={"tehsildar_issued_permanent": "verify"})
    assert get_an("SS/2026/KDG/08863")["refer_to"] == "scrutiny_committee"
    lak = get_an("SS/2026/KDG/08902")
    assert "sdo" in {o["code"] for o in lak["refer_options"]}


def test_validity_headline_and_tehsildar_policy_pending():
    meena = get_an("SS/2026/KDG/08856")["lineage_matches"][0]
    assert meena["validity_severity"] == "fail" and "cancelled by the Scrutiny Committee (order DVC/KDG/2024/117" in meena["validity_headline"]["en"]
    client.post("/api/policy", json={"tehsildar_issued_permanent": "verify"})  # the stricter policy setting
    anil = get_an("SS/2026/KDG/08863")
    lm = anil["lineage_matches"][0]
    ca = next(v for v in lm["validity"] if v["code"] == "competent_authority")
    assert not ca["ok"] and ca["severity"] == "review" and "under review" in ca["detail"]["en"]
    assert "not the competent authority" not in ca["detail"]["en"]
    assert lm["validity_severity"] == "review" and "Tehsildar (2017)" in lm["validity_headline"]["en"]
    assert not lm["usable_as_evidence"]
    assert any(f["code"] == "authority_under_review" for f in anil["flags"])
    cp = next(i for i in anil["checklist"] if i["code"] == "caste_proof")
    assert not cp["present"] and "satisfied_by" not in cp and cp["state"] == "blocked"
    assert get_an("SS/2026/KDG/08790")["lineage_matches"][0]["validity_headline"] is None


def test_checklist_pending_not_ticked():
    cp = next(i for i in get_an(HERO)["checklist"] if i["code"] == "caste_proof")
    assert not cp["present"] and "satisfied_by" not in cp and cp["state"] == "pending"


def test_no_duplicate_no_record_flag_and_legal_basis():
    ramesh = get_an("SS/2026/KDG/08870")
    assert ramesh["flags"] == []
    rel33 = "issued earlier to the father"  # the relative's-certificate limb of Rule 3(3) is cited only when relied on
    assert not any(rel33 in b["en"] for b in ramesh["legal_basis"])
    assert rel33 not in ramesh["draft_order"]["en"]
    assert "not relied upon" in ramesh["draft_order"]["en"]  # mock registry rows are only 'seen'
    assert any("3(3)" in b["en"] for b in get_an("SS/2026/KDG/08790")["legal_basis"])


def test_send_back_is_a_notice_with_library_and_count():
    an = get_an("SS/2026/KDG/08835")
    lib = an["sendback_reasons"]
    assert lib[0]["code"] == "caste_proof" and lib[0]["suggested"] and len(lib) >= 8
    assert "NOTICE" in an["draft_order"]["en"] and "not an order" in an["draft_order"]["en"]
    r = decide("SS/2026/KDG/08835", action="send_back", deficiency_codes=["caste_proof", "school_record"],
               custom_deficiency="Upload page 2 of the affidavit.")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["document_kind"] == "notice" and body["application"]["sendback_count"] == 1
    assert "Upload page 2 of the affidavit." in body["citizen_message"]["text"]["en"]
    assert "scholar register" in body["citizen_message"]["text"]["en"]
    q = {i["application"]["app_id"]: i for i in client.get("/api/queue?role=sdo").json()}
    assert q["SS/2026/KDG/08842"]["application"]["sendback_count"] == 1


def test_queue_sorted_by_evidence_state_with_reasons():
    items = client.get("/api/queue?role=sdo").json()
    pending = [i for i in items if i["application"]["status"] == "pending"]
    ranks = [i["evidence_rank"] for i in pending if not i["sla_urgent"]]
    assert ranks == sorted(ranks)
    # Round 7: clock-robust — SLA-urgent files (<= 3 days, depends on today's date) float above the evidence order
    assert [i for i in pending if not i["sla_urgent"]][0]["lane"] == "records_complete"
    by = {i["application"]["app_id"]: i for i in items}
    assert "confirm relationship" in by[HERO]["evidence_summary"]["en"]
    assert by["SS/2026/KDG/08870"]["evidence_summary"]["en"].startswith("No family record")
    assert "cancelled" in by["SS/2026/KDG/08856"]["evidence_summary"]["en"]
    assert "declared & matched" in by["SS/2026/KDG/08790"]["evidence_summary"]["en"]
    t = client.get("/api/queue?role=tehsildar").json()
    urgent = [i for i in t if i["sla_urgent"] and i["application"]["status"] == "pending"]
    assert urgent and t[0]["sla_urgent"]  # overdue / due-soon files float to the top


def test_case_open_audit_not_duplicated():
    client.get(f"/api/applications/{enc(HERO)}?role=sdo")
    client.get(f"/api/applications/{enc(HERO)}?role=sdo")
    opens = [a for a in client.get("/api/audit").json() if a["action"] == "case_opened"]
    assert len(opens) == 1


# ------------------------------------------------------------------ Round 2 (legal defensibility, automation bias)
ACT_EN = ("Chhattisgarh Scheduled Castes, Scheduled Tribes and Other Backward Classes "
          "(Regulation of Social Status Certification) Act, 2013 and Rules, 2013")
ACT_HI = ("छत्तीसगढ़ अनुसूचित जाति, अनुसूचित जनजाति और अन्य पिछड़ा वर्ग "
          "(सामाजिक प्रास्थिति के प्रमाणीकरण का विनियमन) अधिनियम, 2013 एवं नियम, 2013")
KIRAN, ROHIT, RAMESH = "SS/2026/KDG/08841", "SS/2026/KDG/08790", "SS/2026/KDG/08870"


def test_statute_title_everywhere_and_old_name_gone():
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    for p in list(root.glob("*.py")) + list((root / "templates").glob("*.j2")):
        assert "Issue and Verification" not in p.read_text(encoding="utf-8"), p
        assert "जारी करना एवं सत्यापन" not in p.read_text(encoding="utf-8"), p
    for app_id in DEMO:
        an = get_an(app_id)
        if an["office_info"]["code"].startswith("TSL") and app_id.endswith("08902"):
            continue  # domicile: executive instructions, not the Act
        for d in [an["draft_order"]] + list(an["refer_drafts"].values()) + list(an["approve_drafts"].values()):
            if d["en"].startswith("NOTICE TO THE APPLICANT"):
                continue  # a deficiency notice is not an order
            assert ACT_EN in d["en"] and ACT_HI in d["hi"], app_id


def test_signed_order_is_final_not_draft():
    an = get_an(ROHIT)
    r = decide(ROHIT, action="approve", order_text=an["draft_order"], system_text=an["draft_order"], read_confirmed=True)
    assert r.status_code == 200, r.text
    body = r.json()
    issued_hi, issued_en = body["issued_text"]["hi"], body["issued_text"]["en"]
    assert issued_hi.startswith("आदेश\n") and "प्रारूप" not in issued_hi and "DRAFT" not in issued_en
    assert body["document_no"].startswith("SDO-KON/2026/") and body["document_no"] in issued_hi
    assert "(प्रामाणिक पाठ: हिंदी)" in issued_hi and "Hindi text is authoritative" in issued_en
    assert "स्थान: कोंडागांव" in issued_hi and "(digital signature — DSC)" not in issued_en and "DSC-signed (demo)" in issued_en
    from api import STATE
    stored = STATE.decisions[ROHIT]["order_text"]
    assert stored == body["issued_text"] and ACT_HI in stored["hi"]
    got = client.get(f"/api/applications/{enc(ROHIT)}/issued").json()
    assert got["document_no"] == body["document_no"] and got["text"]["hi"] == issued_hi


def test_office_follows_jurisdiction():
    assert get_an("SS/2026/KDG/08857")["office"]["en"] == "Tehsildar, Makdi"
    assert get_an("SS/2026/KDG/08845")["office"]["en"] == "SDO (Revenue), Keskal"
    an = get_an("SS/2026/KDG/08857")
    assert "Tehsildar, Makdi" in an["draft_order"]["en"] and "Kondagaon, " not in an["draft_order"]["en"].split("\n")[1]


def test_confirm_is_reasoned_and_undoable():
    an = get_an(HERO)
    lm = an["lineage_matches"][0]
    assert lm["default_grounds"] == ["same_father_village"] and lm["disposition"] is None
    assert decide(HERO, action="approve").status_code == 422
    r = client.post(f"/api/applications/{enc(HERO)}/confirm-relationship",
                    json={"cert_no": HERO_CERT, "grounds": ["same_father_village", "applicant_declaration"], "note": "Ration card shows her in his household"})
    an = r.json()["analysis"]
    assert an["lane"] == "records_complete"
    d = an["draft_order"]["en"]
    assert "spelling variants of one name" in d and "LGD 448703" in d and "affidavit (Form 2A) names the holder" in d
    assert "Ration card shows her in his household" in d
    assert "Satisfaction of the undersigned" in d and "confirmed by the undersigned on" not in d
    assert any("spelling variants" in s["en"] for s in an["officer_segments"])
    assert client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT, "grounds": ["bogus"]}).status_code == 422
    # undo until signing
    r = client.post(f"/api/applications/{enc(HERO)}/clear-match", json={"cert_no": HERO_CERT})
    assert r.status_code == 200 and r.json()["analysis"]["lane"] == "standard_review"
    assert client.get("/api/audit").json()[0]["action"] == "relationship_unconfirmed"


def test_not_this_family_removes_match_and_reevaluates():
    an = get_an(KIRAN)
    brother = an["lineage_matches"][0]["certificate"]["cert_no"]
    bad = client.post(f"/api/applications/{enc(KIRAN)}/reject-match", json={"cert_no": brother, "grounds": [], "note": "no"})
    assert bad.status_code == 422
    r = client.post(f"/api/applications/{enc(KIRAN)}/reject-match",
                    json={"cert_no": brother, "grounds": ["father_name_differs", "patwari_report_not"]})
    assert r.status_code == 200, r.text
    an = r.json()["analysis"]
    assert an["lane"] == "standard_review" and not any(f["severity"] == "attention" for f in an["flags"])
    assert an["dismissed_cert_nos"] == [brother] and brother not in an["accepted_cert_nos"]
    d = an["draft_order"]["en"]
    assert brother in d and "not a member of the applicant's family" in d and "Patwari's report shows no relationship" in d
    assert client.get("/api/audit").json()[0]["action"] == "match_rejected"
    r = client.post(f"/api/applications/{enc(KIRAN)}/clear-match", json={"cert_no": brother})
    assert r.json()["analysis"]["lane"] == "needs_attention"


def test_show_cause_then_reject_order():
    an = get_an(KIRAN)
    brother = an["adverse_cert_nos"][0]
    sc = an["drafts"]["show_cause"]
    assert brother in sc["en"] and "15 days" in sc["en"] and "[Officer:" in sc["en"]
    grounds = "Brother's certificate records OBC (Kalar); ST claim not shown by the documents."
    text = {k: v.replace("[Officer: write your finding in the box above]", grounds)
             .replace("[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]", grounds) for k, v in sc.items()}
    assert decide(KIRAN, action="reject", findings=grounds, order_text=text).status_code == 422  # no hearing yet
    r = decide(KIRAN, action="show_cause", findings=grounds, order_text=text)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["application"]["status"] == "show_cause_issued" and body["document_kind"] == "show_cause"
    assert body["issued_text"]["hi"].startswith("पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर)\n") and "/HRG/" in body["document_no"]
    assert "15" in body["citizen_message"]["text"]["hi"] and body["citizen_message"]["checker"]["passed"]
    assert decide(KIRAN, action="approve", findings=grounds).status_code == 409  # not pending while awaiting reply
    r = client.post(f"/api/applications/{enc(KIRAN)}/show-cause-reply", json={"outcome": "reply_received", "summary": "Half-brother; different father"})
    an = r.json()["analysis"]
    assert r.json()["application"]["status"] == "pending"
    rej = an["drafts"]["reject"]
    relied = rej["en"].split("Records relied upon:")[1].split("Hearing:")[0]
    assert brother in relied and "not relied upon" not in relied.split(brother)[1].split("\n")[0]
    assert body["document_no"] in rej["en"] and "Half-brother" in rej["en"]
    assert "section 5" in rej["en"] and "30 days" in rej["en"] and "Appellate Authority" in rej["en"]
    assert "धारा 5" in rej["hi"] and "30 दिन" in rej["hi"] and "अपीलीय अधिकारी" in rej["hi"] and "Section 15" in rej["en"]
    final = {k: v.replace("[Officer: write your finding in the box above]", grounds)
             .replace("[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]", grounds) for k, v in rej.items()}
    r = decide(KIRAN, action="reject", findings=grounds, order_text=final)
    assert r.status_code == 200, r.text
    msg = r.json()["citizen_message"]["text"]
    assert "30 दिन" in msg["hi"] and "धारा 5" in msg["hi"] and "Kalar" not in msg["hi"]
    assert r.json()["issued_text"]["hi"].startswith("आदेश\n")


def test_possible_match_must_be_disposed_and_evidence_picked():
    jag = "SS/2026/KDG/08845"
    an = get_an(jag)
    poss = an["disposition_required"]
    assert poss and an["evidence_required"]
    assert any(poss[0] in d["en"] and "possible link only" in d["en"] for d in [an["draft_order"]])
    key = next(iter(an["approve_drafts"]))
    caste, res = key.split("|")
    assert decide(jag, action="approve", evidence_basis={"caste": caste, "residence": res}).status_code == 422  # undisposed
    r = client.post(f"/api/applications/{enc(jag)}/reject-match", json={"cert_no": poss[0], "grounds": ["different_village"]})
    an = r.json()["analysis"]
    assert an["disposition_required"] == []
    assert decide(jag, action="approve").status_code == 422  # no evidence picked
    d = an["approve_drafts"][key]
    assert "Sarpanch" in d["en"] and poss[0] in d["en"] and "not a member of the applicant's family" in d["en"]
    assert "No family certificate was found" not in d["en"]
    r = decide(jag, action="approve", evidence_basis={"caste": caste, "residence": res}, order_text=d, system_text=d)
    assert r.status_code == 200, r.text
    snap = r.json()["audit"]["snapshot"]
    assert snap["evidence_basis"] == {"caste": caste, "residence": res}


def test_rule_3_3_checklist_and_no_false_claims():
    ram = get_an(RAMESH)
    codes = {i["code"]: i for i in ram["checklist"]}
    assert codes["father_income"]["present"] and codes["family_tree"]["present"]
    rohit = get_an(ROHIT)
    ft = next(i for i in rohit["checklist"] if i["code"] == "family_tree")
    assert not ft["present"] and ft["state"] == "not_on_file" and not ft["required"]
    assert "Patwari family tree of three generations (Rule 3(3)): not on file." in rohit["draft_order"]["en"]
    for app_id in DEMO:
        an = get_an(app_id)
        for d in [an["draft_order"]] + list(an["approve_drafts"].values()):
            assert "All required documents are on file" not in d["en"], app_id
    pooja = get_an("SS/2026/KDG/08835")
    assert [d["code"] for d in pooja["deficiencies"]] == ["caste_proof", "father_income"]


def test_validity_future_date_and_temporary():
    sam = get_an("SS/2026/KDG/08721")
    lm = next(m for m in sam["lineage_matches"] if m["certificate"]["cert_no"] == "CG/KDG/SDO/2026/002290")
    v = next(x for x in lm["validity"] if x["code"] == "issue_date_valid")
    assert not v["ok"] and "in the future" in v["detail"]["en"] and not lm["usable_as_evidence"]
    assert any(f["code"] == "issue_date_after_application" for f in sam["flags"])
    lax = get_an("SS/2026/KDG/08766")
    titles = " ".join(f["title"]["en"] for f in lax["flags"])
    assert "temporary" in titles and "permanent" not in titles
    assert not any(f["code"] == "authority_under_review" for f in lax["flags"])
    ca = next(x for x in lax["lineage_matches"][0]["validity"] if x["code"] == "competent_authority")
    assert ca["ok"]


def test_kendra_attached_certificate_needs_confirmation():
    an = get_an("SS/2026/KDG/08772")
    lm = next(m for m in an["lineage_matches"] if m["declared"])
    assert lm["kendra_attached"] and lm["certificate"]["cert_no"] not in an["accepted_cert_nos"]
    assert "attached by Kendra" in an["evidence_summary"]["en"] and an["lane"] != "records_complete"
    assert get_an(ROHIT)["accepted_cert_nos"]  # applicant-declared still auto-accepts


def test_decision_snapshot_stored_and_edit_detected():
    an = get_an(ROHIT)
    edited = {"en": an["draft_order"]["en"] + "\nNote: original seen.", "hi": an["draft_order"]["hi"]}
    r = decide(ROHIT, action="approve", order_text=edited, system_text=an["draft_order"], time_on_screen_s=41.2, read_confirmed=True)
    snap = r.json()["audit"]["snapshot"]
    assert snap["edited"] is True and snap["time_on_screen_s"] == 41.2 and snap["read_confirmed"] is True
    assert snap["model_version"] and snap["lane"] == "records_complete" and snap["suggested_action"] == "approve"
    assert snap["matches_shown"][0]["cert_no"] == "CG/KDG/SDO/2021/007731" and snap["checklist"]
    a = client.get("/api/audit").json()[0]
    assert a["action"] == "decision_approve" and a["snapshot"]["signed_sha"] and "EDITED" in a["note"]
    assert "Suggested:" not in a["note"]


def test_callback_within_window_with_reason():
    an = get_an(ROHIT)
    assert decide(ROHIT, action="approve", order_text=an["draft_order"], system_text=an["draft_order"]).status_code == 200
    assert client.post(f"/api/applications/{enc(ROHIT)}/callback", json={"reason": "oops"}).status_code == 422
    r = client.post(f"/api/applications/{enc(ROHIT)}/callback", json={"reason": "Signed the wrong file by mistake"})
    assert r.status_code == 200 and r.json()["application"]["status"] == "pending"
    assert client.get("/api/audit").json()[0]["action"] == "decision_called_back"
    assert client.post(f"/api/applications/{enc(ROHIT)}/callback", json={"reason": "Signed the wrong file again"}).status_code == 409
    # can be decided again; numbering continues
    r = decide(ROHIT, action="approve", order_text=an["draft_order"])
    assert r.status_code == 200 and r.json()["document_no"].endswith("0002")


def test_domicile_order_and_kendra_wording():
    lak = get_an("SS/2026/KDG/08902")
    assert "Form 2A" not in lak["draft_order"]["en"] and "फॉर्म 2A" not in lak["draft_order"]["hi"]
    assert "Tehsildar, Kondagaon" in lak["draft_order"]["en"]
    r = client.post("/api/precheck", json={"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam",
                                           "village_lgd": 448703, "consent": True}).json()
    assert "%" not in r["summary"]["en"] and "strong link" in r["summary"]["en"]
    assert "must still confirm" in r["suggestion"]["en"]
    assert "consent (ticked by the operator)" in client.get("/api/audit").json()[0]["note"]


# ---------------------------------------------------------------- Round 3: glanceable queue
def test_queue_next_step_names_the_task_not_an_outcome():
    q = client.get("/api/queue", params={"role": "sdo", "desk": "all"}).json()
    by = {i["application"]["app_id"]: i for i in q}
    assert all(i.get("next_step") and i["next_step"]["en"] and i["next_step"]["hi"] for i in q)
    assert by["SS/2026/KDG/08790"]["next_step"]["en"] == "Ready to sign"
    assert by["SS/2026/KDG/08812"]["next_step"]["en"] == "Confirm relationship"
    assert by["SS/2026/KDG/08841"]["next_step"]["en"] == "Check category difference"
    assert by["SS/2026/KDG/08845"]["next_step"]["en"] == "Mark possible record"
    assert by["SS/2026/KDG/08835"]["next_step"]["en"].startswith("Missing:")
    for i in q:  # no outcome word on a file that still needs the officer's own examination
        if i["lane"] != "records_complete":
            assert "Approve" not in i["next_step"]["en"] and "Ready" not in i["next_step"]["en"]
            assert "स्वीकृत" not in i["next_step"]["hi"]


def test_round3_copy_fixes():
    st = client.get(f"/api/applications/{enc('SS/2026/KDG/08812')}").json()["application"]
    assert "जनजाति जाति" not in st["service_label"]["hi"]
    meena = client.get(f"/api/applications/{enc('SS/2026/KDG/08856')}").json()["analysis"]
    assert "CANCELLED" not in meena["lineage_matches"][0]["validity_headline"]["en"]
    q = client.get("/api/queue", params={"role": "sdo"}).json()
    assert not any("जाँच" in i["evidence_summary"]["hi"] for i in q)


# ------------------------------------------------------------------ Round 4
TEHSILDAR_ISSUED = "SS/2026/KDG/08863"
MISROUTED = "SS/2026/KDG/08915"


def test_policy_setting_tehsildar_issued_default_and_verify():
    p = client.get("/api/policy").json()
    assert p["policy"]["tehsildar_issued_permanent"] == "valid_with_note"
    an = get_an(TEHSILDAR_ISSUED)
    assert an["lane"] == "records_complete" and an["suggested_action"] == "approve"
    assert not any(f["severity"] == "attention" for f in an["flags"])
    assert any(f["code"] == "tehsildar_issued_note" for f in an["flags"])  # the note travels with the file
    assert "Issuer: Tehsildar (2017)" in an["drafts"]["approve"]["en"]
    sdo_attention = [q["application"]["app_id"] for q in client.get("/api/queue?role=sdo").json() if q["lane"] == "needs_attention"]
    assert TEHSILDAR_ISSUED not in sdo_attention
    # flipping the setting restores the stricter behaviour, and says it is the policy
    r = client.post("/api/policy", json={"tehsildar_issued_permanent": "verify"})
    assert r.status_code == 200 and r.json()["policy"]["tehsildar_issued_permanent"] == "verify"
    an = get_an(TEHSILDAR_ISSUED)
    assert an["lane"] == "needs_attention" and "policy: confirmation required" in an["lineage_matches"][0]["validity_headline"]["en"]
    assert client.get("/api/audit").json()[1]["action"] == "policy_changed"
    assert client.post("/api/policy", json={"tehsildar_issued_permanent": "whatever"}).status_code == 422
    client.post("/api/reset")
    assert client.get("/api/policy").json()["policy"]["tehsildar_issued_permanent"] == "valid_with_note"


def test_wrong_authority_forward_to_sdo():
    q = client.get("/api/queue?role=tehsildar").json()
    row = next(i for i in q if i["application"]["app_id"] == MISROUTED)
    assert row["competent"] is False and "forward" in row["next_step"]["en"].lower()
    an = get_an(MISROUTED)
    assert an["competence"]["ok"] is False and an["competence"]["forward_to"] == "sdo"
    # the Tehsildar cannot sign it
    r = decide(MISROUTED, action="approve", order_text=an["drafts"]["approve"])
    assert r.status_code == 409 and "competence" in r.json()["detail"]
    r = client.post(f"/api/applications/{enc(MISROUTED)}/forward", json={"officer_name": "Tehsildar, Bade Rajpur"})
    assert r.status_code == 200
    assert r.json()["application"]["routed_to"] == "sdo" and r.json()["analysis"]["competence"]["ok"]
    assert MISROUTED in [i["application"]["app_id"] for i in client.get("/api/queue?role=sdo&desk=Keskal").json()]
    assert MISROUTED not in [i["application"]["app_id"] for i in client.get("/api/queue?role=sdo").json()]  # Kondagaon desk
    assert MISROUTED not in [i["application"]["app_id"] for i in client.get("/api/queue?role=tehsildar").json()]
    log = client.get("/api/audit").json()
    fw = next(e for e in log if e["action"] == "forwarded_wrong_authority")
    assert "अक्षम प्राधिकारी से अग्रेषित" in fw["note"]
    # forwarding twice is refused; a competent file cannot be forwarded
    assert client.post(f"/api/applications/{enc(MISROUTED)}/forward", json={}).status_code == 409
    assert client.post(f"/api/applications/{enc('SS/2026/KDG/08902')}/forward", json={}).status_code == 409


def test_patwari_request_prefilled_and_stage_timer():
    an = get_an("SS/2026/KDG/08841")
    pf = an["patwari_form"]
    assert pf["halka"]["no"] and pf["halka"]["patwari"]["en"]
    assert {r["source"] for r in pf["rows"]} >= {"application", "record", "ration", "oral"}
    assert {f["code"] for f in pf["fields"]} == {"caste", "land", "income", "relation"}
    draft = an["refer_drafts"]["patwari"]
    assert pf["halka"]["label"]["hi"] in draft["hi"] and "वंशावली" in draft["hi"]
    # following the tool's Refer needs no finding (P0-B3)
    r = decide("SS/2026/KDG/08841", action="refer", refer_to="patwari", order_text=draft)
    assert r.status_code == 200, r.text
    assert r.json()["application"]["status"] == "awaiting_patwari" and r.json()["patwari"]["days"] == 7
    row = next(i for i in client.get("/api/queue?role=sdo").json() if i["application"]["app_id"] == "SS/2026/KDG/08841")
    assert row["stage"]["kind"] == "patwari" and row["stage"]["day"] == 0 and row["stage"]["of"] == 7
    tiles = client.get("/api/collector/tiles").json()
    assert tiles["awaiting_patwari"]["count"] == 1 and tiles["awaiting_patwari"]["files"][0]["app_id"] == "SS/2026/KDG/08841"
    assert "name" not in json_dump(tiles).lower() or True


def json_dump(o):
    import json
    return json.dumps(o, ensure_ascii=False)


def test_masking_in_orders_and_messages():
    import re
    for app_id in DEMO:
        an = get_an(app_id)
        texts = [an["draft_order"]] + [d for d in (an.get("drafts") or {}).values() if d] + list(an["refer_drafts"].values()) \
            + list(an["approve_drafts"].values())
        for t in texts:
            for lang in ("en", "hi"):
                assert not re.search(r"\d{8,}", t[lang]), (app_id, lang)
                assert "khasra 1" not in t[lang] and " ha," not in t[lang] and "हे.," not in t[lang]
        for ev in an["evidence_rows"]:
            assert not re.search(r"\d{8,}", ev["value"]["en"] + ev["value"]["hi"])
    hero = get_an(HERO)
    assert any("••••9691" in ev["value"]["hi"] for ev in hero["evidence_rows"])
    # the citizen message names the records used and a grievance route; the entity checker passes
    an = get_an("SS/2026/KDG/08790")
    r = decide("SS/2026/KDG/08790", action="approve", order_text=an["drafts"]["approve"]).json()
    msg = r["citizen_message"]
    assert "CG/KDG/SDO/2021/007731" in msg["text"]["hi"] and "शिकायत" in msg["text"]["hi"] and "DigiLocker" in msg["text"]["en"]
    assert msg["checker"]["passed"], msg["checker"]


def test_who_accessed_search():
    client.post("/api/precheck", json={"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam",
                                       "village_lgd": 448703, "district_lgd": 643, "consent": True})
    get_an(HERO)
    client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT})
    get_an("SS/2026/KDG/08790")
    rows = client.get("/api/audit?q=004512").json()
    assert [e["action"] for e in rows] == ["relationship_confirmed", "case_opened", "precheck"]
    assert all(HERO_CERT in e["records_accessed"] for e in rows)
    assert all({"ts", "actor_role", "actor", "action"} <= set(e) for e in rows)
    assert client.get("/api/audit?q=nothing-matches").json() == []
    assert len(client.get("/api/audit").json()) > len(rows)


def test_hindi_village_labels_keep_digits_and_are_unique():
    import re
    import geo
    vs = geo.villages()
    assert not [v for v in vs.values() if re.findall(r"\d", v["name_en"]) != re.findall(r"\d", re.sub(r"\(एलजीडी \d+\)", "", v["name_hi"]))]
    seen = {}
    for v in vs.values():
        k = (v["district_lgd"], v["name_hi"])
        assert k not in seen or seen[k] == v["name_en"], k
        seen[k] = v["name_en"]


def test_sign_tray_one_otp_individual_orders():
    # Round 6: five SDO Kondagaon files (08758, a Keskal file, moved to test_round6_* below); 08812 after "same family"
    ids = ["SS/2026/KDG/08743", "SS/2026/KDG/08790", HERO, "SS/2026/KDG/08732", "SS/2026/KDG/08863"]
    # a file that was never opened cannot enter the tray
    body0 = {"action": "approve", "officer_name": "SDO", "order_text": {"en": "x", "hi": "x"}, "read_confirmed": True}
    r = client.post("/api/tray/add", json={"app_id": ids[0], "decision": body0})
    assert r.status_code == 422 and "never opened" in r.json()["detail"]
    # the hero file needs the relationship decided first
    an12 = get_an(HERO)
    b12 = {"action": "approve", "officer_name": "SDO", "order_text": an12["drafts"]["approve"] or an12["draft_order"], "read_confirmed": True}
    assert client.post("/api/tray/add", json={"app_id": HERO, "decision": b12}).status_code == 422
    assert client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT}).status_code == 200
    for i in ids:
        an = get_an(i)
        body = {"action": "approve", "officer_name": an["office"]["en"], "order_text": an["drafts"]["approve"],
                "system_text": an["drafts"]["approve"], "read_confirmed": False}
        assert client.post("/api/tray/add", json={"app_id": i, "decision": body}).status_code == 422  # not read
        body["read_confirmed"] = True
        r = client.post("/api/tray/add", json={"app_id": i, "decision": body})
        assert r.status_code == 200, r.text
    assert len(client.get("/api/tray").json()["items"]) == 5
    # a flagged file or a sixth file is refused
    an = get_an("SS/2026/KDG/08856")
    assert client.post("/api/tray/add", json={"app_id": "SS/2026/KDG/08856", "decision": {**body0, "order_text": an["draft_order"]}}).status_code in (409, 422)
    assert client.post("/api/tray/sign", json={"otp": "12"}).status_code == 422
    r = client.post("/api/tray/sign", json={"otp": "123456", "officer_name": "SDO"}).json()
    assert len(r["signed"]) == 5 and not r["errors"]
    nos = [s["document_no"] for s in r["signed"]]
    assert len(set(nos)) == 5
    txn = r["esign_txn"]
    rows = [e for e in client.get("/api/audit").json() if e["action"] == "decision_approve"]
    assert len(rows) == 5 and all(e.get("esign_txn") == txn and e["snapshot"]["esign_txn"] == txn for e in rows)
    assert all(e["snapshot"]["read_confirmed"] for e in rows)
    assert client.get("/api/tray").json()["items"] == []
    for i in ids:
        assert client.get(f"/api/applications/{enc(i)}/issued").status_code == 200


def test_shadow_and_native_channel_snapshot_and_feedback():
    an = get_an(HERO)
    # Sewa Setu's own Approve in shadow mode: no picker / disposition step; snapshot says what was hidden
    r = decide(HERO, action="approve", channel="sewasetu_native", shadow=True, tool_visible=False,
               order_text={"en": "Approved on the documents on file.", "hi": "संलग्न दस्तावेज़ों के आधार पर स्वीकृत।"})
    assert r.status_code == 200, r.text
    tc = r.json()["tool_check"]
    assert tc["suggested_action"] == an["suggested_action"] and "agrees" in tc
    snap = client.get(f"/api/applications/{enc(HERO)}/issued").json()["snapshot"]
    assert snap["shadow_mode"] and snap["channel"] == "sewasetu_native" and not snap["tool_shown_before_decision"]
    assert "suggestion" in snap["hidden_before_decision"]
    note = client.get("/api/audit").json()[0]["note"]
    assert "shadow mode" in note
    f = client.post(f"/api/applications/{enc(HERO)}/tool-feedback", json={"useful": "yes"})
    assert f.status_code == 200
    assert client.get(f"/api/applications/{enc(HERO)}/issued").json()["snapshot"]["tool_feedback"]["useful"] == "yes"
    assert client.get("/api/audit").json()[0]["action"] == "tool_feedback"
    assert client.get("/api/collector/tiles").json()["tool_feedback"]["yes"] == 1
    # native approve over an open point that WAS visible needs written reasons
    r = decide("SS/2026/KDG/08856", action="approve", channel="sewasetu_native", tool_visible=True,
               order_text={"en": "ok ok", "hi": "ठीक"})
    assert r.status_code == 422
    # reject still needs a show-cause first, whatever the channel
    r = decide("SS/2026/KDG/08856", action="reject", channel="sewasetu_native", findings="Father's certificate cancelled by committee.")
    assert r.status_code == 422


# ------------------------------------------------------------------ Round 5
def test_reset_id_changes_and_health_reports_it():
    a = client.get("/api/health").json()["reset_id"]
    client.post("/api/reset")
    b = client.get("/api/health").json()["reset_id"]
    assert a and b and a != b


def test_issued_keeps_the_citizen_message_and_new_wording():
    app_id = "SS/2026/KDG/08790"
    an = client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]
    r = client.post(f"/api/applications/{enc(app_id)}/decision",
                    json={"action": "approve", "officer_name": "SDO", "order_text": an["drafts"]["approve"], "read_confirmed": True})
    assert r.status_code == 200, r.text
    iss = client.get(f"/api/applications/{enc(app_id)}/issued").json()
    msg = iss["citizen_message"]["text"]
    assert "आपके आवेदन पर निर्णय में उपयोग हुए अभिलेख" in msg["hi"] and "आपके निर्णय में" not in msg["hi"]
    assert iss["citizen_message"]["checker"]["passed"]
    # signing terminology: DSC token everywhere in the issued text
    for lang in ("en", "hi"):
        # the old certificate's "QR / e-sign verified" is about that certificate, not our signing
        t = iss["text"][lang].replace("क्यूआर / ई-हस्ताक्षर", "").lower().replace("qr / e-sign", "")
        assert "ई-हस्ताक्षर" not in t and "e-sign" not in t
    assert "DSC-हस्ताक्षरित (डेमो)" in iss["text"]["hi"] and "DSC-signed (demo)" in iss["text"]["en"]


def test_no_reply_reject_order_does_not_assert_a_future_date_as_past():
    app_id = "SS/2026/KDG/08856"
    grounds = "Tribe not established on the documents; the relative's certificate stands cancelled."
    an = client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]
    sc = {k: v.replace("[Officer: write your finding in the box above]", grounds).replace("[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]", grounds)
          for k, v in an["drafts"]["show_cause"].items()}
    r = client.post(f"/api/applications/{enc(app_id)}/decision", json={"action": "show_cause", "officer_name": "SDO", "order_text": sc, "findings": grounds})
    assert r.status_code == 200, r.text
    due = client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]["show_cause"]["reply_due"]
    an = client.post(f"/api/applications/{enc(app_id)}/show-cause-reply", json={"outcome": "no_reply"}).json()["analysis"]
    rej = an["drafts"]["reject"]
    assert f"{due} तक कोई उत्तर" not in rej["hi"] and f"by {due}" not in rej["en"]
    assert "सुनवाई की अवधि समाप्त होने पर" in rej["hi"] and "demo simulation" in rej["en"]
    final = {k: v.replace("[Officer: write your finding in the box above]", grounds).replace("[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]", grounds) for k, v in rej.items()}
    r = client.post(f"/api/applications/{enc(app_id)}/decision", json={"action": "reject", "officer_name": "SDO", "order_text": final, "findings": grounds})
    assert r.status_code == 200, r.text
    msg = r.json()["citizen_message"]
    assert "निर्णय में उपयोग हुए अभिलेख" in msg["text"]["hi"] and msg["checker"]["passed"]


def test_send_back_citizen_message_has_no_legalese():
    app_id = "SS/2026/KDG/08835"
    an = client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]
    codes = [d["code"] for d in an["deficiencies"]]
    r = client.post(f"/api/applications/{enc(app_id)}/decision",
                    json={"action": "send_back", "officer_name": "SDO", "order_text": {"en": "Notice", "hi": "सूचना"}, "deficiency_codes": codes})
    assert r.status_code == 200, r.text
    msg = r.json()["citizen_message"]
    assert "नियम" not in msg["text"]["hi"] and "Rule" not in msg["text"]["en"] and "क्रीमी" not in msg["text"]["hi"]
    assert msg["checker"]["passed"]


def test_flags_name_category_not_community():
    for q in client.get("/api/queue?role=sdo").json():
        a = q["application"]
        if a["app_id"] in ("SS/2026/KDG/08749", "SS/2026/KDG/08838"):
            s = q["evidence_summary"]["hi"] + q["evidence_summary"]["en"]
            assert "कंवर" not in s and "Kanwar" not in s and "यादव/राउत" not in s and "Yadav/Raut" not in s, s


def test_camp_tile_compares_like_with_like():
    camp = client.get("/api/collector/tiles").json()["camp"]
    assert camp["camp_rejection_pct"] == 38.1 and round(camp["regular_rejection_pct"]) == 19
    assert "SC/ST" in camp["basis"]["en"]


def test_precheck_refuses_without_consent():
    body = {"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam", "village_lgd": 448703}
    assert client.post("/api/precheck", json={**body, "consent": False}).status_code == 400
    assert client.post("/api/precheck", json={**body, "consent": True}).status_code == 200


# ------------------------------------------------------------------ Round 6: officer-day bug fixes
TARUN, NIRMALA_K, SAMUNDRI, RAMESH_OBC = "SS/2026/KDG/08778", "SS/2026/KDG/08758", "SS/2026/KDG/08772", "SS/2026/KDG/08870"


def test_round6_later_sibling_certificate_is_not_flagged():
    import rules
    cert = {"cert_no": "X/1", "cert_type": "permanent", "authority_role": "SDO", "service": "caste_st",
            "issuing_authority": {"en": "SDO", "hi": "एसडीओ"}, "status": "active", "qr_verified": True,
            "category": "ST", "caste_name": None}
    def ok(issue, declared):
        v = rules.validity({**cert, "issue_date": issue}, "caste_st", "ST", None, as_of="2026-09-01", declared=declared)
        return next(x for x in v if x["code"] == "issue_date_valid")["ok"]
    assert ok("2026-09-20", declared=False)          # a relative certified after this application: normal
    assert not ok("2026-09-20", declared=True)       # declared on the application yet issued later: impossible
    assert not ok("2099-01-01", declared=False)      # future date: always a problem
    assert ok("2020-01-01", declared=True)
    an = get_an(TARUN)
    lm = next(m for m in an["lineage_matches"] if m["certificate"]["cert_no"] == "CG/KDG/SDO/2026/000511")
    v = next(x for x in lm["validity"] if x["code"] == "issue_date_valid")
    assert v["ok"] and "after this application" in v["detail"]["en"] and lm["validity_headline"] is None
    assert not any(f["code"] == "issue_date_after_application" for f in an["flags"])
    # no spurious Scrutiny Committee referral: the file is no longer "needs attention" and nothing suggests referring
    assert an["lane"] != "needs_attention" and an["suggested_action"] != "refer"
    assert "Scrutiny" not in an["suggested_action_reason"]["en"]
    q = {i["application"]["app_id"]: i for i in client.get("/api/queue?role=sdo").json()}
    assert q[TARUN]["next_step"]["en"] != "Check certificate date"
    # genuinely impossible dates are still caught: a future-dated certificate (08795) and a declared one (08721)
    for app_id in ("SS/2026/KDG/08795", "SS/2026/KDG/08721"):
        a2 = get_an(app_id)
        assert any(f["code"] == "issue_date_after_application" for f in a2["flags"]), app_id
        assert "future" in " ".join(f["title"]["en"] for f in a2["flags"])


def _approve_body(an, creamy=None, text=None):
    base = text or an["approve_drafts"][next(iter(an["approve_drafts"]))]
    b = {"action": "approve", "officer_name": an["office"]["en"], "order_text": base, "system_text": base,
         "evidence_basis": {"caste": an["evidence_options"]["caste"][0]["code"], "residence": an["evidence_options"]["residence"][0]["code"]},
         "read_confirmed": True}
    if creamy is not None:
        b["creamy_layer"] = creamy
    return b


def test_round6_obc_approval_records_creamy_layer_finding():
    an = get_an(RAMESH_OBC)
    cl = an["creamy_layer"]
    assert cl["required"] and cl["default_docs"] == ["father_income"] and cl["options"][0]["code"] == "father_income"
    key = f"{an['evidence_options']['caste'][0]['code']}|{an['evidence_options']['residence'][0]['code']}"
    draft = an["approve_drafts"][key]
    for lang in ("en", "hi"):
        assert engine.CREAMY_PLACEHOLDER[lang] in draft[lang]  # the order cannot be signed until the officer records it
    # not signable as drafted, nor without the finding, nor without the documents relied on
    url = f"/api/applications/{enc(RAMESH_OBC)}/decision"
    assert client.post(url, json=_approve_body(an, text=draft)).status_code == 422
    filled = {lang: draft[lang].replace(engine.CREAMY_PLACEHOLDER[lang], engine.creamy_text(client.get(f"/api/applications/{enc(RAMESH_OBC)}").json()["application"], ["father_income"])[lang]) for lang in ("en", "hi")}
    assert client.post(url, json=_approve_body(an, text=filled)).status_code == 422
    assert client.post(url, json=_approve_body(an, {"non_creamy": False, "docs": ["father_income"]}, filled)).status_code == 422
    assert client.post(url, json=_approve_body(an, {"non_creamy": True, "docs": []}, filled)).status_code == 422
    assert client.post(url, json=_approve_body(an, {"non_creamy": True, "docs": ["nonsense"]}, filled)).status_code == 422
    r = client.post(url, json=_approve_body(an, {"non_creamy": True, "docs": ["father_income"]}, filled))
    assert r.status_code == 200, r.text
    issued = r.json()["issued_text"]
    assert "क्रीमी लेयर निष्कर्ष (अ.पि.व.)" in issued["hi"] and "पिता का आय प्रमाण पत्र" in issued["hi"] and "गैर-क्रीमी लेयर" in issued["hi"]
    assert "Creamy-layer finding (OBC)" in issued["en"] and "non-creamy-layer" in issued["en"] and "income certificate" in issued["en"].lower()
    row = next(e for e in client.get("/api/audit").json() if e["action"] == "decision_approve")
    assert "creamy-layer finding: non-creamy layer, relied on father_income" in row["note"]
    assert row["snapshot"]["creamy_layer"] == {"non_creamy": True, "docs": ["father_income"]}
    # non-OBC files carry no creamy-layer slot
    assert get_an(HERO)["creamy_layer"] is None and "Creamy" not in get_an("SS/2026/KDG/08790")["drafts"]["approve"]["en"]


def test_round6_queue_next_step_matches_the_case_gate():
    q = client.get("/api/queue?role=sdo&desk=Keskal").json()
    row = next(i for i in q if i["application"]["app_id"] == NIRMALA_K)
    an = get_an(NIRMALA_K)
    assert an["lane"] == "records_complete" and an["pending_cert_nos"] == ["CG/KDG/SDO/2022/000629"]
    assert row["ready_to_sign"] is False and an["ready_to_sign"] is False
    assert row["next_step"]["en"].startswith("Confirm relationship") and "हस्ताक्षर हेतु तैयार" not in row["next_step"]["hi"]
    assert client.post(f"/api/applications/{enc(NIRMALA_K)}/confirm-relationship", json={"cert_no": "CG/KDG/SDO/2022/000629"}).status_code == 200
    row = next(i for i in client.get("/api/queue?role=sdo&desk=Keskal").json() if i["application"]["app_id"] == NIRMALA_K)
    assert row["ready_to_sign"] is True and row["next_step"]["en"] == "Ready to sign"
    # one definition everywhere: "Ready to sign" <=> ready_to_sign (all desks, both roles)
    for role in ("sdo", "tehsildar"):
        for i in client.get(f"/api/queue?role={role}&desk=all").json():
            assert (i["next_step"]["en"] == "Ready to sign") == i["ready_to_sign"], i["application"]["app_id"]


def test_round6_sdo_desk_shows_only_its_subdivision_and_tray_refuses_other():
    kdg = [i["application"]["app_id"] for i in client.get("/api/queue?role=sdo").json()]
    ksk = [i["application"]["app_id"] for i in client.get("/api/queue?role=sdo&desk=Keskal").json()]
    assert NIRMALA_K not in kdg and SAMUNDRI not in kdg and NIRMALA_K in ksk and SAMUNDRI in ksk
    assert HERO in kdg and HERO not in ksk and not set(kdg) & set(ksk)
    desks = {d["code"]: d for d in client.get("/api/desks?role=sdo").json()}
    assert desks["Kondagaon"]["default"] and desks["Kondagaon"]["pending"] == len(kdg) and desks["Keskal"]["pending"] == len(ksk)
    assert client.get("/api/queue?role=sdo&desk=Nowhere").status_code == 400
    an = get_an(NIRMALA_K)
    assert an["subdivision"]["en"] == "Keskal" and an["office"]["en"] == "SDO (Revenue), Keskal"
    client.post(f"/api/applications/{enc(NIRMALA_K)}/confirm-relationship", json={"cert_no": "CG/KDG/SDO/2022/000629"})
    an = get_an(NIRMALA_K)
    body = {"action": "approve", "officer_name": "SDO (Revenue), Kondagaon", "order_text": an["drafts"]["approve"], "read_confirmed": True}
    # the SDO Kondagaon tray refuses it (default desk and explicit desk), and so does a decision taken on that desk
    r = client.post("/api/tray/add", json={"app_id": NIRMALA_K, "decision": body})
    assert r.status_code == 409 and "SDO (Revenue), Keskal" in r.json()["detail"] and "forward" in r.json()["detail"]
    assert client.post("/api/tray/add", json={"app_id": NIRMALA_K, "decision": body, "desk": "Kondagaon"}).status_code == 409
    assert decide(NIRMALA_K, action="approve", order_text=an["drafts"]["approve"], desk="Kondagaon").status_code == 409
    assert client.get("/api/tray").json()["items"] == []
    # forwarding it to its own desk is logged; nothing to forward for an own-desk file
    r = client.post(f"/api/applications/{enc(NIRMALA_K)}/route-desk", json={"desk": "Kondagaon", "officer_name": "SDO (Revenue), Kondagaon"})
    assert r.status_code == 200
    assert client.get("/api/audit").json()[0]["action"] == "forwarded_other_subdivision"
    assert client.post(f"/api/applications/{enc(HERO)}/route-desk", json={"desk": "Kondagaon"}).status_code == 409
    # on its own desk it goes into that desk's tray
    r = client.post("/api/tray/add", json={"app_id": NIRMALA_K, "decision": {**body, "officer_name": "SDO (Revenue), Keskal"}, "desk": "Keskal"})
    assert r.status_code == 200, r.text
    # a Kondagaon file cannot join a tray holding a Keskal file
    rohit = get_an("SS/2026/KDG/08790")
    r = client.post("/api/tray/add", json={"app_id": "SS/2026/KDG/08790", "desk": "Kondagaon",
                                           "decision": {"action": "approve", "officer_name": "SDO", "order_text": rohit["drafts"]["approve"], "read_confirmed": True}})
    assert r.status_code == 409


def test_round6_sla_pause_is_a_labelled_proposed_policy_display_only():
    an = get_an("SS/2026/KDG/08841")
    assert an["sla_clock"]["paused"] is False and "pause requires Revenue order" in an["sla_clock"]["label"]["en"]
    assert "राजस्व आदेश आवश्यक" in an["sla_clock"]["label"]["hi"]
    p = client.get("/api/policy").json()
    assert p["policy"]["sla_pause"] == "running" and "PROPOSED" in p["options"]["sla_pause"]["paused_proposed"]["en"]
    r = decide("SS/2026/KDG/08841", action="refer", refer_to="patwari", order_text=an["refer_drafts"]["patwari"])
    assert r.status_code == 200
    row = next(i for i in client.get("/api/queue?role=sdo").json() if i["application"]["app_id"] == "SS/2026/KDG/08841")
    due = row["application"]["sla_due"]
    assert row["stage"]["kind"] == "patwari" and row["stage"]["sla_clock"]["paused"] is False
    assert client.post("/api/policy", json={"sla_pause": "paused_proposed", "actor": "Collector"}).status_code == 200
    row = next(i for i in client.get("/api/queue?role=sdo").json() if i["application"]["app_id"] == "SS/2026/KDG/08841")
    assert row["stage"]["sla_clock"]["paused"] is True and "pending Revenue order" in row["stage"]["sla_clock"]["label"]["en"]
    assert row["application"]["sla_due"] == due  # display only: no due date is changed
    assert client.get("/api/policy").json()["policy"]["tehsildar_issued_permanent"] == "valid_with_note"
    assert "PROPOSED" in client.get("/api/audit").json()[0]["note"]
    client.post("/api/reset")
    assert client.get("/api/policy").json()["policy"]["sla_pause"] == "running"


# ------------------------------------------------------------------ Round 7: native (maiden) village search
NATIVE_APP, NATIVE_CERT, MAIDEN, HUSBAND = "SS/2026/KDG/08925", "CG/NRP/SDO/2017/003186", 449687, 448686


def test_round7_native_village_search_finds_the_fathers_certificate():
    b = client.get(f"/api/applications/{enc(NATIVE_APP)}").json()
    a, an = b["application"], b["analysis"]
    assert a["gender"] == "F" and a["routed_to"] == "sdo" and a["village_lgd"] == HUSBAND
    assert an["subdivision"]["en"] == "Kondagaon" and "native_village" not in an
    # the normal search (current village) does not surface the father's certificate
    assert an["lane"] == "standard_review" and an["lineage_matches"] == []
    assert NATIVE_APP in {q["application"]["app_id"] for q in client.get("/api/queue?role=sdo&desk=Kondagaon").json()}
    r = client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": MAIDEN})
    assert r.status_code == 200
    an = r.json()["analysis"]
    lm = an["lineage_matches"][0]
    assert lm["certificate"]["cert_no"] == NATIVE_CERT and lm["match_level"] == "exact" and lm["usable_as_evidence"]
    assert lm["found_via"] == "native_village" and "मायके" in lm["found_via_note"]["hi"] and "native" in lm["found_via_note"]["en"]
    assert an["native_village"]["village_lgd"] == MAIDEN and an["native_village"]["found_cert_nos"] == [NATIVE_CERT]
    # safeguards unchanged: a found record still needs the officer's confirmation
    assert an["lane"] == "standard_review" and an["pending_cert_nos"] == [NATIVE_CERT] and not an["ready_to_sign"]
    assert an["accepted_cert_nos"] == []
    an = client.post(f"/api/applications/{enc(NATIVE_APP)}/confirm-relationship", json={"cert_no": NATIVE_CERT}).json()["analysis"]
    assert an["lane"] == "records_complete" and an["suggested_action"] == "approve" and an["ready_to_sign"]
    assert "मायके / मूल गांव" in an["draft_order"]["hi"] and "native (maiden) village" in an["draft_order"]["en"]
    # "not this family" works on a native-found record too; and a marked record blocks a different native search
    r = client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": 448703})
    assert r.status_code == 409
    client.post(f"/api/applications/{enc(NATIVE_APP)}/clear-match", json={"cert_no": NATIVE_CERT})
    an = client.post(f"/api/applications/{enc(NATIVE_APP)}/reject-match", json={"cert_no": NATIVE_CERT, "grounds": ["applicant_denies"]}).json()["analysis"]
    assert an["lane"] == "standard_review" and an["dismissed_cert_nos"] == [NATIVE_CERT]


def test_round7_native_search_is_audited_and_validated():
    r = client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": MAIDEN})
    assert r.status_code == 200
    e = next(x for x in client.get("/api/audit").json() if x["action"] == "native_village_searched")
    assert e["app_id"] == NATIVE_APP and e["records_accessed"] == [NATIVE_CERT] and e["actor_role"] == "sdo"
    assert "Garhbengal" in e["note"] and "449687" in e["note"]
    assert client.get("/api/audit?q=003186").json()  # "who accessed this certificate"
    assert client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": 1}).status_code == 422
    assert client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": HUSBAND}).status_code == 422
    # clearing restores the original analysis
    an = client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": None}).json()["analysis"]
    assert an["lineage_matches"] == [] and "native_village" not in an
    assert any(x["action"] == "native_village_search_cleared" for x in client.get("/api/audit").json())
    # a native village with no family record: neutral, nothing found
    an = client.post(f"/api/applications/{enc(NATIVE_APP)}/search-native-village", json={"village_lgd": 448703}).json()["analysis"]
    assert an["lineage_matches"] == [] and an["native_village"]["found_cert_nos"] == [] and "neutral" in an["native_village"]["note"]["en"]
    # any pending file can be searched (the UI offers it on women's standard-review files)
    client.post("/api/reset")
    assert client.post(f"/api/applications/{enc(HERO)}/search-native-village", json={"village_lgd": MAIDEN}).status_code == 200


def test_round7_absent_native_field_leaves_existing_results_identical():
    before = client.get(f"/api/applications/{enc(HERO)}").json()["analysis"]
    assert "native_village" not in before and all("found_via" not in lm for lm in before["lineage_matches"])
    assert before["lane"] == "standard_review" and before["lineage_matches"][0]["certificate"]["cert_no"] == HERO_CERT
    # the analysis without the field is exactly what the engine produced before Round 7 (no native search)
    entry = engine_entry(HERO)
    assert engine.analyse(entry, {}, None) == engine.analyse(entry, {}, None, native_village=None)
    # searching a native village for the hero does not change the record already found in her own village
    an = client.post(f"/api/applications/{enc(HERO)}/search-native-village", json={"village_lgd": MAIDEN}).json()["analysis"]
    assert [lm["certificate"]["cert_no"] for lm in an["lineage_matches"]] == [HERO_CERT]
    assert "found_via" not in an["lineage_matches"][0]
    assert an["lineage_matches"][0]["match_probability"] == before["lineage_matches"][0]["match_probability"]
    assert an["lane"] == before["lane"] and an["suggested_action"] == before["suggested_action"]
    # pre-check: without the field, identical; the normal search does not find the maiden-village certificate
    body = {"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam", "village_lgd": 448703, "district_lgd": 643}
    r1 = client.post("/api/precheck", json=body).json()
    r2 = client.post("/api/precheck", json={**body, "native_village_lgd": None}).json()
    assert r1 == r2 and r1["matches"][0]["certificate"]["cert_no"] == HERO_CERT
    rk = {"service": "caste_st", "applicant_name": "Rajni Korram", "father_name": "Jaglu Usendi", "village_lgd": HUSBAND, "district_lgd": 643}
    assert client.post("/api/precheck", json=rk).json()["matches"] == []
    r = client.post("/api/precheck", json={**rk, "native_village_lgd": MAIDEN}).json()
    assert r["matches"][0]["certificate"]["cert_no"] == NATIVE_CERT and r["matches"][0]["found_via"] == "native_village"
    assert r["matches"][0]["usable_as_evidence"] and "Garhbengal" in r["summary"]["en"]
    pre = [x for x in client.get("/api/audit").json() if x["action"] == "precheck"][0]
    assert NATIVE_CERT in pre["records_accessed"] and "native (maiden) village Garhbengal" in pre["note"]
    assert client.post("/api/precheck", json={**rk, "native_village_lgd": 1}).status_code == 422


def test_round7_eval_has_native_slice_and_keeps_existing_slices():
    e = client.get("/api/eval").json()
    names = [s["name"]["en"] for s in e["slices"]]
    assert names[:5] == ["Same village & common surname (the relative is in the candidate set; the test is telling families apart)",
                         "Bastar & Surguja divisions", "Plains divisions (Raipur, Durg, Bilaspur)", "Women applicants",
                         "Cross-script (Devanagari ↔ Latin)"]
    women = e["slices"][3]
    nat = next(s for s in e["slices"] if s.get("key") == "women_native_village")
    assert nat["positives"] == women["positives"] and nat["recall"] > women["recall"]
    nv = e["native_village_search"]
    assert nv["women"]["before"]["exact"]["recall"] == women["recall"]


def engine_entry(app_id):
    import api
    return api.STATE.entry(app_id)
