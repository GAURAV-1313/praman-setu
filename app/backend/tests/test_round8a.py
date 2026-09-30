"""Round 8a: family knowledge graph + integrity signals, and human-in-the-loop recalibration (SYNTHETIC)."""
import json
import random
from urllib.parse import quote

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api import app
import graph
import learning

client = TestClient(app)
HERO = "SS/2026/KDG/08812"
HERO_CERT = "CG/KDG/SDO/2019/004512"


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def fam(app_id):
    r = client.get(f"/api/graph/family/{quote(app_id, safe='')}")
    assert r.status_code == 200
    return r.json()


# ------------------------------------------------------------------ graph
def test_family_graph_hero_three_generations_and_record_used():
    g = fam(HERO)
    rels = {n.get("rel") for n in g["nodes"]}
    assert {"applicant", "father", "grandfather"} <= rels
    assert {n["gen"] for n in g["nodes"] if n["kind"] in ("person", "applicant")} == {1, 2, 3}
    cert = next(n for n in g["nodes"] if n["id"] == f"c:{HERO_CERT}")
    assert cert["use"] == "candidate" and g["records_used"] == [] and HERO_CERT in g["records_found"]
    # the father holds the certificate; the model's link runs from the applicant to it
    father = next(n for n in g["nodes"] if n.get("rel") == "father")
    assert any(e["kind"] == "holds" and e["source"] == father["id"] and e["target"] == cert["id"] for e in g["edges"])
    assert any(e["kind"] == "match" and e["target"] == cert["id"] and e["probability"] >= 0.95 for e in g["edges"])
    assert g["signals"] == []
    # after the officer confirms, the graph shows it as the record relied on
    client.post(f"/api/applications/{quote(HERO, safe='')}/confirm-relationship", json={"cert_no": HERO_CERT})
    g = fam(HERO)
    assert g["records_used"] == [HERO_CERT]
    assert next(n for n in g["nodes"] if n["id"] == f"c:{HERO_CERT}")["use"] == "relied"
    # opening the graph is a records access: audited
    assert any(a["action"] == "family_graph_viewed" and HERO_CERT in a["records_accessed"] for a in client.get("/api/audit").json())


@pytest.mark.parametrize("app_id,code", [("SS/2026/KDG/08841", "category_conflict"),
                                         ("SS/2026/KDG/08856", "cancelled_relative"),
                                         ("SS/2026/KDG/08863", "tehsildar_permanent")])
def test_family_signals(app_id, code):
    g = fam(app_id)
    assert code in {s["code"] for s in g["signals"]}
    s = next(s for s in g["signals"] if s["code"] == code)
    ids = {n["id"] for n in g["nodes"]}
    assert s["node_ids"] and set(s["node_ids"]) <= ids


def test_graph_wording_is_neutral_and_uses_categories_only():
    blob = json.dumps([fam(a) for a in ("SS/2026/KDG/08841", HERO, "SS/2026/KDG/08925")] + [client.get("/api/graph/integrity").json()],
                      ensure_ascii=False).lower()
    for word in ("fraud", "fake", "धोखा", "फर्जी", "gond", "गोंड", "muria", "मुरिया", "halba", "caste_name"):
        assert word not in blob, word


def test_integrity_signals_statewide():
    r = client.get("/api/graph/integrity").json()
    assert r["synthetic"] is True
    codes = [s["code"] for s in r["signals"]]
    assert codes == ["category_conflict", "cancelled_relative", "duplicate_identity", "tehsildar_permanent"]
    by = {s["code"]: s for s in r["signals"]}
    assert all(s["count"] > 0 and s["examples"] for s in r["signals"])
    # the detector finds every planted anomaly (a test of the detector, reported as such)
    assert r["overlay"]["found"] == r["overlay"]["planted"]
    assert r["overlay"]["planted"]["category_conflict"] == graph.PLANT_CATEGORY_FAMILIES
    # the live pending claim (08841: claims ST, brother's certificate OBC) shows up as an example
    assert any(e.get("app_id") == "SS/2026/KDG/08841" for e in by["category_conflict"]["examples"])
    # every Tehsildar-issued permanent caste certificate (incl. planted re-issues) is counted
    n = sum(1 for c in graph.overlay()["certs"] if c["service"] in graph.CASTE_SERVICES and c["cert_type"] == "permanent"
            and c["authority_role"] == "Tehsildar")
    assert by["tehsildar_permanent"]["count"] == n
    assert r["districts"] and all(d["total"] == sum(d[k] for k in codes) for d in r["districts"])


def test_overlay_never_touches_live_archive_or_demo_families():
    live = graph.engine.archive()
    assert not any("_planted" in c for c in live)
    ov = graph.overlay()
    pop = graph.population()
    for c in ov["certs"]:
        if "_planted" in c:
            assert pop[c["_person_id"]]["split"] != "demo"


def test_detect_small_family():
    # father + two children; one child's certificate in a different category -> category_conflict
    certs = [c for c in graph.engine.archive() if c["_person_id"] in (17554, 17556)]
    assert certs, "demo family 9004 (Kiran Dhruw) has the brother's certificate"
    hits = graph.detect(certs, claims=[{"pid": 17557, "father_pid": 17554, "category": "ST", "app_id": "X"}], only_claims=True)
    assert len(hits["category_conflict"]) == 1 and hits["category_conflict"][0]["categories"] == ["OBC", "ST"]


# ------------------------------------------------------------------ learning
def test_learning_status_labels_are_simulated_and_from_the_pool():
    s = client.get("/api/learning/status").json()
    assert s["labels"]["simulated"] == learning.N_SIMULATED and s["labels"]["real"] == 0
    assert s["live"] is False and s["calibration"] is None
    u = learning.universe()
    sim = learning.simulated_labels()
    assert all(u["by_id"][lb["pair_id"]]["part"] == "pool" for lb in sim)   # never the held-out slice
    wrong = sum(lb["officer_error"] for lb in sim)
    assert 1 <= wrong <= 25                                               # ~3% simulated officer error
    assert len(s["uncertain"]) == 5 and len({p["pair_id"] for p in s["uncertain"]}) == 5
    assert all(0.6 <= p["raw_probability"] for p in s["uncertain"])


def test_recalibrate_reports_before_after_on_held_out():
    s = client.post("/api/learning/recalibrate", json={}).json()
    cal = s["calibration"]
    assert cal["n_simulated"] == learning.N_SIMULATED and cal["n_real"] == 0
    for k in ("before", ):
        assert 0 < cal[k]["precision"] <= 1 and 0 < cal[k]["recall"] <= 1
    after = cal["models"]["calibration"]["after"]
    assert 0 < after["precision"] <= 1 and 0 < after["recall"] <= 1
    assert cal["before"]["positives"] == after["positives"] == learning.universe()["positives"]["eval"]
    # the model is over-confident in its 'exact' band before; calibration brings the shown % down
    assert cal["before"]["mean_claimed"] > after["mean_claimed"]
    assert any(a["action"] == "model_recalibrated" for a in client.get("/api/audit").json())


def test_officer_labels_count_but_decisions_never_do():
    enc = quote(HERO, safe="")
    pair = client.get("/api/learning/status").json()["uncertain"][0]["pair_id"]
    r = client.post("/api/learning/label", json={"pair_id": pair, "decision": "not"}).json()
    assert r["status"]["labels"]["by_source"]["officer_active"] == 1
    assert pair not in {p["pair_id"] for p in r["status"]["uncertain"]}
    client.post(f"/api/applications/{enc}/confirm-relationship", json={"cert_no": HERO_CERT})
    s = client.get("/api/learning/status").json()
    assert s["labels"]["by_source"]["officer_case"] == 1 and s["labels"]["real"] == 2
    # an approve / send-back / refer decision adds no label
    b = client.get(f"/api/applications/{quote('SS/2026/KDG/08841', safe='')}").json()
    client.post(f"/api/applications/{quote('SS/2026/KDG/08841', safe='')}/decision",
                json={"action": "refer", "officer_name": "SDO", "order_text": b["analysis"]["refer_drafts"][b["analysis"]["refer_to"]]})
    assert client.get("/api/learning/status").json()["labels"]["real"] == 2
    assert client.post("/api/learning/label", json={"pair_id": "nope", "decision": "same"}).status_code == 404
    client.post("/api/reset")
    s = client.get("/api/learning/status").json()
    assert s["labels"]["real"] == 0 and s["calibration"] is None


def test_recalibration_is_not_applied_to_live_matching():
    enc = quote(HERO, safe="")
    before = client.get(f"/api/applications/{enc}").json()["analysis"]
    client.post("/api/learning/recalibrate", json={})
    after = client.get(f"/api/applications/{enc}").json()["analysis"]
    assert [m["match_probability"] for m in before["lineage_matches"]] == [m["match_probability"] for m in after["lineage_matches"]]
    assert before["lane"] == after["lane"]


def test_logistic_fit_recovers_a_known_calibration():
    rng = random.Random(1)
    rows = []
    for _ in range(4000):
        s = rng.uniform(-4, 8)
        z = -0.5 + 0.4 * s * learning.LN2
        rows.append((s, [0.0] * 4, int(rng.random() < 1 / (1 + np.exp(-z)))))
    learning.RIDGE["calibration"], old = 0.0, learning.RIDGE["calibration"]
    try:
        th = learning.fit("calibration", rows, prior=0.0)
    finally:
        learning.RIDGE["calibration"] = old
    assert abs(th[0] + 0.5) < 0.15 and abs(th[1] - 0.4) < 0.05
