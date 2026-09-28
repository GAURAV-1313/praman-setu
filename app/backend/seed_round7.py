"""Round 7 (28-09-2026): the "native / maiden village search" demo file. SYNTHETIC.

Like seed_round4 in api.py, this is applied at load / reset time; the synthetic generator's output files
(population.csv, certificate_archive.json, lineage_queries.csv, applications.json) are left untouched, so the
model evaluation and every existing demo file are unchanged. Fully deterministic (no randomness).

Story: Rajni Korram (F, born 1999, ST) married into Masora (Kondagaon tehsil) and applies there. Her father
Jaglu Usendi holds a permanent ST certificate issued in 2017 by the SDO (Revenue), Narayanpur, registered in her
maiden village Garhbengal (Narayanpur district). The normal search (her current village and district) cannot
surface it (different district: the place comparison is strongly negative). Searching her native village finds
it as an exact match, which the officer must still confirm (same family / not this family) as for any found record.
"""
from __future__ import annotations

import copy

import geo

NATIVE_DEMO_ID = "SS/2026/KDG/08925"
NATIVE_DEMO_CERT_NO = "CG/NRP/SDO/2017/003186"
HUSBAND_VILLAGE = 448686   # Masora, tehsil Kondagaon, district Kondagaon
MAIDEN_VILLAGE = 449687    # Garhbengal, tehsil Narayanpur, district Narayanpur

_DOCS = [
    {"code": "affidavit", "label": {"en": "Self-declaration affidavit (Form 2A)", "hi": "स्वघोषणा शपथ पत्र (फॉर्म 2A)"}, "uploaded": True},
    {"code": "identity_proof", "label": {"en": "Identity proof (Aadhaar / voter ID)", "hi": "पहचान प्रमाण (आधार / मतदाता पहचान पत्र)"}, "uploaded": True},
    {"code": "record_1950", "label": {"en": "Pre-1950 / pre-1984 record (revenue record, jamabandi)",
                                      "hi": "1950/1984 से पूर्व का अभिलेख (राजस्व अभिलेख, जमाबंदी)"}, "uploaded": False},
]
KHADYA = {"en": "Khadya ration roster (mock)", "hi": "खाद्य राशन सूची (नमूना)"}


def _place_fields(lgd: int) -> dict:
    pl = geo.place(lgd)
    return {"village": pl["village"], "village_lgd": pl["village_lgd"], "tehsil": pl["tehsil"],
            "district": pl["district"], "district_lgd": pl["district_lgd"]}


def demo_certificate() -> dict:
    """The father's archived certificate (same shape as gen_synthetic.make_cert, incl. the internal fields)."""
    pl = geo.place(MAIDEN_VILLAGE)
    return {
        "cert_no": NATIVE_DEMO_CERT_NO,
        "service": "caste_st", "cert_type": "permanent", "category": "ST",
        "caste_name": {"en": "Muria", "hi": "मुरिया"},
        "holder_name": {"en": "Jaglu Usendi", "hi": "जगलू उसेंडी"},
        "father_name": {"en": "Sukalu Usendi", "hi": "सुकालू उसेंडी"},
        "gender": "M", "birth_year": 1972,
        **_place_fields(MAIDEN_VILLAGE),
        "issue_date": "2017-06-12",
        "issuing_authority": {"en": f"SDO (Revenue), {pl['district']['en']}", "hi": f"अनुविभागीय अधिकारी (राजस्व), {pl['district']['hi']}"},
        "authority_role": "SDO", "status": "active", "qr_verified": True,
        # internal fields (not part of the Certificate contract type)
        "_person_id": -8925, "_holder_raw": "Jaglu Usendi", "_father_raw": "Sukalu Usendi", "_script": "latin",
        "_tehsil_lgd": pl["tehsil_lgd"],
    }


def demo_entry() -> dict:
    pl = geo.place(HUSBAND_VILLAGE)
    app = {
        "app_id": NATIVE_DEMO_ID, "service": "caste_st",
        "service_label": {"en": "Scheduled Tribe (ST) caste certificate — permanent", "hi": "अनुसूचित जनजाति प्रमाण पत्र — स्थायी"},
        "applicant_name": {"en": "Rajni Korram", "hi": "रजनी कोर्राम"},
        "father_name": {"en": "Jaglu Usendi", "hi": "जगलू उसेंडी"},
        "mother_name": {"en": "Budhni Usendi", "hi": "बुधनी उसेंडी"},
        "gender": "F", "birth_year": 1999,
        "claimed_category": "ST", "claimed_caste": {"en": "Muria", "hi": "मुरिया"},
        **_place_fields(HUSBAND_VILLAGE),
        "purpose": {"en": "Government job application", "hi": "शासकीय नौकरी हेतु आवेदन"},
        "submitted_at": "2026-09-25T10:41:00+05:30", "sla_due": "2026-10-25",
        "kendra": {"en": "Lok Seva Kendra, Kondagaon", "hi": "लोक सेवा केंद्र, कोंडागांव"},
        "routed_to": "sdo", "status": "pending", "documents": copy.deepcopy(_DOCS),
        "persona_note": {
            "en": "Married woman: applies from her husband's village (Masora). Her father's ST certificate is in her maiden village "
                  "Garhbengal (Narayanpur) — the normal search cannot see it; search the native village.",
            "hi": "विवाहित महिला: पति के गांव (मसोरा) से आवेदन। पिता का ST प्रमाण पत्र मायके के गांव गढ़बेंगाल (नारायणपुर) में है — "
                  "सामान्य खोज में नहीं दिखता; मायके के गांव में खोजें।"},
        "sendback_count": 0,
    }
    evidence = [
        {"source": KHADYA, "field": {"en": "Head of household", "hi": "परिवार मुखिया"},
         "value": {"en": "Dinesh Korram (ration card 2291448317)", "hi": "दिनेश कोर्राम (राशन कार्ड 2291448317)"}, "status": "ok"},
        {"source": KHADYA, "field": {"en": "Applicant listed as member", "hi": "आवेदक सदस्य के रूप में दर्ज"},
         "value": {"en": "Yes — wife of the head of household", "hi": "हाँ — परिवार मुखिया की पत्नी"}, "status": "ok",
         "note": {"en": "Listed in her husband's household; her parental family's records are in her maiden village.",
                  "hi": "पति के परिवार में दर्ज; पैतृक (मायके के) परिवार के अभिलेख मायके के गांव में हैं।"}},
    ]
    meta = {"person_id": -8926, "father_id": -8925, "father_raw": "जगलू उसेंडी", "applicant_raw": "रजनी कोर्राम",
            "tehsil_lgd": pl["tehsil_lgd"]}
    return {"application": app, "meta": meta, "evidence_rows": evidence}


def add_certificate(certs: list[dict]) -> None:
    if not any(c["cert_no"] == NATIVE_DEMO_CERT_NO for c in certs):
        certs.append(demo_certificate())


def seed(entries: dict, order: list) -> None:
    """Idempotent: adds the demo application (SDO Kondagaon desk) if absent."""
    if NATIVE_DEMO_ID not in entries:
        entries[NATIVE_DEMO_ID] = demo_entry()
        order.append(NATIVE_DEMO_ID)
