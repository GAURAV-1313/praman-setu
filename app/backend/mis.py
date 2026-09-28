"""REAL Sewa Setu public MIS (fetched 27-09-2026) -> /api/mis/summary and /api/geo/districts."""
from __future__ import annotations

import csv
import json
from functools import lru_cache

import geo

SERVICE_KEYS = {
    "SC/ST caste certificate": ("caste_scst", "अनुसूचित जाति / जनजाति प्रमाण पत्र"),
    "OBC caste certificate": ("caste_obc", "अन्य पिछड़ा वर्ग प्रमाण पत्र"),
    "Camp - SC/ST certificate": ("camp_caste_scst", None),
    "Camp - OBC certificate": ("camp_caste_obc", None),
    "Income certificate": ("income", None),
    "Domicile (Mool Niwasi) certificate": ("domicile", None),
}
CASTE_KEYS = {"caste_scst", "caste_obc", "camp_caste_scst", "camp_caste_obc"}


def _slug(s: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in s.lower()).strip("_")[:40]


@lru_cache(maxsize=1)
def summary() -> dict:
    rows = list(csv.DictReader(open(geo.DATA / "sewasetu_mis_service_2026-09-27.csv", encoding="utf-8")))
    num = lambda r, k: int(float(r[k] or 0))
    all_total = sum(num(r, "total") for r in rows)
    all_rej = sum(num(r, "rejected") for r in rows)
    services = []
    for i, r in enumerate(rows):
        total, rej = num(r, "total"), num(r, "rejected")
        decided = num(r, "approved") + rej
        key, hi = SERVICE_KEYS.get(r["service_en"], (None, None))
        services.append({
            "key": key or (_slug(r["service_en"]) if r["service_en"] else f"svc_{i:03d}"),
            "label": {"en": r["service_en"] or r["service_hi"], "hi": hi or r["service_hi"]},
            "department": {"en": "", "hi": r["department_hi"]},
            "total": total, "approved": num(r, "approved"), "rejected": rej, "pending": num(r, "pending"),
            "rejection_pct_decided": round(100 * rej / decided, 2) if decided else 0.0,
            "share_of_volume": round(100 * total / all_total, 2),
            "share_of_rejections": round(100 * rej / all_rej, 2) if all_rej else 0.0,
            "is_caste": key in CASTE_KEYS,
        })
    services.sort(key=lambda s: -s["total"])
    caste = [s for s in services if s["is_caste"]]

    drows = list(csv.DictReader(open(geo.DATA / "sewasetu_mis_district_2026-09-27.csv", encoding="utf-8")))
    by_name = {d["name_en"]: d for d in geo.districts().values()}
    districts = []
    for r in drows:
        d = by_name[r["district"]]
        total, rej = int(r["total"]), int(r["rejected"])
        districts.append({
            "lgd": d["lgd"], "name": {"en": d["name_en"], "hi": d["name_hi"]}, "division": d["division"],
            "total": total, "approved": int(r["approved"]), "rejected": rej, "pending": int(r["pending"]),
            "pending_beyond": int(r["pending_beyond"]), "rejection_pct": round(100 * rej / total, 2),
        })
    sla = json.load(open(geo.DATA / "sewasetu_api_getSLACompilanceRateResolvedWithinDueDate_2026-09-27.json"))
    sla_rate = sla["last30DaysOfSubmission"][0]["slaComplianceRate"]
    totals = {
        "applications": sum(d["total"] for d in districts),
        "approved": sum(d["approved"] for d in districts),
        "rejected": sum(d["rejected"] for d in districts),
        "pending": sum(d["pending"] for d in districts),
        "pending_beyond_sla": sum(d["pending_beyond"] for d in districts),
        "on_time_pct": round(sla_rate, 1),
    }
    return {
        "source": {"en": "Sewa Setu public MIS dashboard (sewasetu.cgstate.gov.in), district-wise and service-wise status",
                   "hi": "सेवा सेतु सार्वजनिक एमआईएस डैशबोर्ड (sewasetu.cgstate.gov.in), जिलेवार एवं सेवावार स्थिति"},
        "fetched": "2026-09-27",
        "period": {"from": None, "to": "2026-09-27",
                   "label": {"en": "Cumulative since the portal went live, as published on 27-09-2026",
                             "hi": "पोर्टल आरंभ से संचयी, 27-09-2026 को प्रकाशित"}},
        "totals": totals,
        "on_time_note": {"en": "On-time % = SLA compliance of applications resolved in the last 30 days (MIS API).",
                         "hi": "समय पर % = पिछले 30 दिनों में निराकृत आवेदनों का एसएलए अनुपालन (एमआईएस एपीआई)।"},
        "caste_combined": {
            "total": sum(s["total"] for s in caste), "rejected": sum(s["rejected"] for s in caste),
            "share_of_volume": round(sum(s["share_of_volume"] for s in caste), 1),
            "share_of_rejections": round(sum(s["share_of_rejections"] for s in caste), 1),
        },
        "services": services,
        "districts": districts,
    }


@lru_cache(maxsize=1)
def districts_geojson() -> dict:
    return json.load(open(geo.GEO / "cg_districts_lgd.geojson", encoding="utf-8"))
