"""Citizen portal: the Family Proof Helper (masked archive search) and online filing into the SDO queue."""
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import app

client = TestClient(app)
SUNITA = {"session_id": "test-sunita", "service": "caste_st", "applicant_name": "सुनीता मरकाम", "father_name": "रामलाल मरकाम",
          "village_lgd": 448703, "district_lgd": 643, "consent": True, "aadhaar_ok": True}


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def enc(x):
    return quote(x, safe="")


def test_search_needs_aadhaar_and_consent():
    assert client.post("/api/citizen/precheck", json={**SUNITA, "aadhaar_ok": False}).status_code == 403
    assert client.post("/api/citizen/precheck", json={**SUNITA, "consent": False}).status_code == 400


def test_search_result_is_masked():
    r = client.post("/api/citizen/precheck", json=SUNITA)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["status"] == "found_usable" and d["masked_no"] == "••••4512" and d["year"] == "2019"
    flat = str(d)
    # never the holder's name, the full number, the village or the category
    for leak in ("CG/KDG/SDO/2019/004512", "रामलाल", "Ramlal", "Bayanar", "बयानार", "ST", "Gond", "गोंड"):
        assert leak not in flat.replace("SDO", ""), leak
    a = client.get("/api/audit").json()[0]
    assert a["action"] == "citizen_precheck" and a["actor_role"] == "citizen" and "shown masked" in a["note"]


def test_search_limit_three_per_application():
    s = {**SUNITA, "session_id": "test-limit", "father_name": "Somebody Unknown"}
    for _ in range(3):
        assert client.post("/api/citizen/precheck", json=s).status_code == 200
    assert client.post("/api/citizen/precheck", json=s).status_code == 429


def test_submit_with_found_certificate_reaches_the_sdo_and_needs_confirmation():
    ref = client.post("/api/citizen/precheck", json=SUNITA).json()["proof_ref"]
    r = client.post("/api/citizen/submit", json={"session_id": "test-sunita", "service": "caste_st", "applicant_name_hi": "सुनीता मरकाम",
                                                 "applicant_name_en": "Sunita Markam", "father_name_hi": "रामलाल मरकाम", "father_name_en": "Ramlal Markam",
                                                 "gender": "F", "birth_year": 2008, "caste": "गोंड", "village_lgd": 448703, "purpose": "छात्रवृत्ति",
                                                 "proof_ref": ref, "other_docs": ["affidavit"]})
    assert r.status_code == 200, r.text
    app_id = r.json()["app_id"]
    assert app_id.startswith("SS/2026/KDG/09") and r.json()["proof"]["masked_no"] == "••••4512"
    msg = r.json()["citizen_message"]
    assert msg["checker"]["passed"], msg["checker"]
    assert "••••4512" in msg["text"]["hi"] and "CG/KDG/SDO/2019/004512" not in str(msg)
    q = client.get("/api/queue?role=sdo&desk=Kondagaon").json()
    assert app_id in [x["application"]["app_id"] for x in q]
    an = client.get(f"/api/applications/{enc(app_id)}").json()["analysis"]
    m = next(m for m in an["lineage_matches"] if m["certificate"]["cert_no"] == "CG/KDG/SDO/2019/004512")
    assert m["citizen_attached"] and m["declared"] and not m["kendra_attached"]
    assert "CG/KDG/SDO/2019/004512" not in an["accepted_cert_nos"]  # the officer still confirms the relationship
    assert an["lane"] != "records_complete"


def test_submit_without_papers_requests_inquiry():
    r = client.post("/api/citizen/submit", json={"session_id": "test-ramesh", "service": "caste_obc", "applicant_name_en": "Ramesh Yadav",
                                                 "applicant_name_hi": "रमेश यादव", "father_name_en": "Bhagwati Yadav", "father_name_hi": "भगवती यादव",
                                                 "gender": "M", "birth_year": 2004, "village_lgd": 448804, "no_papers": True,
                                                 "vanshavali": [{"relation": "दादा", "name": "रामधन यादव", "village": "उमरगांव", "place_1950": "उमरगांव"}]})
    assert r.status_code == 200, r.text
    assert r.json()["inquiry_requested"] is True and r.json()["proof"] is None
    e = client.get(f"/api/applications/{enc(r.json()['app_id'])}").json()
    assert e["application"]["inquiry_requested"] is True
    assert any(d["code"] == "unavailability_declaration" and d["uploaded"] for d in e["application"]["documents"])


def test_submit_needs_some_caste_proof_path():
    r = client.post("/api/citizen/submit", json={"session_id": "test-x", "service": "caste_st", "applicant_name_en": "A B", "father_name_en": "C D",
                                                 "gender": "M", "birth_year": 2000, "village_lgd": 448703})
    assert r.status_code == 422


def test_maiden_village_hit_carries_to_the_officer():
    q = {"session_id": "test-rajni", "service": "caste_st", "applicant_name": "Rajni Korram", "father_name": "Jaglu Usendi",
         "village_lgd": 448686, "district_lgd": 643, "native_village_lgd": 449687, "consent": True, "aadhaar_ok": True}
    d = client.post("/api/citizen/precheck", json=q).json()
    assert d["status"] == "found_usable" and d["found_via_native"]
    r = client.post("/api/citizen/submit", json={"session_id": "test-rajni", "service": "caste_st", "applicant_name_en": "Rajni Korram",
                                                 "applicant_name_hi": "रजनी कोर्राम", "father_name_en": "Jaglu Usendi", "father_name_hi": "जगलू उसेंडी",
                                                 "gender": "F", "birth_year": 1999, "village_lgd": 448686, "proof_ref": d["proof_ref"]})
    an = client.get(f"/api/applications/{enc(r.json()['app_id'])}").json()["analysis"]
    m = [m for m in an["lineage_matches"] if m.get("citizen_attached")]
    assert m and m[0].get("found_via") == "native_village"


# ---------------------------------------------------------------- QA round: citizen pipeline fixes
RAMESH = {"session_id": "test-ramesh-qa", "service": "caste_obc", "applicant_name_en": "Ramesh Yadav", "applicant_name_hi": "रमेश यादव",
          "father_name_en": "Bhagwati Yadav", "father_name_hi": "भगवती यादव", "gender": "M", "birth_year": 2004, "village_lgd": 448804,
          "no_papers": True, "other_docs": ["father_income"],
          "vanshavali": [{"relation": "पिता", "name": "भगवती यादव", "village": "उमरगांव", "place_1950": "उमरगांव"}]}


def test_no_papers_is_suggested_for_the_patwari_inquiry_not_sent_back_for_papers():
    app_id = client.post("/api/citizen/submit", json=RAMESH).json()["app_id"]
    an = client.get(f"/api/applications/{enc(app_id)}?role=sdo").json()["analysis"]
    assert an["suggested_action"] == "refer" and an["refer_to"] == "patwari"
    assert "Rule 7" in an["suggested_action_reason"]["en"] and "नियम 7" in an["suggested_action_reason"]["hi"]
    q = {x["application"]["app_id"]: x for x in client.get("/api/queue?role=sdo&desk=all").json()}
    assert "Patwari" in q[app_id]["next_step"]["en"]
    # an ordinary file with a missing caste proof (no declaration) is still sent back for it
    other = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-doc-qa", "no_papers": False, "other_docs": ["caste_proof", "father_income"]}).json()
    assert other["inquiry_requested"] is False


def test_citizen_searches_are_linked_to_the_filed_application():
    ref = client.post("/api/citizen/precheck", json={**SUNITA, "session_id": "test-audit-qa"}).json()["proof_ref"]
    r = client.post("/api/citizen/submit", json={"session_id": "test-audit-qa", "service": "caste_st", "applicant_name_hi": "सुनीता मरकाम",
                                                 "applicant_name_en": "Sunita Markam", "father_name_hi": "रामलाल मरकाम", "father_name_en": "Ramlal Markam",
                                                 "gender": "F", "birth_year": 2008, "village_lgd": 448703, "proof_ref": ref,
                                                 "aadhaar_last4": "1165", "mobile_last4": "3973"}).json()
    rows = client.get("/api/audit", params={"q": r["app_id"]}).json()
    assert {"citizen_precheck", "citizen_submitted"} <= {x["action"] for x in rows}
    a = client.get(f"/api/applications/{enc(r['app_id'])}").json()["application"]
    assert a["aadhaar_last4"] == "1165" and a["mobile_last4"] == "3973"


def test_submit_twice_in_one_session_returns_the_same_application():
    first = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-twice"}).json()
    again = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-twice"}).json()
    assert first["app_id"] == again["app_id"]
    ids = [x["application"]["app_id"] for x in client.get("/api/queue?role=sdo&desk=all").json()]
    assert ids.count(first["app_id"]) == 1


def test_only_the_last_four_aadhaar_digits_are_accepted():
    r = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-uid", "aadhaar_last4": "123412341234"})
    assert r.status_code == 422


def test_patwari_referral_tells_the_citizen_what_happens():
    app_id = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-ref-msg"}).json()["app_id"]
    bundle = client.get(f"/api/applications/{enc(app_id)}?role=sdo").json()
    d = bundle["analysis"]["refer_drafts"]["patwari"]
    r = client.post(f"/api/applications/{enc(app_id)}/decision", json={"action": "refer", "refer_to": "patwari", "order_text": d, "system_text": d, "officer_name": "SDO (Revenue), Kondagaon"})
    assert r.status_code == 200, r.text
    msg = r.json()["citizen_message"]
    assert "पटवारी" in msg["text"]["hi"] and "अस्वीकृति नहीं" in msg["text"]["hi"] and "Patwari" in msg["text"]["en"]
    assert msg["checker"]["passed"], msg["checker"]
    assert r.json()["application"]["status"] == "awaiting_patwari"


# ---------------------------------------------------------------- QA round 13: console / citizen / Kendra bug pass
def test_concurrent_filings_get_distinct_application_numbers():
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(8) as ex:
        out = list(ex.map(lambda i: client.post("/api/citizen/submit", json={**RAMESH, "session_id": f"test-conc-{i}"}).json()["app_id"], range(8)))
    assert len(set(out)) == 8, out
    ids = [x["application"]["app_id"] for x in client.get("/api/queue?role=sdo&desk=all").json()]
    assert all(ids.count(a) == 1 for a in out)


def test_double_submit_in_flight_files_one_application():
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(4) as ex:
        out = list(ex.map(lambda _: client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-inflight"}).json()["app_id"], range(4)))
    assert len(set(out)) == 1


def test_birth_year_cannot_be_in_the_future_but_this_year_is_fine():
    from datetime import datetime
    y = datetime.now().year
    assert client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-by-1", "birth_year": y + 1}).status_code == 422
    assert client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-by-2", "birth_year": y}).status_code == 200


def test_found_certificate_and_no_papers_together_is_refused():
    ref = client.post("/api/citizen/precheck", json={**SUNITA, "session_id": "test-both"}).json()["proof_ref"]
    r = client.post("/api/citizen/submit", json={**RAMESH, "service": "caste_st", "session_id": "test-both", "proof_ref": ref, "no_papers": True})
    assert r.status_code == 422


def test_lists_are_bounded():
    many = [{"relation": "पिता", "name": "x"}] * 50
    assert client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-big", "vanshavali": many}).status_code == 422
    assert client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-big2", "other_docs": ["a"] * 100}).status_code == 422


def test_officer_reads_the_declaration_as_signed_and_english_relations():
    decl = "मैं, रमेश यादव, पिता भगवती यादव, निवासी ग्राम उमरगांव, घोषणा करता हूँ कि मेरे पास 26 दिसंबर 1984 से पहले के निवास का कोई दस्तावेज़ उपलब्ध नहीं है।"
    app_id = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-decl", "declaration": decl}).json()["app_id"]
    e = client.get(f"/api/applications/{enc(app_id)}").json()
    d = next(d for d in e["application"]["documents"] if d["code"] == "unavailability_declaration")
    assert d["text"] == decl
    rows = [r for r in e.get("evidence_rows", []) if r["source"]["en"].startswith("Applicant's family tree")] or \
           [r for r in client.get(f"/api/applications/{enc(app_id)}").json().get("analysis", {}).get("evidence_rows", []) if "family tree" in r["source"]["en"]]
    assert rows and rows[0]["field"]["en"] == "Father" and rows[0]["field"]["hi"] == "पिता"


def test_receipt_message_names_the_due_date_as_a_deadline():
    r = client.post("/api/citizen/submit", json={**RAMESH, "session_id": "test-msg-due"}).json()
    assert "निर्णय की अंतिम तिथि" in r["citizen_message"]["text"]["hi"] and r["citizen_message"]["checker"]["passed"]


def test_blank_father_name_does_not_use_up_a_search():
    s = {**SUNITA, "session_id": "test-blank"}
    for bad in ("  ", "--", "..."):
        assert client.post("/api/citizen/precheck", json={**s, "father_name": bad}).status_code == 422
    assert client.post("/api/citizen/precheck", json=s).json()["searches_left"] == 2
