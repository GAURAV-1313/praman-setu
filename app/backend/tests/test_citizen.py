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
