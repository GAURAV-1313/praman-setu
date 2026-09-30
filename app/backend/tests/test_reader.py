"""Round 8c: Praman Reader archive lookup (GET /api/archive/certificate/{cert_no})."""
from urllib.parse import quote

from fastapi.testclient import TestClient

from api import app
from reader_api import normalise_cert_no

client = TestClient(app)
HERO_CERT = "CG/KDG/SDO/2019/004512"


def test_normalise_ocr_confusions():
    assert normalise_cert_no("C6/KDG/SD0/2019/004512") == HERO_CERT
    assert normalise_cert_no(" cg / kdg / sdo / 2019 / 4512 ") == HERO_CERT
    assert normalise_cert_no("SS/2026/KDG/08812") is None
    assert normalise_cert_no("") is None


def test_lookup_hero_certificate_and_audit():
    client.post("/api/reset")
    for path in (HERO_CERT, quote(HERO_CERT, safe=""), "C6/KDG/SD0/2019/004512"):
        r = client.get(f"/api/archive/certificate/{path}?app_id=SS/2026/KDG/08812")
        assert r.status_code == 200, r.text
        b = r.json()
        assert b["cert_no"] == HERO_CERT
        c = b["certificate"]
        assert c["holder_name"]["hi"] == "रामलाल मरकाम" and c["village"]["en"] == "Bayanar"
        assert c["category"] == "ST" and c["issue_date"] == "2019-03-14"
        assert not any(k.startswith("_") for k in c)  # no internal fields
        assert b["qr_payload"] == ("SEWASETU-CG|CERT=CG/KDG/SDO/2019/004512|HOLDER=Ram Lal Markaam"
                                   "|ISSUED=2019-03-14|CAT=ST")
    log = client.get(f"/api/audit?q={quote(HERO_CERT, safe='')}").json()
    hits = [e for e in log if e["action"] == "archive_certificate_lookup"]
    assert len(hits) == 3 and hits[0]["records_accessed"] == [HERO_CERT] and hits[0]["app_id"] == "SS/2026/KDG/08812"


def test_lookup_missing_is_neutral_and_bad_number_422():
    r = client.get("/api/archive/certificate/CG/KDG/SDO/2019/999999")
    assert r.status_code == 404
    d = r.json()["detail"]
    assert "not a ground for rejection" in d["en"] and "अस्वीकृति का आधार नहीं" in d["hi"]
    assert client.get("/api/archive/certificate/hello").status_code == 422


def test_fingerprint_flags_same_paper_on_another_file_only():
    client.post("/api/reset")
    a = client.post("/api/reader/fingerprint", json={"app_id": "SS/2026/KDG/08812", "phash": "f0f0f0f0f0f0f0f0", "kind": "affidavit"}).json()
    assert a["same_paper_elsewhere"] == []
    # same file again: not a duplicate of itself
    assert client.post("/api/reader/fingerprint", json={"app_id": "SS/2026/KDG/08812", "phash": "f0f0f0f0f0f0f0f1"}).json()["same_paper_elsewhere"] == []
    # a rescan (1 bit off) on another file is reported; an unrelated paper is not
    b = client.post("/api/reader/fingerprint", json={"app_id": "SS/2026/KDG/08835", "phash": "f0f0f0f0f0f0f0f8"}).json()
    assert [(x["app_id"], x["distance_bits"]) for x in b["same_paper_elsewhere"]][:1] == [("SS/2026/KDG/08812", 1)]
    assert client.post("/api/reader/fingerprint", json={"app_id": "SS/2026/KDG/08841", "phash": "0123456789abcdef"}).json()["same_paper_elsewhere"] == []
    assert client.post("/api/reader/fingerprint", json={"app_id": "X/1", "phash": "zz"}).status_code == 422
    client.post("/api/reset")  # a demo reset forgets fingerprints
    assert client.post("/api/reader/fingerprint", json={"app_id": "SS/2026/KDG/08835", "phash": "f0f0f0f0f0f0f0f0"}).json()["same_paper_elsewhere"] == []
