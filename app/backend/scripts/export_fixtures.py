"""Dump real API responses as JSON fixtures so the frontend runs fully offline.

Writes to app/frontend/src/mock/fixtures/:
  cases.json               {app_id: {application, analysis}} for every queue application
  confirm_overrides.json   {app_id: Analysis after confirm-relationship} where confirming changes the case
  queue_sdo.json, queue_tehsildar.json, mis_summary.json, geo_districts.json, pilot_stats.json,
  eval.json, audit.json ([]), villages.json, health.json, precheck_examples.json

Uses the FastAPI app in-process (same code path as the HTTP server), on a throwaway state dir.
Run:  uv run python scripts/export_fixtures.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
os.environ["PRAMAN_STATE_DIR"] = tempfile.mkdtemp(prefix="praman-export-")

from fastapi.testclient import TestClient  # noqa: E402

import geo  # noqa: E402
import seed_round7  # noqa: E402
import renewal  # noqa: E402
from api import app  # noqa: E402

OUT = HERE.parent / "frontend" / "src" / "mock" / "fixtures"
FOCUS_DISTRICTS = [643, 374, 387, 734, 650]  # Kondagaon, Bastar, Raipur, GPM, Bemetara

PRECHECK_EXAMPLES = {
    "hero_exact": {"service": "caste_st", "applicant_name": "Sunita Markam", "father_name": "Ramlal Markam",
                   "village_lgd": 448703, "district_lgd": 643},
    "hero_devanagari_by_name": {"service": "caste_st", "applicant_name": "सुनीता मरकाम", "father_name": "रामलाल मरकाम",
                                "village_name": "Bayanar", "district_lgd": 643},
    "no_match": {"service": "caste_obc", "applicant_name": "Ramesh Yadav", "father_name": "Dukalu Yadav",
                 "village_lgd": 448665, "district_lgd": 643},
    "no_match_frontend_prefill": {"service": "caste_obc", "applicant_name": "Ramesh Yadav", "father_name": "Bhagwati Yadav",
                                  "village_lgd": 448804, "district_lgd": 643},
    # Round 7: married woman — nothing in her husband's village; her father's certificate in her maiden village
    "native_normal": {"service": "caste_st", "applicant_name": "Rajni Korram", "father_name": "Jaglu Usendi",
                      "village_lgd": 448686, "district_lgd": 643},
    "native_found": {"service": "caste_st", "applicant_name": "Rajni Korram", "father_name": "Jaglu Usendi",
                     "village_lgd": 448686, "district_lgd": 643, "native_village_lgd": 449687},
}


# Offline fallback depth: every case gets its GET bundle; the simulated acts (not-this-family, show-cause replies)
# are exported for the demo files only, to keep the bundle small.
FOCUS_CASES = {f"SS/2026/KDG/{n}" for n in ("08812", "08790", "08835", "08841", "08856", "08863", "08870", "08902",
                                            "08857", "08845", "08749", "08721", "08766", "08772", "08710", "08915", "08778", "08758",
                                            "08925")}
BIG = ("villages", "geo_districts", "cases", "confirm_overrides", "reject_match_overrides", "show_cause_overrides",
       "policy_verify_cases", "forward_overrides", "native_village_overrides", "renewal_prefill")


def dump(name: str, obj) -> None:
    p = OUT / f"{name}.json"
    compact = name in BIG
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=None if compact else 1), encoding="utf-8")
    print(f"  {p.name:28} {p.stat().st_size / 1024:8.1f} KB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    c = TestClient(app)
    assert c.post("/api/reset").json()["ok"]

    def get(path):
        r = c.get(path)
        r.raise_for_status()
        return r.json()

    print(f"writing fixtures to {OUT}")
    dump("health", get("/api/health"))
    # Round 6: every sub-division (the offline mock filters by desk itself)
    queues = {role: get(f"/api/queue?role={role}&desk=all") for role in ("sdo", "tehsildar")}
    for role, q in queues.items():
        dump(f"queue_{role}", q)
    cases, overrides, rejects, show_causes = {}, {}, {}, {}
    enc = lambda a: quote(a, safe="")
    for q in queues["sdo"] + queues["tehsildar"]:
        app_id = q["application"]["app_id"]
        cases[app_id] = get(f"/api/applications/{enc(app_id)}")
        an = cases[app_id]["analysis"]
        # "same family" on the found usable match (or the first record that needs a disposition), default grounds
        target = next((lm for lm in an["lineage_matches"] if lm["usable_as_evidence"] and lm["certificate"]["cert_no"] not in an["accepted_cert_nos"]), None) \
            or next((lm for lm in an["lineage_matches"] if lm["certificate"]["cert_no"] in an["disposition_required"]), None)
        if target is not None:
            no = target["certificate"]["cert_no"]
            r = c.post(f"/api/applications/{enc(app_id)}/confirm-relationship", json={"cert_no": no})
            r.raise_for_status()
            overrides[app_id] = r.json()["analysis"]
            c.post(f"/api/applications/{enc(app_id)}/clear-match", json={"cert_no": no}).raise_for_status()
        # "not this family" on each record shown (demo grounds)
        for lm in (an["lineage_matches"] if app_id in FOCUS_CASES else []):
            no = lm["certificate"]["cert_no"]
            r = c.post(f"/api/applications/{enc(app_id)}/reject-match", json={"cert_no": no, "grounds": ["different_village"]})
            r.raise_for_status()
            rejects.setdefault(app_id, {})[no] = r.json()["analysis"]
            c.post(f"/api/applications/{enc(app_id)}/clear-match", json={"cert_no": no}).raise_for_status()
        # show-cause -> reply / no reply, for files with an adverse record
        if an["adverse_cert_nos"] and app_id in FOCUS_CASES:
            for outcome in ("reply_received", "no_reply"):
                d = an["drafts"]["show_cause"]
                g = "Demo grounds for the proposed rejection (offline export)."
                text = {k: v.replace("[Officer: write your finding in the box above]", g).replace("[अधिकारी: ऊपर के बॉक्स में अपना निष्कर्ष लिखें]", g) for k, v in d.items()}
                c.post(f"/api/applications/{enc(app_id)}/decision",
                       json={"action": "show_cause", "officer_name": "export", "order_text": text, "findings": g}).raise_for_status()
                r = c.post(f"/api/applications/{enc(app_id)}/show-cause-reply",
                           json={"outcome": outcome, "summary": "REPLY-SUMMARY" if outcome == "reply_received" else None})
                r.raise_for_status()
                show_causes.setdefault(app_id, {})[outcome] = r.json()["analysis"]
                c.post("/api/reset").raise_for_status()
    # Round 4: analyses under the stricter policy setting (only the files that change), and after forwarding a
    # wrong-authority file to the SDO
    c.post("/api/reset").raise_for_status()
    c.post("/api/policy", json={"tehsildar_issued_permanent": "verify"}).raise_for_status()
    policy_verify = {}
    for app_id, b in cases.items():
        an2 = get(f"/api/applications/{enc(app_id)}")["analysis"]
        if an2["lane"] != b["analysis"]["lane"] or an2["flags"] != b["analysis"]["flags"]:
            policy_verify[app_id] = an2
    c.post("/api/reset").raise_for_status()
    forward = {}
    for app_id, b in cases.items():
        if not (b["analysis"].get("competence") or {}).get("ok", True):
            r = c.post(f"/api/applications/{enc(app_id)}/forward", json={})
            r.raise_for_status()
            forward[app_id] = r.json()["analysis"]
    c.post("/api/reset").raise_for_status()
    # Round 7: native-village search on the demo file -> analysis after the search, and after "same family" on the record
    native = {}
    nid, nlgd = seed_round7.NATIVE_DEMO_ID, seed_round7.MAIDEN_VILLAGE
    r = c.post(f"/api/applications/{enc(nid)}/search-native-village", json={"village_lgd": nlgd})
    r.raise_for_status()
    searched = r.json()["analysis"]
    r = c.post(f"/api/applications/{enc(nid)}/confirm-relationship", json={"cert_no": seed_round7.NATIVE_DEMO_CERT_NO})
    r.raise_for_status()
    native[nid] = {"village_lgd": nlgd, "analysis": searched, "confirmed": r.json()["analysis"]}
    c.post("/api/reset").raise_for_status()
    dump("native_village_overrides", native)
    dump("policy_verify_cases", policy_verify)
    dump("forward_overrides", forward)
    dump("cases", cases)
    dump("confirm_overrides", overrides)
    dump("reject_match_overrides", rejects)
    dump("show_cause_overrides", show_causes)
    dump("mis_summary", get("/api/mis/summary"))
    dump("geo_districts", get("/api/geo/districts"))
    dump("pilot_stats", get("/api/pilot/stats"))
    dump("eval", get("/api/eval"))
    dist = geo.districts()
    villages = [{"village_lgd": v["lgd"], "name": {"en": v["name_en"], "hi": v["name_hi"]},
                 "tehsil": {"en": v["tehsil_en"], "hi": v["tehsil_hi"]}, "district_lgd": v["district_lgd"],
                 "district": {"en": dist[v["district_lgd"]]["name_en"], "hi": dist[v["district_lgd"]]["name_hi"]}}
                for v in sorted(geo.villages().values(), key=lambda v: (v["district_lgd"], v["name_en"]))
                if v["district_lgd"] in FOCUS_DISTRICTS or v["lgd"] == seed_round7.MAIDEN_VILLAGE]
    dump("villages", villages)
    prechecks = {}
    for k, body in PRECHECK_EXAMPLES.items():
        r = c.post("/api/precheck", json=body)
        r.raise_for_status()
        prechecks[k] = {"request": body, "response": r.json()}
    dump("precheck_examples", prechecks)
    # Round 8b: income-certificate renewal lists (demo districts) and the pre-filled renewal for every listed certificate
    c.post("/api/reset").raise_for_status()
    ren, pre = {}, {}
    for d in renewal.DEMO_DISTRICTS:
        ren[str(d)] = get(f"/api/renewals?district_lgd={d}&window=60")
        for it in ren[str(d)]["items"]:
            no = it["certificate"]["cert_no"]
            r = c.post(f"/api/renewals/{no}/prefill")
            r.raise_for_status()
            pre[no] = r.json()
    dump("renewals", ren)
    dump("renewal_prefill", pre)
    c.post("/api/reset")
    dump("audit", [])
    assert "SS/2026/KDG/08812" in overrides, "hero confirm override missing"
    print(f"cases={len(cases)} confirm_overrides={len(overrides)} reject_match={sum(len(v) for v in rejects.values())} "
          f"show_cause={sorted(show_causes)} policy_verify={sorted(policy_verify)} forward={sorted(forward)}")


if __name__ == "__main__":
    main()
