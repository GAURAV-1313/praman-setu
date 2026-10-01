"""Bug-pass regressions for the officer workflow (sign tray, desk routing, audit hygiene)."""
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import app

client = TestClient(app)
HERO = "SS/2026/KDG/08812"
HERO_CERT = "CG/KDG/SDO/2019/004512"
RC1, RC2 = "SS/2026/KDG/08743", "SS/2026/KDG/08732"   # records-complete SDO Kondagaon files
KESKAL = "SS/2026/KDG/08758"


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def enc(a):
    return quote(a, safe="")


def get_an(a):
    return client.get(f"/api/applications/{enc(a)}").json()["analysis"]


def approve_body(an, read=True):
    return {"action": "approve", "officer_name": an["office"]["en"], "order_text": an["drafts"]["approve"],
            "system_text": an["drafts"]["approve"], "read_confirmed": read}


def tray_ids():
    return [t["app_id"] for t in client.get("/api/tray").json()["items"]]


def test_case_open_rejects_unknown_role_and_logs_nothing():
    n = len(client.get("/api/audit").json())
    assert client.get(f"/api/applications/{enc(HERO)}?role=bogus").status_code == 400
    assert len(client.get("/api/audit").json()) == n
    assert client.get(f"/api/applications/{enc(HERO)}?role=sdo").status_code == 200


def test_deciding_an_in_tray_file_individually_takes_it_out_of_the_tray():
    for a in (RC1, RC2):
        assert client.post("/api/tray/add", json={"app_id": a, "decision": approve_body(get_an(a))}).status_code == 200
    r = client.post(f"/api/applications/{enc(RC2)}/decision", json=approve_body(get_an(RC2)))
    assert r.status_code == 200, r.text
    assert "removed from the sign tray" in r.json()["audit"]["note"]
    assert tray_ids() == [RC1]
    q = {i["application"]["app_id"]: i for i in client.get("/api/queue?role=sdo").json()}
    assert q[RC2]["in_tray"] is False and q[RC1]["in_tray"] is True
    s = client.post("/api/tray/sign", json={"otp": "123456"}).json()
    assert [x["app_id"] for x in s["signed"]] == [RC1] and s["errors"] == []


def test_record_act_on_an_in_tray_file_takes_it_out_of_the_tray():
    assert client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT}).status_code == 200
    assert client.post("/api/tray/add", json={"app_id": HERO, "decision": approve_body(get_an(HERO))}).status_code == 200
    assert tray_ids() == [HERO]
    # undoing "same family" changes the evidence the read order relied on: the tray must not sign that text
    assert client.post(f"/api/applications/{enc(HERO)}/clear-match", json={"cert_no": HERO_CERT}).status_code == 200
    assert tray_ids() == []
    acts = [e["action"] for e in client.get(f"/api/audit?q={enc(HERO)}").json()]
    assert "tray_removed" in acts


def test_tray_remove_is_audited_only_when_something_was_removed():
    assert client.post("/api/tray/add", json={"app_id": RC1, "decision": approve_body(get_an(RC1))}).status_code == 200
    n = len(client.get("/api/audit").json())
    assert client.post("/api/tray/remove", json={"app_id": "nope"}).status_code == 200
    assert len(client.get("/api/audit").json()) == n
    assert client.post("/api/tray/remove", json={"app_id": RC1}).json()["items"] == []
    top = client.get("/api/audit").json()[0]
    assert top["action"] == "tray_removed" and top["app_id"] == RC1


def test_route_desk_refused_once_the_file_is_decided():
    an = get_an(KESKAL)
    assert client.post(f"/api/applications/{enc(KESKAL)}/confirm-relationship",
                       json={"cert_no": an["pending_cert_nos"][0]}).status_code == 200
    an = get_an(KESKAL)
    body = {**approve_body(an), "desk": "Keskal"}
    if an["finding_required"].get("approve"):
        body["findings"] = "Relationship confirmed from the brother's certificate on file."
    r = client.post(f"/api/applications/{enc(KESKAL)}/decision", json=body)
    assert r.status_code == 200, r.text
    r = client.post(f"/api/applications/{enc(KESKAL)}/route-desk", json={"desk": "Kondagaon"})
    assert r.status_code == 409


def test_tool_feedback_is_one_tap_per_decision():
    assert client.post(f"/api/applications/{enc(RC1)}/decision", json=approve_body(get_an(RC1))).status_code == 200
    assert client.post(f"/api/applications/{enc(RC1)}/tool-feedback", json={"useful": "yes"}).status_code == 200
    assert client.post(f"/api/applications/{enc(RC1)}/tool-feedback", json={"useful": "no"}).status_code == 409
    assert client.get("/api/collector/tiles").json()["tool_feedback"] == {"yes": 1, "no": 0, "wrong_family": 0}
    # a called-back and re-taken decision gets its own feedback
    assert client.post(f"/api/applications/{enc(RC1)}/callback", json={"reason": "signed the wrong file"}).status_code == 200
    assert client.post(f"/api/applications/{enc(RC1)}/decision", json=approve_body(get_an(RC1))).status_code == 200
    assert client.post(f"/api/applications/{enc(RC1)}/tool-feedback", json={"useful": "no"}).status_code == 200


def test_second_hearing_notice_keeps_the_first_on_file():
    import api as api_mod
    an = get_an(HERO)
    body = {"action": "show_cause", "officer_name": "SDO", "order_text": an["drafts"]["show_cause"],
            "findings": "Father's name differs and is unexplained in the records."}
    body["order_text"] = {k: v.replace("[", "(") for k, v in body["order_text"].items()}
    r = client.post(f"/api/applications/{enc(HERO)}/decision", json=body)
    assert r.status_code == 200, r.text
    first = r.json()["document_no"]
    assert client.post(f"/api/applications/{enc(HERO)}/show-cause-reply", json={"outcome": "reply_received"}).status_code == 200
    r = client.post(f"/api/applications/{enc(HERO)}/decision", json=body)
    assert r.status_code == 200, r.text
    assert any(h.get("no") == first and h.get("superseded_ts") for h in api_mod.STATE.history)


def test_native_approve_with_panel_visible_needs_reasons_after_undo():
    # the officer confirmed "same family" in the panel, then undid it: nothing on file is relied on any more
    assert client.post(f"/api/applications/{enc(HERO)}/confirm-relationship", json={"cert_no": HERO_CERT}).status_code == 200
    assert client.post(f"/api/applications/{enc(HERO)}/clear-match", json={"cert_no": HERO_CERT}).status_code == 200
    body = {"action": "approve", "officer_name": "SDO (Revenue), Kondagaon", "channel": "sewasetu_native",
            "tool_visible": True, "read_confirmed": True,
            "order_text": {"en": "Approved on the documents on file.", "hi": "संलग्न दस्तावेज़ों के आधार पर स्वीकृत।"}}
    r = client.post(f"/api/applications/{enc(HERO)}/decision", json=body)
    assert r.status_code == 422 and "written finding" in r.json()["detail"]
    r = client.post(f"/api/applications/{enc(HERO)}/decision",
                    json={**body, "findings": "Caste shown by the school record; father's certificate not relied on."})
    assert r.status_code == 200, r.text


def test_one_forward_routes_a_misrouted_permanent_file_to_the_competent_sdo_desk():
    mis = "SS/2026/KDG/08915"
    an = get_an(mis)
    assert an["competence"]["ok"] is False
    r = client.post(f"/api/applications/{enc(mis)}/forward", json={})
    assert r.status_code == 200
    target = r.json()["analysis"]["subdivision"]["en"]
    assert r.json()["application"]["routed_to"] == "sdo" and r.json()["analysis"]["competence"]["ok"]
    q = {i["application"]["app_id"]: i for i in client.get(f"/api/queue?role=sdo&desk={target}").json()}
    assert mis in q and q[mis]["competent"]
    # decidable on that desk at once: no second forward / route-desk step
    assert client.post(f"/api/applications/{enc(mis)}/route-desk", json={"desk": target}).status_code == 409
    assert mis not in {i["application"]["app_id"] for i in client.get("/api/queue?role=tehsildar").json()}


def test_application_only_read_is_not_a_records_access():
    n = len(client.get("/api/audit").json())
    r = client.get(f"/api/applications/{enc(HERO)}?fields=application").json()
    assert set(r) == {"application"} and r["application"]["app_id"] == HERO
    assert len(client.get("/api/audit").json()) == n
