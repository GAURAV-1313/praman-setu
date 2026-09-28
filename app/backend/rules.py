"""Deterministic rules (the law): certificate validity, service checklists, lanes.

Rules are plain, versioned Python tables so an officer / CHiPS reviewer can read them.
Caste is only ever read from certificates and compared through a synonym table —
never inferred from a surname, never raw string equality.
"""
from __future__ import annotations

import re

from normalise import deva_to_latin, fold, is_devanagari

RULES_VERSION = "rules-2026-09-27-r4"

# ------------------------------------------------------------------ statute (exact title; re-checked 27-09-2026)
ACT_TITLE = {
    "en": "Chhattisgarh Scheduled Castes, Scheduled Tribes and Other Backward Classes (Regulation of Social Status Certification) Act, 2013 and Rules, 2013",
    "hi": "छत्तीसगढ़ अनुसूचित जाति, अनुसूचित जनजाति और अन्य पिछड़ा वर्ग (सामाजिक प्रास्थिति के प्रमाणीकरण का विनियमन) अधिनियम, 2013 एवं नियम, 2013",
}
# Notification cut-off dates for proof of the family's residence (Rule 3(3)).
CUTOFF = {"SC": "10-08-1950", "ST": "06-09-1950", "OBC": "26-12-1984"}
CATEGORY_NAME = {
    "ST": {"en": "Scheduled Tribe", "hi": "अनुसूचित जनजाति"},
    "SC": {"en": "Scheduled Caste", "hi": "अनुसूचित जाति"},
    "OBC": {"en": "Other Backward Class", "hi": "अन्य पिछड़ा वर्ग"},
}
ACT_BASIS = {"en": f"{ACT_TITLE['en']} (\"the Act\" / \"the Rules\").",
             "hi": f"{ACT_TITLE['hi']} (\"अधिनियम\" / \"नियम\")।"}
ACT_S4 = {"en": "Section 4 of the Act — the Competent Authority issues the certificate after inquiry, or rejects the application for reasons recorded in writing.",
          "hi": "अधिनियम की धारा 4 — सक्षम प्राधिकारी जांच के पश्चात प्रमाण पत्र जारी करते हैं, अथवा लिखित कारणों सहित आवेदन अस्वीकार करते हैं।"}
ACT_S5 = {"en": "Section 5 of the Act — an appeal lies to the Appellate Authority within 30 days of the order.",
          "hi": "अधिनियम की धारा 5 — आदेश के 30 दिन के भीतर अपीलीय अधिकारी के समक्ष अपील की जा सकती है।"}
ACT_S15 = {"en": "Section 15 of the Act — the burden of proving the social status claimed lies on the applicant.",
           "hi": "अधिनियम की धारा 15 — दावा की गई सामाजिक प्रास्थिति सिद्ध करने का भार आवेदक पर है।"}
RULE_3_3 = {
    "en": "Rule 3(3) of the Rules — a caste certificate issued earlier to the father, an ancestor or a relative is acceptable evidence of the claim.",
    "hi": "नियम 3(3) — पिता, पूर्वज या संबंधी को पूर्व में जारी जाति प्रमाण पत्र दावे का मान्य साक्ष्य है।",
}
RULE_3_3_DOCS = {
    "en": "Rule 3(3) of the Rules — affidavit in Form 2A, family tree of three generations by the Halka Patwari, and proof of the family's residence before the notification date.",
    "hi": "नियम 3(3) — फॉर्म 2A में शपथ पत्र, हल्का पटवारी द्वारा तीन पीढ़ी का वंशवृक्ष, तथा अधिसूचना तिथि से पूर्व परिवार के निवास का प्रमाण।",
}
RULE_3_3_OBC = {
    "en": "Rule 3(3) of the Rules (OBC) — the father's income certificate for the preceding year (creamy-layer exclusion).",
    "hi": "नियम 3(3) (अ.पि.व.) — पिता का पिछले वर्ष का आय प्रमाण पत्र (क्रीमी लेयर अपवर्जन)।",
}
RULE_7_8 = {
    "en": "Rules 7 and 8 of the Rules — the Competent Authority may direct a subordinate Revenue officer to inquire into residence, revenue records, property and the family's recorded caste.",
    "hi": "नियम 7 एवं 8 — सक्षम प्राधिकारी अधीनस्थ राजस्व अधिकारी को निवास, राजस्व अभिलेख, संपत्ति एवं परिवार की दर्ज जाति की जांच हेतु निर्देशित कर सकते हैं।",
}
HC_NOTE = {
    "en": "CG High Court, 22-07-2026 (Shailey Sonkar v. State of Chhattisgarh): permanent caste certificates are issued by the SDO (Revenue) or above; a Tehsildar is not the competent authority.",
    "hi": "छ.ग. उच्च न्यायालय, 22-07-2026 (शैली सोनकर विरुद्ध छत्तीसगढ़ राज्य): स्थायी जाति प्रमाण पत्र अनुविभागीय अधिकारी (राजस्व) या उससे वरिष्ठ अधिकारी जारी करते हैं; तहसीलदार सक्षम प्राधिकारी नहीं हैं।",
}
HC_BASIS = {
    "en": "CG High Court, Shailey Sonkar v. State of Chhattisgarh, decided 22-07-2026 — the competent authority for permanent caste certificates is the SDO (Revenue) or above.",
    "hi": "छ.ग. उच्च न्यायालय, शैली सोनकर विरुद्ध छत्तीसगढ़ राज्य, निर्णय दिनांक 22-07-2026 — स्थायी जाति प्रमाण पत्र हेतु सक्षम प्राधिकारी अनुविभागीय अधिकारी (राजस्व) या उससे वरिष्ठ।",
}
# Kept for backwards compatibility (Round 1 name); now the statute line.
RULES_2013 = ACT_BASIS
HC_RULING_DATE = "2026-07-22"
RULE_15_2 = {
    "en": "Rule 15(2): records-complete cases remain in the pool for the District Verification Committee's random post-issue sample.",
    "hi": "नियम 15(2): अभिलेख-पूर्ण प्रकरण जिला छानबीन समिति के यादृच्छिक सत्यापन नमूने में शामिल रहते हैं।",
}
DOMICILE_BASIS = {
    "en": "Domicile (Mool Niwasi) certificate — instructions of the State Government (Revenue / GAD); residence in Chhattisgarh as shown by the records on file.",
    "hi": "मूल निवास प्रमाण पत्र — राज्य शासन (राजस्व / सामान्य प्रशासन विभाग) के निर्देश; संलग्न अभिलेखों से छत्तीसगढ़ में निवास।",
}
APPELLATE = {"en": "the Appellate Authority", "hi": "अपीलीय अधिकारी"}
SHOW_CAUSE_DAYS = 15
CALLBACK_MINUTES = 10

# ------------------------------------------------------------------ Round 4: policy settings (Collector / CHiPS admin)
# How are PERMANENT caste certificates issued by a Tehsildar BEFORE the CG HC ruling (22-07-2026) treated as family
# evidence? The department has not yet notified its guidance. The tool follows this setting; it does not take its
# own legal position. Default: valid, with a note on screen and in the order, pending Revenue guidance.
POLICY_DEFAULTS = {"tehsildar_issued_permanent": "valid_with_note", "sla_pause": "running"}
POLICY_OPTIONS = {
    "tehsildar_issued_permanent": {
        "valid_with_note": {"en": "Valid as family evidence, with a note (pending Revenue Department guidance)",
                            "hi": "पारिवारिक साक्ष्य के रूप में मान्य, टिप्पणी सहित (राजस्व विभाग के निर्देश लंबित)"},
        "verify": {"en": "Confirmation required before relying on it",
                   "hi": "भरोसा करने से पहले पुष्टि आवश्यक"},
    },
    # Round 6: PROPOSED policy (needs a Revenue Department order) — pause the 22-day SLA clock while a hearing notice
    # (15 days) or a Patwari referral (7 days) is out. Display only: the tool never changes a due date by itself.
    "sla_pause": {
        "running": {"en": "SLA clock runs during hearing / Patwari referral (current rule)",
                    "hi": "सुनवाई / पटवारी संदर्भ के दौरान SLA घड़ी चालू (वर्तमान नियम)"},
        "paused_proposed": {"en": "PROPOSED: pause the SLA clock during hearing / Patwari referral (needs a Revenue Department order)",
                            "hi": "प्रस्तावित: सुनवाई / पटवारी संदर्भ के दौरान SLA घड़ी रोकें (राजस्व विभाग का आदेश आवश्यक)"},
    },
}
POLICY: dict[str, str] = dict(POLICY_DEFAULTS)
# Competent authority for each certificate kind (same table drives the wrong-authority routing guard).
PERMANENT_CASTE_AUTHORITY = {"en": "SDO (Revenue)", "hi": "अनुविभागीय अधिकारी (राजस्व)"}


def sla_pause_policy() -> str:
    return POLICY.get("sla_pause", POLICY_DEFAULTS["sla_pause"])


def tehsildar_policy() -> str:
    return POLICY.get("tehsildar_issued_permanent", POLICY_DEFAULTS["tehsildar_issued_permanent"])


COMPETENT = {
    "caste": {"SDO", "Collector", "Addl. Collector"},
    "domicile": {"Tehsildar", "SDO", "Collector", "Addl. Collector"},
}

# ------------------------------------------------------------------ caste synonym table
# Each group lists spellings (Latin/Devanagari) that denote the same caste/tribe entry,
# including recognised sub-groups (e.g. Muria, Madia/Maria under Gond in the ST list).
CASTE_GROUPS = {
    "gond": ["Gond", "Gound", "Gonda", "गोंड", "गोण्ड", "Muria", "Murea", "मुरिया", "Madia", "Maria", "Madiya",
             "माड़िया", "मारिया", "Abujhmaria", "अबूझमाड़िया", "Dhurwa", "धुरवा"],
    "kanwar": ["Kanwar", "Kanvar", "Kawar", "Kaur", "कंवर", "कँवर"],
    "halba": ["Halba", "Halbi", "हल्बा", "हलबा"],
    "bhatra": ["Bhatra", "भतरा"],
    "oraon": ["Oraon", "Uraon", "Kurukh", "उरांव", "उराँव"],
    "baiga": ["Baiga", "बैगा"],
    "kamar": ["Kamar", "कमार"],
    "korwa": ["Korwa", "कोरवा"],
    "pando": ["Pando", "पण्डो", "पंडो"],
    "bhunjia": ["Bhunjia", "भुंजिया"],
    "dhanwar": ["Dhanwar", "धनवार"],
    "nagesia": ["Nagesia", "नगेसिया"],
    "binjhwar": ["Binjhwar", "बिंझवार"],
    "sawar": ["Sawar", "Sawara", "सवरा"],
    "kherwar": ["Kherwar", "Kharwar", "खैरवार"],
    "satnami": ["Satnami", "सतनामी"],
    "ganda": ["Ganda", "गांडा"],
    "ghasia": ["Ghasia", "घसिया"],
    "mahar": ["Mahar", "Mehra", "Mahar/Mehra", "महार", "मेहरा", "महार/मेहरा"],
    "dewar": ["Dewar", "देवार"],
    "basor": ["Basor", "बसोड़"],
    "teli": ["Sahu", "Teli", "Sahu/Teli", "साहू", "तेली", "साहू/तेली"],
    "yadav": ["Yadav", "Raut", "Ahir", "Yadav/Raut", "यादव", "राउत", "यादव/राउत"],
    "kurmi": ["Kurmi", "कुर्मी"],
    "kalar": ["Kalar", "कलार"],
    "marar": ["Marar", "मरार"],
    "kewat": ["Kewat", "Nishad", "Kewat/Nishad", "केवट", "निषाद", "केवट/निषाद"],
    "lohar": ["Lohar", "लोहार"],
    "kumhar": ["Kumhar", "कुम्हार"],
    "nai": ["Nai", "Sen", "Nai/Sen", "नाई", "सेन", "नाई/सेन"],
    "koshta": ["Dewangan", "Koshta", "Dewangan/Koshta", "देवांगन", "कोष्टा", "देवांगन/कोष्टा"],
}


def _key(s: str) -> str:
    s = (s or "").strip()
    return fold(deva_to_latin(s) if is_devanagari(s) else s)


_CASTE_INDEX: dict[str, str] = {}
for _g, _names in CASTE_GROUPS.items():
    for _n in _names:
        _CASTE_INDEX[_key(_n)] = _g
        for part in re.split(r"[/,]", _n):
            _CASTE_INDEX.setdefault(_key(part), _g)


def caste_group(name: dict | str | None) -> str | None:
    if not name:
        return None
    vals = [name] if isinstance(name, str) else [name.get("en", ""), name.get("hi", "")]
    for v in vals:
        k = _key(v)
        if k in _CASTE_INDEX:
            return _CASTE_INDEX[k]
    return None


def _today_iso() -> str:
    from datetime import datetime, timedelta, timezone
    return datetime.now(timezone(timedelta(hours=5, minutes=30))).date().isoformat()


def service_kind(service: str) -> str:
    return "domicile" if service == "domicile" else "caste"


# ------------------------------------------------------------------ validity of a relative's certificate
def dmy(iso: str | None) -> str:
    """ISO date (or datetime) -> DD-MM-YYYY, the format used in every order."""
    if not iso:
        return ""
    d = iso[:10]
    return f"{d[8:10]}-{d[5:7]}-{d[0:4]}"


def validity(cert: dict, service: str, claimed_category: str | None, claimed_caste: dict | None,
             as_of: str | None = None, declared: bool = False) -> list[dict]:
    """as_of: the application's submission date (ISO).

    Round 6 (P1): a certificate dated after TODAY always fails (a future date is impossible). A certificate dated after
    the application fails only where that is logically impossible: the applicant (or the Kendra at intake) DECLARED it
    on the application, i.e. relied on a certificate that did not yet exist. A relative's normal LATER certificate
    (e.g. a brother certified a few weeks after this application was filed) is valid and is not flagged."""
    kind = service_kind(service)
    checks = []

    ok = cert["cert_type"] == "permanent"
    checks.append({"code": "permanent", "ok": ok,
                   "label": {"en": "Permanent certificate", "hi": "स्थायी प्रमाण पत्र"},
                   "detail": {"en": "Permanent certificate." if ok else "Temporary certificate — cannot be relied on as family evidence.",
                              "hi": "स्थायी प्रमाण पत्र।" if ok else "अस्थायी प्रमाण पत्र — पारिवारिक साक्ष्य के रूप में मान्य नहीं।"}})

    cert_kind = "domicile" if cert["service"] == "domicile" else "caste"
    role = cert["authority_role"]
    # Competence is tested only for PERMANENT caste certificates: a Tehsildar is competent for temporary ones.
    ok = role in COMPETENT[cert_kind] or cert["cert_type"] != "permanent"
    severity = None
    yr = cert["issue_date"][:4]
    if ok and cert["cert_type"] != "permanent" and role not in COMPETENT[cert_kind]:
        detail = {"en": f"Temporary certificate issued by {cert['issuing_authority']['en']} — competent for temporary certificates.",
                  "hi": f"{cert['issuing_authority']['hi']} द्वारा जारी अस्थायी प्रमाण पत्र — अस्थायी प्रमाण पत्र हेतु सक्षम।"}
    elif ok:
        detail = {"en": f"Issued by {cert['issuing_authority']['en']} — competent authority.",
                  "hi": f"{cert['issuing_authority']['hi']} द्वारा जारी — सक्षम प्राधिकारी।"}
    elif cert["issue_date"] < HC_RULING_DATE and tehsildar_policy() == "valid_with_note":
        # Round 4: policy setting "valid with a note" (default) — the certificate counts, the note travels with it.
        ok = True
        severity = "note"
        detail = {"en": f"Issuer: Tehsildar ({yr}) · valid per the current policy setting, pending Revenue Department guidance after CG HC Jul 2026.",
                  "hi": f"जारीकर्ता: तहसीलदार ({yr}) · वर्तमान नीति-सेटिंग अनुसार मान्य; छ.ग. उच्च न्यायालय (जुलाई 2026) के बाद राजस्व विभाग के निर्देश लंबित।"}
    elif cert["issue_date"] < HC_RULING_DATE:
        # Issued before the CG HC ruling, policy "confirmation required": the officer verifies before relying on it.
        severity = "review"
        detail = {"en": f"Issued by Tehsildar ({yr}) — competence under review after CG HC Jul 2026; department policy pending. Verify before relying on it.",
                  "hi": f"तहसीलदार द्वारा जारी ({yr}) — छ.ग. उच्च न्यायालय (जुलाई 2026) के बाद सक्षमता विचाराधीन; विभागीय नीति लंबित। भरोसा करने से पहले सत्यापन करें।"}
    else:
        severity = "fail"
        detail = {"en": f"Permanent caste certificate issued by a {role} ({yr}), after the ruling. " + HC_NOTE["en"],
                  "hi": f"स्थायी जाति प्रमाण पत्र तहसीलदार द्वारा ({yr}), निर्णय के बाद जारी। " + HC_NOTE["hi"]}
    chk = {"code": "competent_authority", "ok": ok,
           "label": {"en": "Competent issuing authority", "hi": "सक्षम जारीकर्ता प्राधिकारी"}, "detail": detail}
    if severity:
        chk["severity"] = severity
    checks.append(chk)

    # issue date: never in the future; after the application only where the applicant relied on it (declared)
    today = _today_iso()
    issued = cert["issue_date"][:10]
    applied = (as_of or "")[:10]
    future = issued > today
    impossible = bool(declared and applied and issued > applied)
    ok = not (future or impossible)
    if future:
        detail = {"en": f"Issue date {dmy(cert['issue_date'])} is in the future (today {dmy(today)}) — probably an entry error; verify the original certificate.",
                  "hi": f"जारी दिनांक {dmy(cert['issue_date'])} भविष्य की है (आज {dmy(today)}) — संभवतः प्रविष्टि त्रुटि; मूल प्रमाण पत्र का सत्यापन करें।"}
    elif impossible:
        detail = {"en": f"Issue date {dmy(cert['issue_date'])} is after the application date ({dmy(applied)}), yet the applicant declared this certificate on the application — verify the original certificate.",
                  "hi": f"जारी दिनांक {dmy(cert['issue_date'])} आवेदन दिनांक ({dmy(applied)}) के बाद की है, जबकि आवेदक ने यह प्रमाण पत्र आवेदन में घोषित किया है — मूल प्रमाण पत्र का सत्यापन करें।"}
    elif applied and issued > applied:
        detail = {"en": f"Issued on {dmy(cert['issue_date'])}, after this application ({dmy(applied)}) — normal for a relative's later certificate.",
                  "hi": f"जारी दिनांक {dmy(cert['issue_date'])}, इस आवेदन ({dmy(applied)}) के बाद — संबंधी के बाद में जारी प्रमाण पत्र हेतु सामान्य।"}
    else:
        detail = {"en": f"Issued on {dmy(cert['issue_date'])}.", "hi": f"जारी दिनांक {dmy(cert['issue_date'])}।"}
    checks.append({"code": "issue_date_valid", "ok": ok,
                   "label": {"en": "Issue date not in the future", "hi": "जारी तिथि भविष्य की नहीं"},
                   "detail": detail, **({} if ok else {"severity": "fail"})})

    ok = cert["status"] == "active"
    if ok:
        detail = {"en": "Active in the archive.", "hi": "अभिलेखागार में सक्रिय।"}
    elif cert["status"] == "cancelled":
        note = cert.get("status_note") or {"en": "Cancelled.", "hi": "निरस्त।"}
        detail = {"en": note["en"] + ". A cancelled certificate cannot be used as evidence.",
                  "hi": note["hi"] + "। निरस्त प्रमाण पत्र साक्ष्य के रूप में उपयोग नहीं हो सकता।"}
    else:
        detail = {"en": "Under scrutiny by the District Verification Committee — wait for the outcome.",
                  "hi": "जिला छानबीन समिति में जांचाधीन — निर्णय की प्रतीक्षा करें।"}
    checks.append({"code": "not_cancelled", "ok": ok,
                   "label": {"en": "Not cancelled / not under scrutiny", "hi": "निरस्त / जांचाधीन नहीं"}, "detail": detail})

    ok = bool(cert["qr_verified"])
    checks.append({"code": "qr_verified", "ok": ok,
                   "label": {"en": "QR / e-sign verified", "hi": "क्यूआर / ई-हस्ताक्षर सत्यापित"},
                   "detail": {"en": "QR code and digital signature verified (simulated)." if ok else "QR could not be verified — check the original.",
                              "hi": "क्यूआर कोड व डिजिटल हस्ताक्षर सत्यापित (अनुकरण)।" if ok else "क्यूआर सत्यापित नहीं हुआ — मूल प्रति देखें।"}})

    if kind == "domicile" or cert_kind == "domicile":
        ok = True
        detail = {"en": "Not applicable for domicile.", "hi": "मूल निवास हेतु लागू नहीं।"}
    else:
        same_cat = cert["category"] == claimed_category
        g_cert, g_claim = caste_group(cert.get("caste_name")), caste_group(claimed_caste)
        same_caste = (g_cert is None or g_claim is None or g_cert == g_claim)
        ok = same_cat and same_caste
        if ok:
            detail = {"en": f"Certificate records {cert['category']}; the application claims {claimed_category}. Consistent.",
                      "hi": f"प्रमाण पत्र में {cert['category']} दर्ज; आवेदन में {claimed_category}। सुसंगत।"}
        elif not same_cat:
            detail = {"en": f"Certificate records category {cert['category']}; the application claims {claimed_category}.",
                      "hi": f"प्रमाण पत्र में वर्ग {cert['category']} दर्ज; आवेदन में वर्ग {claimed_category}।"}
        else:
            detail = {"en": f"Same category ({claimed_category}) but a different caste/tribe entry in the list.",
                      "hi": f"वर्ग समान ({claimed_category}) पर सूची में भिन्न जाति/जनजाति प्रविष्टि।"}
    checks.append({"code": "category_consistent", "ok": ok,
                   "label": {"en": "Category consistent with the claim", "hi": "दावे से वर्ग सुसंगत"}, "detail": detail})
    return checks


# ------------------------------------------------------------------ service checklists (Sewa Setu)
CASTE_PROOF_DOCS = ["record_1950", "school_record", "sarpanch_cert", "family_cert"]
RESIDENCE_DOCS = ["residence_proof", "land_record", "ration_card", "school_record", "family_domicile"]

DEFICIENCY_TEXT = {
    # standard send-back reason library (what exactly to bring); service-specific lists below
    "record_1950": {"en": "Attach a pre-1950 (OBC: pre-1984) revenue record (misal / jamabandi / khasra) or a Patwari-certified vanshavali (family tree) showing the family's caste.",
                    "hi": "1950 (अ.पि.व.: 1984) से पूर्व का राजस्व अभिलेख (मिसल / जमाबंदी / खसरा) या पटवारी द्वारा प्रमाणित वंशावली संलग्न करें जिसमें परिवार की जाति दर्ज हो।"},
    "school_record": {"en": "Attach an extract of the school admission register (scholar register) or TC showing the caste of the applicant or the father.",
                      "hi": "स्कूल दाखिला पंजी (स्कॉलर रजिस्टर) का उद्धरण या टीसी संलग्न करें जिसमें आवेदक या पिता की जाति दर्ज हो।"},
    "sarpanch_cert": {"en": "Attach a certificate of caste and residence from the Sarpanch / Gram Sabha (urban areas: Parshad).",
                      "hi": "सरपंच / ग्राम सभा (नगरीय क्षेत्र: पार्षद) से जाति एवं निवास का प्रमाण पत्र संलग्न करें।"},
    "family_cert_no": {"en": "If the father or a brother/sister already holds a caste certificate, write its certificate number on the application.",
                       "hi": "यदि पिता या भाई/बहन के पास पहले से जाति प्रमाण पत्र है, तो उसका प्रमाण पत्र क्रमांक आवेदन में लिखें।"},
    "affidavit_format": {"en": "The affidavit is not in Form 2A or is unsigned — attach a signed affidavit in Form 2A.",
                         "hi": "शपथ पत्र फॉर्म 2A में नहीं है या हस्ताक्षरित नहीं है — फॉर्म 2A में हस्ताक्षरित शपथ पत्र संलग्न करें।"},
    "illegible_scan": {"en": "Some uploaded pages cannot be read — upload clear scans of every page, with the full page visible.",
                       "hi": "कुछ अपलोड किए गए पृष्ठ पढ़े नहीं जा सकते — हर पृष्ठ का साफ़ स्कैन, पूरा पृष्ठ दिखाते हुए, अपलोड करें।"},
    "father_name_mismatch": {"en": "The father's name is spelt differently across documents — attach one more document with the father's name (ration card, school record or voter ID).",
                             "hi": "दस्तावेज़ों में पिता का नाम अलग-अलग लिखा है — पिता के नाम वाला एक और दस्तावेज़ (राशन कार्ड, स्कूल अभिलेख या मतदाता पहचान पत्र) संलग्न करें।"},
    "maiden_village": {"en": "For a married applicant: attach a residence or caste proof from the parental (maiden) village.",
                       "hi": "विवाहित आवेदिका हेतु: पिता के गांव (मायके) का निवास या जाति प्रमाण संलग्न करें।"},
    "land_record": {"en": "Attach the family's land record (B-1 / khasra) or other proof of 15 years' residence in Chhattisgarh.",
                    "hi": "परिवार का भूमि अभिलेख (बी-1 / खसरा) या छत्तीसगढ़ में 15 वर्ष के निवास का अन्य प्रमाण संलग्न करें।"},
    "affidavit": {"en": "Attach the self-declaration affidavit (Form 2A), signed.",
                  "hi": "हस्ताक्षरित स्वघोषणा शपथ पत्र (फॉर्म 2A) संलग्न करें।"},
    "identity_proof": {"en": "Attach an identity proof (Aadhaar or voter ID).",
                       "hi": "पहचान प्रमाण (आधार या मतदाता पहचान पत्र) संलग्न करें।"},
    "caste_proof": {"en": "Attach any ONE caste proof: school record showing caste, Sarpanch/Parshad certificate, a family member's caste certificate, or a pre-1950 (OBC: pre-1984) record.",
                    "hi": "कोई एक जाति प्रमाण संलग्न करें: जाति दर्ज स्कूल अभिलेख, सरपंच/पार्षद प्रमाण पत्र, परिवार के सदस्य का जाति प्रमाण पत्र, या 1950 (अ.पि.व.: 1984) से पूर्व का अभिलेख।"},
    "father_income": {"en": "Attach the father's income certificate for the preceding year (needed for OBC: creamy-layer check under Rule 3(3)).",
                      "hi": "पिता का पिछले वर्ष का आय प्रमाण पत्र संलग्न करें (अ.पि.व. हेतु आवश्यक: नियम 3(3) के अंतर्गत क्रीमी लेयर जांच)।"},
    "family_tree": {"en": "Attach the family tree (vanshavali) of three generations certified by the Halka Patwari.",
                    "hi": "हल्का पटवारी द्वारा प्रमाणित तीन पीढ़ी का वंशवृक्ष (वंशावली) संलग्न करें।"},
    "residence_proof": {"en": "Attach any ONE residence proof: land record, ration card, CG school record, or a family member's domicile certificate.",
                        "hi": "कोई एक निवास प्रमाण संलग्न करें: भूमि अभिलेख, राशन कार्ड, छ.ग. का स्कूल अभिलेख, या परिवार के सदस्य का मूल निवास प्रमाण पत्र।"},
}


SENDBACK_LIBRARY = {
    "caste": ["caste_proof", "record_1950", "school_record", "sarpanch_cert", "family_cert_no", "family_tree", "father_income",
              "affidavit", "affidavit_format", "identity_proof", "father_name_mismatch", "maiden_village", "illegible_scan"],
    "domicile": ["residence_proof", "land_record", "affidavit", "affidavit_format", "identity_proof",
                 "father_name_mismatch", "illegible_scan"],
}


def sendback_library(service: str, suggested: list[dict]) -> list[dict]:
    """Standard send-back reasons for the service; the engine's suggested deficiencies first."""
    codes = [d["code"] for d in suggested] + [c for c in SENDBACK_LIBRARY[service_kind(service)]
                                               if c not in {d["code"] for d in suggested}
                                               and not (c == "father_income" and service != "caste_obc")]
    return [{"code": c, "text": DEFICIENCY_TEXT[c], "suggested": c in {d["code"] for d in suggested}} for c in codes]


def checklist(app: dict, family_evidence: dict | None, pending_evidence: dict | None,
              unusable_declared: dict | None = None, found_only: bool = False) -> list[dict]:
    """family_evidence: a usable, confirmed/declared relative certificate (dict) or None.
    pending_evidence: a usable exact match awaiting the officer's confirmation, or None.
    unusable_declared: {"cert": certificate, "why": I18n} when the declared/uploaded family certificate
    matched but cannot be relied on (cancelled, competence under review, ...): it must not tick caste proof.
    found_only: Kendra pre-check — the certificate was found, the officer has not confirmed anything yet."""
    up = {d["code"] for d in app["documents"] if d["uploaded"]}
    if unusable_declared is not None:
        up.discard("family_cert")
    items = [
        {"code": "affidavit", "label": {"en": "Self-declaration affidavit", "hi": "स्वघोषणा शपथ पत्र"},
         "required": True, "present": "affidavit" in up},
        {"code": "identity_proof", "label": {"en": "Identity proof", "hi": "पहचान प्रमाण"},
         "required": True, "present": "identity_proof" in up},
    ]
    if app["service"] == "domicile":
        docs = [d for d in RESIDENCE_DOCS if d in up]
        item = {"code": "residence_proof", "label": {"en": "Residence proof (any one)", "hi": "निवास प्रमाण (कोई एक)"},
                "required": True, "present": bool(docs) or family_evidence is not None}
    else:
        docs = [d for d in CASTE_PROOF_DOCS if d in up]
        item = {"code": "caste_proof",
                "label": {"en": "Caste proof (any one: pre-1950/1984 record, school record, Sarpanch/Parshad certificate, family member's certificate)",
                          "hi": "जाति प्रमाण (कोई एक: 1950/1984 पूर्व अभिलेख, स्कूल अभिलेख, सरपंच/पार्षद प्रमाण पत्र, परिवार के सदस्य का प्रमाण पत्र)"},
                "required": True, "present": bool(docs) or family_evidence is not None}
    if family_evidence is not None and found_only:
        c = family_evidence
        item["satisfied_by"] = {"en": f"Relative's certificate No. {c['cert_no']} ({c['issuing_authority']['en']}, {c['issue_date'][:4]}) found — the officer will confirm the relationship",
                                "hi": f"संबंधी का प्रमाण पत्र क्र. {c['cert_no']} ({c['issuing_authority']['hi']}, {c['issue_date'][:4]}) मिला — संबंध की पुष्टि अधिकारी करेंगे"}
    elif family_evidence is not None:
        c = family_evidence
        item["satisfied_by"] = {"en": f"Relative's certificate No. {c['cert_no']} ({c['issuing_authority']['en']}, {c['issue_date'][:4]}) — relationship accepted",
                                "hi": f"संबंधी का प्रमाण पत्र क्र. {c['cert_no']} ({c['issuing_authority']['hi']}, {c['issue_date'][:4]}) — संबंध स्वीकृत"}
    elif docs:
        labels = {d["code"]: d["label"] for d in app["documents"]}
        item["satisfied_by"] = {"en": ", ".join(labels[d]["en"] for d in docs), "hi": ", ".join(labels[d]["hi"] for d in docs)}
    elif pending_evidence is not None:
        c = pending_evidence
        item["note"] = {"en": f"Awaiting your confirmation: certificate No. {c['cert_no']} found in the archive",
                        "hi": f"आपकी पुष्टि की प्रतीक्षा: अभिलेखागार में प्रमाण पत्र क्र. {c['cert_no']} मिला"}
        item["state"] = "pending"
    if unusable_declared is not None and family_evidence is None:
        c, why = unusable_declared["cert"], unusable_declared["why"]
        item["note"] = {"en": f"Family member's certificate No. {c['cert_no']} is on file but cannot be relied on yet: {why['en']}",
                        "hi": f"परिवार के सदस्य का प्रमाण पत्र क्र. {c['cert_no']} संलग्न है पर अभी उस पर भरोसा नहीं किया जा सकता: {why['hi']}"}
        item["state"] = "blocked"
    items.append(item)
    if app["service"] != "domicile":
        # Rule 3(3): Patwari family tree (3 generations). Shown honestly; not a send-back ground in this demo
        # (whether a records-complete approval may proceed without it is to be confirmed with CHiPS / Revenue).
        ft = {"code": "family_tree", "label": {"en": "Family tree, 3 generations, by the Halka Patwari (Rule 3(3))",
                                               "hi": "हल्का पटवारी द्वारा तीन पीढ़ी का वंशवृक्ष (नियम 3(3))"},
              "required": False, "present": "family_tree" in up}
        if not ft["present"]:
            ft["state"] = "not_on_file"
            ft["note"] = {"en": "Not on file — obtainable from the Halka Patwari (Rule 7); the order records it as not on file.",
                          "hi": "संलग्न नहीं — हल्का पटवारी से प्राप्त किया जा सकता है (नियम 7); आदेश में 'संलग्न नहीं' दर्ज होगा।"}
        items.append(ft)
    if app["service"] == "caste_obc":
        items.append({"code": "father_income", "label": {"en": "Father's income certificate, preceding year (OBC, Rule 3(3))",
                                                         "hi": "पिता का आय प्रमाण पत्र, पिछला वर्ष (अ.पि.व., नियम 3(3))"},
                      "required": True, "present": "father_income" in up})
    return items


def deficiencies(items: list[dict], pending_evidence: dict | None) -> list[dict]:
    out = []
    for it in items:
        if it["required"] and not it["present"]:
            if it["code"] in ("caste_proof", "residence_proof") and pending_evidence is not None:
                continue  # a family record is waiting for the officer's confirmation
            out.append({"code": it["code"], "text": DEFICIENCY_TEXT[it["code"]]})
    return out


def precheck_checklist(service: str, family_cert: dict | None) -> list[dict]:
    """Kendra pre-check: what this service needs, before any document is uploaded."""
    items = checklist({"service": service, "documents": []}, family_cert, None, found_only=True)
    for it in items:  # at the Kendra nothing is "on file" yet: say what to bring, not what is missing
        if it["code"] == "family_tree":
            it.pop("state", None)
            it["note"] = {"en": "Bring it if available (Rule 3(3)); the Patwari can also supply it.",
                          "hi": "उपलब्ध हो तो लाएं (नियम 3(3)); पटवारी भी दे सकते हैं।"}
    return items
