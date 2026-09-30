"""Round 8b: income-certificate renewal (second service on the same engine) + the visible agent trace."""
from datetime import date, timedelta
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import app
import engine
import renewal
from messages import check_entities

client = TestClient(app)
HERO = "SS/2026/KDG/08812"


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def enc(x):
    return quote(x, safe="")


# ------------------------------------------------------------------ renewals
def test_renewal_list_windows_and_strength():
    r = client.get("/api/renewals?district_lgd=643").json()
    assert r["synthetic"] is True and r["window_days"] == 60 and r["district"]["en"] == "Kondagaon"
    items = r["items"]
    assert len(items) >= 10
    assert [i["days_left"] for i in items] == sorted(i["days_left"] for i in items)
    assert all(0 <= i["days_left"] <= 60 for i in items)
    assert r["counts"]["d60"] == len(items) and r["counts"]["d30"] == sum(i["days_left"] <= 30 for i in items)
    assert {i["strength"] for i in items} <= {"strong", "partial", "verify"}
    assert {"strong", "partial", "verify"} <= {i["strength"] for i in items}  # all three shown in the demo district
    for i in items:
        c = i["certificate"]
        assert c["service"] == "income" and c["district_lgd"] == 643 and c["synthetic"] is True
        assert not any(k.startswith("_") for k in c)
        issued = date.fromisoformat(c["issue_date"])
        assert date.fromisoformat(c["valid_until"]) - issued == timedelta(days=364)   # valid one year
        assert len(i["evidence"]) == 3 and i["evidence"][0]["status"] == "ok"      # last year's certificate
        assert i["window"] == (30 if i["days_left"] <= 30 else 60)
    # the hero family (Ramlal Markam, Bayanar) is in the list, strong, 12 days
    hero = next(i for i in items if i["certificate"]["holder_name"]["en"] == "Ramlal Markam")
    assert hero["days_left"] == renewal.HERO_DAYS and hero["strength"] == "strong" and hero["certificate"]["village_lgd"] == 448703
    # 30-day window; REAL MIS share; roadmap; deterministic
    r30 = client.get("/api/renewals?district_lgd=643&window=30").json()
    assert len(r30["items"]) == r["counts"]["d30"]
    assert r["context"]["income_share_of_volume"] == pytest.approx(48.98, abs=0.1)
    assert {x["code"] for x in r["roadmap"]} == {"legal_heir", "ews"}
    assert client.get("/api/renewals?district_lgd=643").json()["items"] == items
    assert client.get("/api/renewals?district_lgd=999999").status_code == 422


def test_rule_file_flags_low_income_large_land():
    assert renewal.rule_flags({"affidavit_income": 24000, "land_acres": 7.5}) == ["LOW_INCOME_BUT_LARGE_LANDHOLDING"]
    assert renewal.rule_flags({"affidavit_income": 68000, "land_acres": 3.0}) == []
    items = client.get("/api/renewals?district_lgd=643").json()["items"]
    v = [i for i in items if i["strength"] == "verify"]
    assert v and all(f["code"] == "LOW_INCOME_BUT_LARGE_LANDHOLDING" for i in v for f in i["rule_flags"])


def test_renewal_prefill_needs_citizen_and_officer_and_is_audited():
    items = client.get("/api/renewals?district_lgd=643").json()["items"]
    cn = items[0]["certificate"]["cert_no"]
    r = client.post(f"/api/renewals/{cn}/prefill")
    assert r.status_code == 200
    rec = r.json()
    assert rec["renewal_id"].startswith("REN/KDG/") and rec["status"] == "awaiting_citizen_confirmation"
    assert rec["citizen_confirmation"]["required"] is True and rec["citizen_confirmation"]["confirmed"] is False
    assert rec["officer_step"]["required"] is True and rec["officer_step"]["auto_issue"] is False
    assert rec["source_certificate"]["cert_no"] == cn and len(rec["evidence_reused"]) == 3
    assert sum(f["source"]["en"] == "Last year's certificate" for f in rec["fields"]) >= 4
    # idempotent; audited once; listed with its renewal id
    assert client.post(f"/api/renewals/{cn}/prefill").json()["renewal_id"] == rec["renewal_id"]
    rows = [e for e in client.get("/api/audit").json() if e["action"] == "renewal_prefilled"]
    assert len(rows) == 1 and cn in rows[0]["records_accessed"]
    assert client.get(f"/api/audit?q={enc(cn)}").json()
    listed = next(i for i in client.get("/api/renewals?district_lgd=643").json()["items"] if i["certificate"]["cert_no"] == cn)
    assert listed["renewal_id"] == rec["renewal_id"]
    assert client.post("/api/renewals/CG/KDG/TSL/INC/2025/999999/prefill").status_code == 404
    # reset clears the prefilled renewals
    client.post("/api/reset")
    assert all(i["renewal_id"] is None for i in client.get("/api/renewals?district_lgd=643").json()["items"])


def test_renewal_nudge_plain_hindi_and_entity_checked():
    items = client.get("/api/renewals?district_lgd=643").json()["items"]
    for it in items[:8]:
        rec = client.post(f"/api/renewals/{it['certificate']['cert_no']}/prefill").json()
        n = rec["nudge"]
        assert n["generator"] == "template" and n["channel"] == "whatsapp" and n["status"] == "preview"
        assert n["checker"]["passed"] is True, n["checker"]
        hi = n["text"]["hi"]
        assert f"{it['days_left']} दिन में" in hi and "समाप्त होगा" in hi and "पिछले वर्ष का अभिलेख पहले से भरा है" in hi
        assert "केंद्र" in hi and "पुष्टि करें" in hi and it["certificate"]["cert_no"] in hi
        assert it["certificate"]["holder_name"]["hi"] in hi
    # the checker catches an invented entity in the renewal message
    c = renewal.find(items[0]["certificate"]["cert_no"])
    bad = dict(renewal.nudge(c, items[0]["days_left"])["text"])
    bad["hi"] = bad["hi"].replace("समाप्त होगा", "समाप्त होगा, शुल्क ₹500 जमा करें")
    res = check_entities(bad, [renewal.public(c)], vocab_pattern="renewal_nudge.*.j2")
    assert res["passed"] is False and "500" in res["unsupported_entities"]


def test_existing_message_vocab_unchanged():
    from messages import template_vocab
    assert "नवीनीकरण" not in template_vocab()          # renewal wording does not widen the decision-message checker
    assert "नवीनीकरण" in template_vocab("renewal_nudge.*.j2")


# ------------------------------------------------------------------ agent trace
def test_trace_present_and_honest_on_hero():
    an = client.get(f"/api/applications/{enc(HERO)}").json()["analysis"]
    tr = an["trace"]
    assert [s["code"] for s in tr] == ["read", "search", "match", "rules", "draft", "officer"]
    assert [s["step"] for s in tr] == [1, 2, 3, 4, 5, 6]
    for s in tr:
        assert s["status"] in ("ok", "attention", "waiting") and s["title"]["hi"] and s["title"]["en"]
        assert s["ms"] is None or s["ms"] >= 0
    assert tr[-1]["status"] == "waiting" and tr[-1]["ms"] is None           # the agent never decides
    assert "448703" in tr[1]["detail"]["en"] and tr[1]["count"] >= 1
    assert "98%" in tr[2]["title"]["en"] and tr[2]["status"] == "attention"  # found, awaiting the officer's C
    assert tr[3]["passed"] == tr[3]["total"] and tr[3]["total"] >= 5
    assert "approval order" in tr[4]["title"]["en"]
    # after "same family", the match step no longer waits
    client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": "CG/KDG/SDO/2019/004512"})
    an2 = client.get(f"/api/applications/{enc(HERO)}").json()["analysis"]
    assert an2["trace"][2]["status"] == "ok" and an2["lane"] == "records_complete"


def test_trace_no_record_neutral_and_attention_case():
    pooja = client.get(f"/api/applications/{enc('SS/2026/KDG/08835')}").json()["analysis"]["trace"]
    assert pooja[2]["status"] == "ok" and "neutral" in pooja[2]["detail"]["en"]
    kiran = client.get(f"/api/applications/{enc('SS/2026/KDG/08841')}").json()["analysis"]["trace"]
    assert kiran[3]["status"] == "attention" and kiran[4]["title"]["en"].endswith("reference note")


def test_trace_is_additive_engine_unchanged():
    import api
    e = api.STATE.entry(HERO)
    marks = {}
    assert engine.analyse(e, {}, None) == engine.analyse(e, {}, None, timings=marks)
    assert {"t0", "read", "search", "match", "rules", "draft"} <= set(marks)
    assert "trace" not in engine.analyse(e, {}, None)
