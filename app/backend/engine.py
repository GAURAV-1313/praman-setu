"""Case analysis: learned matcher + deterministic rules + templates -> Analysis (CONTRACT.md).

Round 2 (27-09-2026): legally defensible orders.
- Office / place / designation come from the application's tehsil (Tehsildar) or sub-division (SDO).
- The officer disposes of every family record shown: "same family" (with grounds) or "not this family" (with grounds).
- Orders separate "Facts from the records" (system) from the "Satisfaction of the undersigned" (the officer's act),
  name only documents actually on file, list every record considered and why it was not relied upon, and cite the
  correct statute. Signed text is finalised by `finalise()` (no draft header; order number, date, place).
"""
from __future__ import annotations

import hashlib
import json
import re
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

import geo
import rules
import seed_round7
from matcher import REL_LABEL, Matcher, match_level
from messages import render_pair
from rapidfuzz import fuzz, process

IST = timezone(timedelta(hours=5, minutes=30))
dmy = rules.dmy

LANE_TEXT = {
    "records_complete": {"en": "Records complete: a family certificate is relied on as evidence (declared by the applicant, or confirmed by you) and its details agree with the application.",
                         "hi": "अभिलेख पूर्ण: एक पारिवारिक प्रमाण पत्र साक्ष्य के रूप में लिया गया है (आवेदक द्वारा घोषित, या आपके द्वारा पुष्ट) और उसके विवरण आवेदन से मेल खाते हैं।"},
    "standard_review": {"en": "Standard review: the officer examines the application as usual.",
                        "hi": "सामान्य जांच: अधिकारी आवेदन का सामान्य रूप से परीक्षण करें।"},
    "needs_attention": {"en": "Needs attention: the records contain a point to verify before deciding.",
                        "hi": "ध्यान आवश्यक: निर्णय से पहले अभिलेखों में एक बिंदु का सत्यापन करें।"},
}

# ------------------------------------------------------------------ jurisdiction
# Tehsil -> SDO (Revenue) sub-division, Kondagaon district. [verify the mapping with the Revenue Department]
SUBDIVISION = {
    "Kondagaon": {"en": "Kondagaon", "hi": "कोंडागांव"},
    "Makdi": {"en": "Kondagaon", "hi": "कोंडागांव"},
    "Mardapal": {"en": "Kondagaon", "hi": "कोंडागांव"},
    "Keskal": {"en": "Keskal", "hi": "केशकाल"},
    "Farasgaon": {"en": "Keskal", "hi": "केशकाल"},
    "Bade Rajpur": {"en": "Keskal", "hi": "केशकाल"},
    "Dhanora": {"en": "Keskal", "hi": "केशकाल"},
}


def _code(name: str) -> str:
    return re.sub(r"[^A-Z]", "", name.upper())[:3] or "XXX"


def office_info(app: dict) -> dict:
    """Designation, office and place of the competent officer for this application (territorial jurisdiction)."""
    if app["routed_to"] == "tehsildar":
        place = app["tehsil"]
        return {"designation": {"en": "Tehsildar", "hi": "तहसीलदार"},
                "office": {"en": f"Tehsildar, {place['en']}", "hi": f"तहसीलदार, {place['hi']}"},
                "place": place, "code": f"TSL-{_code(place['en'])}",
                "jurisdiction": {"en": f"Tehsil {place['en']}, district {app['district']['en']}",
                                 "hi": f"तहसील {place['hi']}, जिला {app['district']['hi']}"}}
    place = SUBDIVISION.get(app["tehsil"]["en"], app["district"])
    return {"designation": {"en": "Sub-Divisional Officer (Revenue)", "hi": "अनुविभागीय अधिकारी (राजस्व)"},
            "office": {"en": f"SDO (Revenue), {place['en']}", "hi": f"अनुविभागीय अधिकारी (राजस्व), {place['hi']}"},
            "place": place, "code": f"SDO-{_code(place['en'])}",
            "jurisdiction": {"en": f"Sub-division {place['en']} (tehsil {app['tehsil']['en']}), district {app['district']['en']}",
                             "hi": f"अनुविभाग {place['hi']} (तहसील {app['tehsil']['hi']}), जिला {app['district']['hi']}"}}


def subdivision_of(app: dict) -> dict:
    """Round 6 (P2): the SDO (Revenue) sub-division whose desk this application belongs to (by tehsil)."""
    sd = SUBDIVISION.get(app["tehsil"]["en"], app["district"])
    return {"en": sd["en"], "hi": sd["hi"], "office": {"en": f"SDO (Revenue), {sd['en']}", "hi": f"अनुविभागीय अधिकारी (राजस्व), {sd['hi']}"}}


SLA_CLOCK = {
    "running": {"en": "SLA clock: running · pause requires Revenue order", "hi": "SLA घड़ी: चालू · रोकने हेतु राजस्व आदेश आवश्यक"},
    "paused_proposed": {"en": "SLA paused (proposed policy — pending Revenue order)", "hi": "SLA रुकी (प्रस्तावित नीति — राजस्व आदेश लंबित)"},
}


def sla_clock() -> dict:
    """Round 6: hearing (15 d) and Patwari (7 d) timers run inside the 22-day SLA. The pause is a PROPOSED policy
    toggle (display only: no due date is changed); by default the clock is shown as running."""
    k = rules.sla_pause_policy()
    return {"state": k, "paused": k == "paused_proposed", "label": SLA_CLOCK[k]}


def office_for(app: dict) -> dict:
    return office_info(app)["office"]


def public_cert(c: dict) -> dict:
    return {k: v for k, v in c.items() if not k.startswith("_")}


@lru_cache(maxsize=1)
def archive() -> list[dict]:
    certs = json.load(open(geo.SYN / "certificate_archive.json", encoding="utf-8"))
    seed_round7.add_certificate(certs)  # Round 7: the native-village demo father's certificate (runtime seed)
    for c in certs:
        fix_village_hi(c)
    return certs


# ------------------------------------------------------------------ Round 4: data minimisation + village labels
_LONG_NO = re.compile(r"\b(\d{4,})(\d{4})\b")
_KHASRA = re.compile(r"\s*—\s*(khasra|खसरा)\s+[^,]+,\s*[\d.]+\s*(ha|हे\.)\s*,?\s*")


def mask_ids(s: str) -> str:
    """Ration card and other long identifiers: only the last 4 digits (e.g. 2295269691 -> ••••9691)."""
    return _LONG_NO.sub(lambda m: "••••" + m.group(2), s or "")


def minimise_value(field_en: str, v: dict) -> dict:
    out = {}
    for lang in ("en", "hi"):
        x = v.get(lang, "")
        if field_en == "Khasra holder":
            # the caste order needs only who holds land in the village, not the khasra number or area
            x = _KHASRA.sub(" — " if lang == "en" else " — ", x).replace(" —  ", " — ")
            x = re.sub(r"\s+—\s*$", "", x)
        out[lang] = mask_ids(x)
    return out


def minimise_rows(rows: list[dict]) -> list[dict]:
    out = []
    for ev in rows or []:
        ev = dict(ev)
        ev["value"] = minimise_value(ev["field"]["en"], ev["value"])
        if ev.get("note"):
            ev["note"] = {k: mask_ids(v) for k, v in ev["note"].items()}
        out.append(ev)
    return out


def fix_village_hi(obj: dict) -> dict:
    """Hindi village label from the (digit-safe, de-duplicated, hand-curated) LGD table."""
    v = geo.villages().get(obj.get("village_lgd"))
    if v and isinstance(obj.get("village"), dict):
        obj["village"] = {"en": obj["village"]["en"], "hi": v["name_hi"]}
    return obj


@lru_cache(maxsize=1)
def matcher() -> Matcher:
    return Matcher(archive())


def relation_label(hyp: str, cert: dict) -> dict:
    if hyp == "sibling":
        return {"en": "Sister", "hi": "बहन"} if cert["gender"] == "F" else {"en": "Brother", "hi": "भाई"}
    return REL_LABEL[hyp]


def claimed_category(service: str, explicit: str | None = None) -> str | None:
    if explicit:
        return explicit
    return {"caste_st": "ST", "caste_sc": "SC", "caste_obc": "OBC"}.get(service)


def lineage_matches(query: dict, service: str, claimed_cat, claimed_caste, extra: list[str] | None = None,
                    as_of: str | None = None) -> list[dict]:
    m = matcher()
    out = []
    for r in m.match(query, extra_cert_nos=extra, kind=rules.service_kind(service)):
        lvl = match_level(r["probability"])
        if lvl is None:
            continue
        c = m.archive.certs[r["cert_idx"]]
        # Round 6: "declared" = the applicant relied on this certificate on the application (after-application date is impossible)
        val = rules.validity(c, service, claimed_cat, claimed_caste, as_of=as_of, declared=c["cert_no"] in (extra or []))
        out.append({
            "certificate": public_cert(c),
            "relation": r["hyp"],
            "relation_label": relation_label(r["hyp"], c),
            "match_probability": round(r["probability"], 4),
            "match_level": lvl,
            "prior_weight": round(m.model.prior, 3),
            "weights": r["weights"],
            "validity": val,
            "usable_as_evidence": lvl == "exact" and all(v["ok"] for v in val),
        })
    return out


def app_query(app: dict, meta: dict) -> dict:
    return {
        "father_raw": meta["father_raw"], "applicant_raw": meta["applicant_raw"], "birth_year": app["birth_year"],
        "village_lgd": app["village_lgd"], "tehsil_lgd": meta.get("tehsil_lgd"), "district_lgd": app["district_lgd"],
        "village_name": app["village"],
    }


# ------------------------------------------------------------------ Round 7: native (maiden) village search
def native_place(village_lgd: int | None) -> dict | None:
    if not village_lgd or int(village_lgd) not in geo.villages():
        return None
    pl = geo.place(int(village_lgd))
    fix_village_hi(pl)
    return pl


def native_query(query: dict, pl: dict) -> dict:
    """The same lineage query, blocked and scored against the native (maiden) village instead of the current one."""
    return {**query, "village_lgd": pl["village_lgd"], "tehsil_lgd": pl["tehsil_lgd"], "district_lgd": pl["district_lgd"],
            "village_name": pl["village"]}


def _place_words(pl: dict) -> dict:
    return {"en": f"{pl['village']['en']} (LGD {pl['village_lgd']}), tehsil {pl['tehsil']['en']}, district {pl['district']['en']}",
            "hi": f"{pl['village']['hi']} (एलजीडी {pl['village_lgd']}), तहसील {pl['tehsil']['hi']}, जिला {pl['district']['hi']}"}


def merge_native(current: list[dict], native: list[dict], pl: dict) -> list[dict]:
    """Merge + de-duplicate by certificate. A record is labelled found_via="native_village" when only the native-village
    search surfaced it, or when that search scored it higher (it then carries the native-village comparison).
    Records the current-village search already found as strongly are left exactly as they were."""
    by = {lm["certificate"]["cert_no"]: lm for lm in current}
    where = _place_words(pl)
    for lm in native:
        no = lm["certificate"]["cert_no"]
        prev = by.get(no)
        if prev is not None and prev["match_probability"] >= lm["match_probability"]:
            continue
        lm = dict(lm)
        lm["found_via"] = "native_village"
        if prev is None:
            lm["found_via_note"] = {
                "en": f"Found by the native (maiden) village search: {where['en']}. The search of the applicant's current village did not show it.",
                "hi": f"मायके / मूल गांव की खोज से मिला: {where['hi']}। आवेदक के वर्तमान गांव की खोज में यह नहीं दिखा।"}
        else:
            a, b = round(prev["match_probability"] * 100), round(lm["match_probability"] * 100)
            lm["found_via_note"] = {
                "en": f"Stronger link through the native (maiden) village search ({a}% → {b}%): {where['en']}.",
                "hi": f"मायके / मूल गांव की खोज से अधिक मज़बूत कड़ी ({a}% → {b}%): {where['hi']}।"}
        by[no] = lm
    return sorted(by.values(), key=lambda x: -x["match_probability"])


def native_info(pl: dict, matches: list[dict]) -> dict:
    found = [lm["certificate"]["cert_no"] for lm in matches if lm.get("found_via") == "native_village"]
    where = _place_words(pl)
    if found:
        note = {"en": f"Native (maiden) village searched: {where['en']} — {len(found)} family record(s) found. The officer must still confirm the relationship.",
                "hi": f"मायके / मूल गांव में खोजा गया: {where['hi']} — {len(found)} पारिवारिक अभिलेख मिला। संबंध की पुष्टि अधिकारी को ही करनी है।"}
    else:
        note = {"en": f"Native (maiden) village searched: {where['en']} — no family record found there either. This is neutral.",
                "hi": f"मायके / मूल गांव में खोजा गया: {where['hi']} — वहां भी पारिवारिक अभिलेख नहीं मिला। यह तटस्थ है।"}
    return {"village_lgd": pl["village_lgd"], "village": pl["village"], "tehsil": pl["tehsil"], "district": pl["district"],
            "district_lgd": pl["district_lgd"], "found_cert_nos": found, "note": note}


def _place_level(lm: dict) -> str | None:
    return next((w["level"] for w in lm.get("weights") or [] if w["field"] == "village"), None)


def _strip_mock(s: str) -> str:
    """Demo markers belong in UI chips, never in a legal document."""
    return re.sub(r"\s*\((mock|नमूना|मॉक)\)", "", s)


def _chi(cat: str | None) -> str:
    """Category name in Hindi for Hindi text (no Latin 'ST/OBC' inside a Hindi order)."""
    return rules.CATEGORY_NAME.get(cat or "", {}).get("hi", cat or "")


def _cat_words(cat: str | None) -> dict:
    return rules.CATEGORY_NAME.get(cat or "", {"en": cat or "", "hi": cat or ""})


def _cert_line(lm: dict, suffix_en: str = "", suffix_hi: str = "") -> dict:
    c = lm["certificate"]
    cw = _cat_words(c["category"])
    kind_en = f"{cw['en']} caste" if c["category"] else "domicile"
    kind_hi = f"{cw['hi']}" if c["category"] else "मूल निवास"
    caste_en = f" ({c['caste_name']['en']})" if c.get("caste_name") else ""
    caste_hi = f" ({c['caste_name']['hi']})" if c.get("caste_name") else ""
    st_en = "active" if c["status"] == "active" else c["status"].replace("_", " ")
    st_hi = {"active": "सक्रिय", "cancelled": "निरस्त", "under_scrutiny": "जांचाधीन"}[c["status"]]
    return {
        "en": (f"{lm['relation_label']['en']}'s {c['cert_type']} {kind_en} certificate{caste_en} No. {c['cert_no']}, "
               f"holder {c['holder_name']['en']}, issued by {c['issuing_authority']['en']} on {dmy(c['issue_date'])} "
               f"(status: {st_en}; QR verified: {'yes' if c['qr_verified'] else 'no'}){suffix_en}"),
        "hi": (f"{lm['relation_label']['hi']} का {'स्थायी' if c['cert_type'] == 'permanent' else 'अस्थायी'} {kind_hi}{caste_hi} प्रमाण पत्र "
               f"क्र. {c['cert_no']}, धारक {c['holder_name']['hi']}, {c['issuing_authority']['hi']} द्वारा {dmy(c['issue_date'])} को जारी "
               f"(स्थिति: {st_hi}; क्यूआर सत्यापित: {'हाँ' if c['qr_verified'] else 'नहीं'}){suffix_hi}"),
    }


def today_str() -> str:
    return datetime.now(IST).strftime("%d-%m-%Y")


def today_iso() -> str:
    return datetime.now(IST).date().isoformat()


def plus_days(n: int) -> str:
    return (datetime.now(IST).date() + timedelta(days=n)).strftime("%d-%m-%Y")


def validity_headline(lm: dict, claimed: str | None = None) -> tuple[dict | None, str | None]:
    """The single most important validity problem of a match, phrased as a card title.
    Returns (headline, severity) with severity "fail" (cannot be used) or "review" (verify first)."""
    c = lm["certificate"]
    rel_en, rel_hi = lm["relation_label"]["en"], lm["relation_label"]["hi"]
    v = {x["code"]: x for x in lm["validity"]}
    yr = c["issue_date"][:4]
    if not v["not_cancelled"]["ok"]:
        if c["status"] == "cancelled":
            so = c.get("status_order")
            if so:
                return ({"en": f"{rel_en}'s certificate cancelled by the Scrutiny Committee (order {so['no']}, {dmy(so['date'])}) — cannot be used as proof",
                         "hi": f"{rel_hi} का प्रमाण पत्र छानबीन समिति द्वारा निरस्त (आदेश {so['no']}, {dmy(so['date'])}) — प्रमाण के रूप में उपयोग नहीं हो सकता"}, "fail")
            note = (c.get("status_note") or {}).get("en", "")
            m = re.search(r"(19|20)\d\d", note)
            when = f" ({m.group(0)})" if m else ""
            return ({"en": f"{rel_en}'s certificate cancelled{when} — cannot be used as proof",
                     "hi": f"{rel_hi} का प्रमाण पत्र निरस्त{when} — प्रमाण के रूप में उपयोग नहीं हो सकता"}, "fail")
        return ({"en": f"{rel_en}'s certificate is under scrutiny — wait for the committee's outcome",
                 "hi": f"{rel_hi} का प्रमाण पत्र जांचाधीन — समिति के निर्णय की प्रतीक्षा करें"}, "fail")
    if not v["issue_date_valid"]["ok"]:
        if str(c["issue_date"])[:10] > datetime.now().strftime("%Y-%m-%d"):
            # Round 5: after today as well — say so plainly
            return ({"en": f"{rel_en}'s certificate is dated {dmy(c['issue_date'])} — a future date, probably an entry error; see the original",
                     "hi": f"{rel_hi} के प्रमाण पत्र की तिथि {dmy(c['issue_date'])} — भविष्य की तिथि, संभवतः प्रविष्टि त्रुटि; मूल प्रति देखें"}, "fail")
        return ({"en": f"Declared {rel_en.lower()}'s certificate is dated {dmy(c['issue_date'])}, after the application — verify the original",
                 "hi": f"घोषित {rel_hi} के प्रमाण पत्र की तिथि {dmy(c['issue_date'])} आवेदन के बाद की है — मूल प्रति का सत्यापन करें"}, "fail")
    if not v["permanent"]["ok"]:
        return ({"en": f"{rel_en}'s certificate is TEMPORARY — never lineage proof",
                 "hi": f"{rel_hi} का प्रमाण पत्र अस्थायी है — वंश-प्रमाण कभी नहीं"}, "fail")
    if not v["category_consistent"]["ok"]:
        if claimed and c.get("category") == claimed:
            return ({"en": f"{rel_en}'s certificate records a different caste/tribe entry within {c['category']} — see the comparison; verify",
                     "hi": f"{rel_hi} के प्रमाण पत्र में {_chi(c['category'])} के भीतर भिन्न जाति/जनजाति प्रविष्टि — मिलान देखें; सत्यापन करें"}, "fail")
        other = f", application claims {claimed}" if claimed else ""
        other_hi = f", आवेदन में {_chi(claimed)} का दावा" if claimed else ""
        return ({"en": f"{rel_en}'s certificate records {c['category']}{other} — verify",
                 "hi": f"{rel_hi} के प्रमाण पत्र में {_chi(c['category'])} दर्ज{other_hi} — सत्यापन करें"}, "fail")
    if not v["competent_authority"]["ok"]:
        if v["competent_authority"].get("severity") == "review":
            return ({"en": f"Issued by Tehsildar ({yr}) — policy: confirmation required (notification No. —); verify",
                     "hi": f"तहसीलदार द्वारा जारी ({yr}) — नीति: पुष्टि आवश्यक (अधिसूचना क्र. —); सत्यापन करें"}, "review")
        return ({"en": f"Issued by a Tehsildar ({yr}) after the CG HC ruling — not the competent authority",
                 "hi": f"छ.ग. उच्च न्यायालय निर्णय के बाद तहसीलदार द्वारा जारी ({yr}) — सक्षम प्राधिकारी नहीं"}, "fail")
    if not v["qr_verified"]["ok"]:
        return ({"en": "QR / e-sign not verified — check the original certificate",
                 "hi": "क्यूआर / ई-हस्ताक्षर सत्यापित नहीं — मूल प्रमाण पत्र देखें"}, "review")
    return None, None


REFER_LABEL = {
    "patwari": {"en": "Patwari field report (Rule 8 enquiry)", "hi": "पटवारी क्षेत्र प्रतिवेदन (नियम 8 जांच)"},
    "scrutiny_committee": {"en": "District Verification (Scrutiny) Committee", "hi": "जिला छानबीन समिति"},
    "sdo": {"en": "SDO (Revenue)", "hi": "अनुविभागीय अधिकारी (राजस्व)"},
}


def refer_options(app: dict, attention: list[dict] | None = None) -> list[str]:
    if app["routed_to"] == "tehsildar":
        opts = ["patwari", "sdo"] + (["scrutiny_committee"] if app["service"] != "domicile" else [])
    else:
        opts = ["patwari", "scrutiny_committee"]
    # A Patwari cannot answer a question about the issuing authority's competence or a certificate's genuineness.
    if attention and all(f["code"] in ("authority_under_review", "incompetent_authority", "issue_date_after_application")
                         for f in attention) and "scrutiny_committee" in opts:
        opts = [o for o in opts if o != "patwari"]
    return opts


PATWARI_NAMES = [("Ramesh Netam", "रमेश नेताम"), ("Sunil Markam", "सुनील मरकाम"), ("Kamla Sori", "कमला सोरी"),
                 ("Dinesh Sahu", "दिनेश साहू"), ("Anita Kashyap", "अनीता कश्यप"), ("Bhola Yadav", "भोला यादव")]
PATWARI_DAYS = 7


def halka(app: dict) -> dict:
    """Halka (Patwari circle) of the applicant's village. SYNTHETIC: derived from the LGD code for the demo; in
    production this comes from the Bhuiyan / Revenue halka master."""
    lgd = int(app.get("village_lgd") or 0)
    no = lgd % 37 + 1
    en, hi = PATWARI_NAMES[lgd % len(PATWARI_NAMES)]
    return {"no": no, "patwari": {"en": en, "hi": hi},
            "label": {"en": f"Halka No. {no}, Patwari: {en}", "hi": f"हल्का क्र. {no}, पटवारी: {hi}"}}


def refer_target(app: dict, code: str) -> dict:
    if code == "patwari":
        h = halka(app)
        return {"en": f"the Halka Patwari ({h['label']['en']}), tehsil {app['tehsil']['en']}",
                "hi": f"हल्का पटवारी ({h['label']['hi']}), तहसील {app['tehsil']['hi']}"}
    if code == "sdo":
        sd = SUBDIVISION.get(app["tehsil"]["en"], app["district"])
        return {"en": f"the SDO (Revenue), {sd['en']}", "hi": f"अनुविभागीय अधिकारी (राजस्व), {sd['hi']}"}
    return {"en": f"the District Verification (Scrutiny) Committee, {app['district']['en']}",
            "hi": f"जिला छानबीन समिति, {app['district']['hi']}"}


def suggested_refer(app: dict, attention: list[dict]) -> str:
    opts = refer_options(app, attention)
    for f in attention:
        code = {"relative_cert_cancelled": "patwari", "category_differs": "patwari", "possible_conflicting_record": "patwari",
                "authority_under_review": "scrutiny_committee", "incompetent_authority": "scrutiny_committee",
                "relative_cert_under_scrutiny": "scrutiny_committee",
                "issue_date_after_application": "scrutiny_committee"}.get(f["code"])
        if code in opts:
            return code
    return opts[0]


def _flag(code, severity, title, explanation, cert_no, order_point=None):
    f = {"code": code, "severity": severity, "title": title, "explanation": explanation, "cert_nos": [cert_no]}
    if order_point:
        f["order_point"] = order_point
    return f


def _issue_date_flag(lm: dict, rel_en: str, rel_hi: str) -> dict:
    """Round 6: raised only for a FUTURE-dated certificate, or a DECLARED certificate dated after the application
    (rules.validity) — never for a relative's normal later certificate."""
    c = lm["certificate"]
    no = c["cert_no"]
    v = {x["code"]: x for x in lm["validity"]}
    future = str(c["issue_date"])[:10] > today_iso()
    if future:
        title = {"en": f"The {rel_en}'s certificate bears a future date ({dmy(c['issue_date'])})",
                 "hi": f"{rel_hi} के प्रमाण पत्र पर भविष्य की तिथि ({dmy(c['issue_date'])})"}
        point = {"en": f"Certificate No. {no} of the applicant's {rel_en} bears the issue date {dmy(c['issue_date'])}, which is a future date; the original is to be verified.",
                 "hi": f"आवेदक के {rel_hi} के प्रमाण पत्र क्र. {no} पर जारी तिथि {dmy(c['issue_date'])} अंकित है, जो भविष्य की तिथि है; मूल प्रति का सत्यापन किया जाए।"}
    else:
        title = {"en": f"The declared {rel_en}'s certificate is dated after the application ({dmy(c['issue_date'])})",
                 "hi": f"घोषित {rel_hi} का प्रमाण पत्र आवेदन के बाद की तिथि ({dmy(c['issue_date'])}) का है"}
        point = {"en": f"Certificate No. {no} of the applicant's {rel_en}, declared on the application, bears the issue date {dmy(c['issue_date'])}, which is after the date of the application; its genuineness is to be verified.",
                 "hi": f"आवेदन में घोषित, आवेदक के {rel_hi} के प्रमाण पत्र क्र. {no} पर जारी तिथि {dmy(c['issue_date'])} अंकित है, जो आवेदन की तिथि के बाद की है; इसकी वास्तविकता का सत्यापन किया जाए।"}
    return _flag(
        "issue_date_after_application", "attention", title,
        {"en": v["issue_date_valid"]["detail"]["en"] + " It is not counted as evidence until the original is verified.",
         "hi": v["issue_date_valid"]["detail"]["hi"] + " मूल प्रति के सत्यापन तक इसे साक्ष्य नहीं माना गया।"},
        no, point)


def _flags(app: dict, matches: list[dict], declared: str | None) -> list[dict]:
    """Flags for the officer (tool voice allowed in `explanation`) with a neutral, factual `order_point`
    that is the only text rendered into a reference or order."""
    flags = []
    claimed = app["claimed_category"]
    for lm in matches:
        c = lm["certificate"]
        no = c["cert_no"]
        rel_en, rel_hi = lm["relation_label"]["en"].lower(), lm["relation_label"]["hi"]
        v = {x["code"]: x for x in lm["validity"]}
        if lm["match_level"] != "exact":
            if not v["issue_date_valid"]["ok"]:
                flags.append(_issue_date_flag(lm, rel_en, rel_hi))
            if c.get("category") and claimed and not v["category_consistent"]["ok"]:
                flags.append(_flag(
                    "possible_conflicting_record", "attention",
                    {"en": f"Possible record in the {rel_en}'s name shows {c['category']}; application claims {claimed}",
                     "hi": f"{rel_hi} के नाम का संभावित अभिलेख {_chi(c['category'])} दर्शाता है; आवेदन में {_chi(claimed)} का दावा"},
                    {"en": f"Certificate No. {no} may belong to the applicant's {rel_en} (possible link only). Decide whether it is the same family: "
                           f"if not, mark 'Not this family' with grounds; if it is, the conflict must be verified before deciding.",
                     "hi": f"प्रमाण पत्र क्र. {no} संभवतः आवेदक के {rel_hi} का है (केवल संभावित कड़ी)। तय करें कि यह वही परिवार है या नहीं: "
                           f"यदि नहीं, तो कारण सहित 'यह परिवार नहीं' चुनें; यदि हाँ, तो निर्णय से पहले भिन्नता का सत्यापन आवश्यक है।"},
                    no,
                    {"en": f"Certificate No. {no} ({c['cert_type']}, issued by {c['issuing_authority']['en']} on {dmy(c['issue_date'])}) in the name of "
                           f"{c['holder_name']['en']}, possibly the applicant's {rel_en}, records {c['category']} ({c['caste_name']['en']}); the application claims {claimed}.",
                     "hi": f"प्रमाण पत्र क्र. {no} ({c['issuing_authority']['hi']} द्वारा {dmy(c['issue_date'])} को जारी), धारक {c['holder_name']['hi']}, "
                           f"संभवतः आवेदक के {rel_hi}, में {_chi(c['category'])} ({c['caste_name']['hi']}) दर्ज है; आवेदन में {_chi(claimed)} का दावा है।"}))
            elif v["issue_date_valid"]["ok"]:
                flags.append(_flag(
                    "possible_match", "info",
                    {"en": "Possible family record — mark it 'same family' or 'not this family'",
                     "hi": "संभावित पारिवारिक अभिलेख — 'वही परिवार' या 'यह परिवार नहीं' चिह्नित करें"},
                    {"en": f"Certificate No. {no} may belong to the applicant's {rel_en} (possible link). The order must say how it was dealt with.",
                     "hi": f"प्रमाण पत्र क्र. {no} संभवतः आवेदक के {rel_hi} का है (संभावित कड़ी)। आदेश में इसका निस्तारण दर्ज होना आवश्यक है।"},
                    no))
            continue
        if not v["category_consistent"]["ok"]:
            flags.append(_flag(
                "category_differs", "attention",
                {"en": f"Category differs from a {rel_en}'s certificate", "hi": f"{rel_hi} के प्रमाण पत्र से वर्ग भिन्न"},
                {"en": f"The {rel_en}'s certificate No. {no} records category {c['category']}; this application claims {claimed}. "
                       f"There may be a simple explanation. Verify before deciding — a Patwari field report on the family's recorded caste (Rule 8 enquiry) is suggested; "
                       f"a rejection on this record needs a pre-rejection hearing notice first.",
                 "hi": f"{rel_hi} के प्रमाण पत्र क्र. {no} में वर्ग {_chi(c['category'])} दर्ज है; इस आवेदन में वर्ग {_chi(claimed)} का दावा है। इसका सरल कारण हो सकता है। "
                       f"निर्णय से पहले सत्यापन करें — परिवार की दर्ज जाति पर पटवारी क्षेत्र प्रतिवेदन (नियम 8 जांच) सुझाया गया है; "
                       f"इस अभिलेख पर अस्वीकृति से पहले पूर्व-अस्वीकृति सुनवाई सूचना आवश्यक है।"},
                no,
                {"en": f"Certificate No. {no} of the applicant's {rel_en}, {c['holder_name']['en']}, issued by {c['issuing_authority']['en']} on {dmy(c['issue_date'])}, "
                       f"records {c['category']} ({c['caste_name']['en']}); the application claims {claimed}"
                       f"{' (' + app['claimed_caste']['en'] + ')' if app.get('claimed_caste') else ''}.",
                 "hi": f"आवेदक के {rel_hi} {c['holder_name']['hi']} के प्रमाण पत्र क्र. {no} ({c['issuing_authority']['hi']}, {dmy(c['issue_date'])}) में "
                       f"{_chi(c['category'])} ({c['caste_name']['hi']}) दर्ज है; आवेदन में {_chi(claimed)}"
                       f"{' (' + app['claimed_caste']['hi'] + ')' if app.get('claimed_caste') else ''} का दावा है।"}))
        if not v["not_cancelled"]["ok"]:
            cancelled = c["status"] == "cancelled"
            so = c.get("status_order")
            if cancelled:
                ex_en = " Decide on the applicant's own evidence — a Patwari field report (Rule 8 enquiry) is suggested."
                ex_hi = " आवेदक के स्वयं के साक्ष्य पर निर्णय लें — पटवारी क्षेत्र प्रतिवेदन (नियम 8 जांच) सुझाया गया है।"
                pt_en = (f"Certificate No. {no} of the applicant's {rel_en}, {c['holder_name']['en']}, was cancelled by the District Verification (Scrutiny) Committee"
                         + (f" by order No. {so['no']} dated {dmy(so['date'])} ({so['grounds']['en']}). A copy of the Committee's order is to be placed on file." if so else "."))
                pt_hi = (f"आवेदक के {rel_hi} {c['holder_name']['hi']} का प्रमाण पत्र क्र. {no} जिला छानबीन समिति द्वारा निरस्त किया गया"
                         + (f" (आदेश क्र. {so['no']} दिनांक {dmy(so['date'])}; {so['grounds']['hi']})। समिति के आदेश की प्रति नस्ती में रखी जाए।" if so else "।"))
            else:
                ex_en = " Refer to the District Verification (Scrutiny) Committee or wait for its outcome."
                ex_hi = " जिला छानबीन समिति को संदर्भित करें या उसके निर्णय की प्रतीक्षा करें।"
                pt_en = f"Certificate No. {no} of the applicant's {rel_en}, {c['holder_name']['en']}, is under scrutiny by the District Verification Committee."
                pt_hi = f"आवेदक के {rel_hi} {c['holder_name']['hi']} का प्रमाण पत्र क्र. {no} जिला छानबीन समिति में जांचाधीन है।"
            flags.append(_flag(
                "relative_cert_cancelled" if cancelled else "relative_cert_under_scrutiny", "attention",
                {"en": f"The {rel_en}'s certificate is {'cancelled' if cancelled else 'under scrutiny'}",
                 "hi": f"{rel_hi} का प्रमाण पत्र {'निरस्त' if cancelled else 'जांचाधीन'} है"},
                {"en": v["not_cancelled"]["detail"]["en"] + ex_en, "hi": v["not_cancelled"]["detail"]["hi"] + ex_hi},
                no, {"en": pt_en, "hi": pt_hi}))
        if not v["issue_date_valid"]["ok"]:
            flags.append(_issue_date_flag(lm, rel_en, rel_hi))
        if not v["competent_authority"]["ok"]:
            yr = c["issue_date"][:4]
            if v["competent_authority"].get("severity") == "review":
                flags.append(_flag(
                    "authority_under_review", "attention",
                    {"en": f"The {rel_en}'s permanent certificate was issued by a Tehsildar ({yr}) — competence under review",
                     "hi": f"{rel_hi} का स्थायी प्रमाण पत्र तहसीलदार द्वारा जारी ({yr}) — सक्षमता विचाराधीन"},
                    {"en": "CG HC (22-07-2026) held that the SDO (Revenue) or above issues permanent caste certificates; "
                           "the department has not yet said how earlier Tehsildar-issued certificates are to be treated. "
                           "Do not rely on it as proof until it is verified — the District Verification (Scrutiny) Committee can verify it. "
                           "A Patwari cannot answer a competence question.",
                     "hi": "छ.ग. उच्च न्यायालय (22-07-2026) के अनुसार स्थायी जाति प्रमाण पत्र अनुविभागीय अधिकारी (राजस्व) या उससे वरिष्ठ जारी करते हैं; "
                           "पूर्व में तहसीलदार द्वारा जारी प्रमाण पत्रों पर विभाग का निर्देश अभी लंबित है। "
                           "सत्यापन तक इसे प्रमाण न मानें — जिला छानबीन समिति इसका सत्यापन कर सकती है। सक्षमता का प्रश्न पटवारी हल नहीं कर सकते।"},
                    no,
                    {"en": f"Permanent caste certificate No. {no} of the applicant's {rel_en}, {c['holder_name']['en']}, was issued by {c['issuing_authority']['en']} on {dmy(c['issue_date'])}. "
                           f"In view of Shailey Sonkar v. State of Chhattisgarh (CG HC, 22-07-2026) its issuing authority's competence is to be verified.",
                     "hi": f"आवेदक के {rel_hi} {c['holder_name']['hi']} का स्थायी जाति प्रमाण पत्र क्र. {no} {c['issuing_authority']['hi']} द्वारा {dmy(c['issue_date'])} को जारी है। "
                           f"शैली सोनकर विरुद्ध छत्तीसगढ़ राज्य (छ.ग. उच्च न्यायालय, 22-07-2026) के प्रकाश में जारीकर्ता की सक्षमता का सत्यापन किया जाए।"}))
            else:
                flags.append(_flag(
                    "incompetent_authority", "attention",
                    {"en": f"The {rel_en}'s permanent certificate was issued by a Tehsildar ({yr}) after the ruling",
                     "hi": f"{rel_hi} का स्थायी प्रमाण पत्र निर्णय के बाद तहसीलदार द्वारा जारी ({yr})"},
                    {"en": rules.HC_NOTE["en"] + " Verify the certificate before relying on it.",
                     "hi": rules.HC_NOTE["hi"] + " भरोसा करने से पहले प्रमाण पत्र का सत्यापन करें।"},
                    no,
                    {"en": f"Permanent caste certificate No. {no} of the applicant's {rel_en} was issued by a Tehsildar on {dmy(c['issue_date'])}, after the CG High Court ruling of 22-07-2026.",
                     "hi": f"आवेदक के {rel_hi} का स्थायी जाति प्रमाण पत्र क्र. {no} छ.ग. उच्च न्यायालय के 22-07-2026 के निर्णय के बाद, {dmy(c['issue_date'])} को तहसीलदार द्वारा जारी है।"}))
        if v["competent_authority"].get("severity") == "note":
            yr = c["issue_date"][:4]
            flags.append(_flag(
                "tehsildar_issued_note", "info",
                {"en": f"Issuer: Tehsildar ({yr}) · valid per departmental policy setting (note)",
                 "hi": f"जारीकर्ता: तहसीलदार ({yr}) · विभागीय नीति-सेटिंग अनुसार मान्य (टिप्पणी)"},
                {"en": "Policy setting (Collector / CHiPS admin): permanent certificates issued by a Tehsildar before the CG HC ruling "
                       "of 22-07-2026 count as family evidence, with this note, until the Revenue Department notifies otherwise. "
                       "A referral to the Scrutiny Committee stays available as your own choice (R).",
                 "hi": "नीति-सेटिंग (कलेक्टर / CHiPS प्रशासक): छ.ग. उच्च न्यायालय के 22-07-2026 के निर्णय से पूर्व तहसीलदार द्वारा जारी स्थायी "
                       "प्रमाण पत्र, राजस्व विभाग के अन्य निर्देश तक, इस टिप्पणी सहित पारिवारिक साक्ष्य माने जाते हैं। "
                       "छानबीन समिति को संदर्भ आपके विकल्प के रूप में उपलब्ध है (R)।"},
                no))
        if not v["permanent"]["ok"]:
            flags.append(_flag(
                "temporary_certificate", "info",
                {"en": f"The {rel_en}'s certificate is temporary — never lineage proof",
                 "hi": f"{rel_hi} का प्रमाण पत्र अस्थायी है — वंश-प्रमाण कभी नहीं"},
                {"en": f"Certificate No. {no} is a temporary certificate (issued by {c['issuing_authority']['en']}, who is competent for temporary certificates). "
                       f"A temporary certificate cannot be relied on as family evidence; ask for another caste proof.",
                 "hi": f"प्रमाण पत्र क्र. {no} अस्थायी है ({c['issuing_authority']['hi']} द्वारा जारी, जो अस्थायी प्रमाण पत्र हेतु सक्षम हैं)। "
                       f"अस्थायी प्रमाण पत्र पारिवारिक साक्ष्य नहीं माना जा सकता; अन्य जाति प्रमाण माँगें।"},
                no))
        if not v["qr_verified"]["ok"]:
            flags.append(_flag("qr_not_verified", "info", {"en": "QR not verified", "hi": "क्यूआर सत्यापित नहीं"},
                               v["qr_verified"]["detail"], no))
    if declared and not any(lm["certificate"]["cert_no"] == declared for lm in matches):
        flags.append(_flag(
            "declared_cert_not_matched", "info",
            {"en": "Declared family certificate not matched", "hi": "घोषित पारिवारिक प्रमाण पत्र का मिलान नहीं"},
            {"en": f"The applicant declared certificate No. {declared}, but it could not be matched to the family details. "
                   f"It may be a typing error — check the number with the applicant.",
             "hi": f"आवेदक ने प्रमाण पत्र क्र. {declared} घोषित किया, पर परिवार के विवरण से मिलान नहीं हुआ। "
                   f"यह टंकण त्रुटि हो सकती है — आवेदक से क्रमांक जांच लें।"},
            declared))
    return flags


def _strength(lm: dict) -> dict:
    return {"en": "strong link", "hi": "प्रबल कड़ी"} if lm["match_level"] == "exact" else {"en": "possible link", "hi": "संभावित कड़ी"}


MISS_LABEL = {"caste_proof": ("caste proof", "जाति प्रमाण"), "residence_proof": ("residence proof", "निवास प्रमाण"),
              "affidavit": ("affidavit", "शपथ पत्र"), "identity_proof": ("identity proof", "पहचान प्रमाण"),
              "father_income": ("father's income certificate", "पिता का आय प्रमाण पत्र")}


def evidence_summary(lane, matches, accepted, pending, attention, defs, confirmed, undisposed, any_shown=False) -> tuple[dict, int]:
    """One plain line for the queue row + a rank for sorting (0 = records complete … 3 = needs attention).
    No percentages: the strength is a word, so the queue does not anchor on a number."""
    if attention:
        f = attention[0]
        lm = next((m for m in matches if m["certificate"]["cert_no"] in (f.get("cert_nos") or [])), None)
        if lm is not None and lm.get("validity_headline") and lm["match_level"] == "exact":
            return lm["validity_headline"], 3
        return f["title"], 3
    miss_en = ", ".join(MISS_LABEL.get(d["code"], (d["code"], d["code"]))[0] for d in defs)
    miss_hi = ", ".join(MISS_LABEL.get(d["code"], (d["code"], d["code"]))[1] for d in defs)
    if lane == "records_complete":
        lm = accepted[0]
        rel = lm["relation_label"]
        if lm["certificate"]["cert_no"] in confirmed:
            txt = {"en": f"{rel['en']}'s certificate · relationship confirmed", "hi": f"{rel['hi']} का प्रमाण पत्र · संबंध पुष्ट"}
        else:
            txt = {"en": f"{rel['en']}'s certificate declared & matched · {_strength(lm)['en']}",
                   "hi": f"{rel['hi']} का प्रमाण पत्र घोषित व मिलान · {_strength(lm)['hi']}"}
        if pending:
            txt = {"en": txt["en"] + " · another family record to confirm", "hi": txt["hi"] + " · एक और पारिवारिक अभिलेख तय करना है"}
        if defs:
            txt = {"en": txt["en"] + f" · {miss_en} missing", "hi": txt["hi"] + f" · {miss_hi} नहीं"}
        return txt, 0
    if pending:
        lm = pending[0]
        rel = lm["relation_label"]
        src = ("attached by Kendra", "केंद्र द्वारा संलग्न") if lm.get("kendra_attached") else ("found", "मिला")
        return ({"en": f"{rel['en']}'s certificate {src[0]} · {_strength(lm)['en']} · confirm relationship",
                 "hi": f"{rel['hi']} का प्रमाण पत्र {src[1]} · {_strength(lm)['hi']} · संबंध की पुष्टि करें"}, 1)
    if undisposed:
        txt = {"en": "Possible family record — mark same family / not this family",
               "hi": "संभावित पारिवारिक अभिलेख — वही परिवार / यह परिवार नहीं चिह्नित करें"}
    else:
        txt = {"en": "No family record relied on — normal scrutiny", "hi": "कोई पारिवारिक अभिलेख आधार नहीं — सामान्य जांच"} if (matches or any_shown) else \
              {"en": "No family record — normal scrutiny", "hi": "पारिवारिक अभिलेख नहीं — सामान्य जांच"}
    if defs:
        txt = {"en": txt["en"] + f" · {miss_en} missing", "hi": txt["hi"] + f" · {miss_hi} नहीं"}
    return txt, 2


NEXT_STEP_FLAG = {
    "category_differs": ("Check category difference", "वर्ग भिन्नता जांचें"),
    "possible_conflicting_record": ("Check conflicting record", "विरोधी अभिलेख जांचें"),
    "relative_cert_cancelled": ("Cancelled certificate — verify", "निरस्त प्रमाण पत्र — सत्यापन करें"),
    "relative_cert_under_scrutiny": ("Certificate under scrutiny — verify", "प्रमाण पत्र जांचाधीन — सत्यापन करें"),
    "authority_under_review": ("Check issuing authority", "जारीकर्ता प्राधिकारी जांचें"),
    "incompetent_authority": ("Check issuing authority", "जारीकर्ता प्राधिकारी जांचें"),
    "issue_date_after_application": ("Check certificate date", "प्रमाण पत्र की तिथि जांचें"),
}


def next_step(lane, attention, pending, undisposed, defs, evidence_required=False, obc=False) -> dict:
    """Round 3: the officer's next task for the queue's "Next step" column. It names the pending task, never an
    outcome: only a records-complete file with nothing open reads "Ready to sign".
    Round 6 (P2): the same gates the case page enforces — a second usable family record awaiting "same family / not
    this family" blocks signing, so a records-complete file with one reads "Confirm relationship", not "Ready to sign"."""
    if attention:
        en, hi = NEXT_STEP_FLAG.get(attention[0]["code"], ("Verify the flagged point", "ध्यान-बिंदु सत्यापित करें"))
        return {"en": en, "hi": hi}
    miss_en = ", ".join(MISS_LABEL.get(d["code"], (d["code"], d["code"]))[0] for d in defs)
    miss_hi = ", ".join(MISS_LABEL.get(d["code"], (d["code"], d["code"]))[1] for d in defs)
    if lane == "records_complete":
        if pending:
            return {"en": "Confirm relationship (another family record)", "hi": "संबंध तय करें (एक और पारिवारिक अभिलेख)"}
        if undisposed:
            return {"en": "Mark possible record", "hi": "संभावित अभिलेख चिह्नित करें"}
        if defs:
            return {"en": f"Missing: {miss_en}", "hi": f"कमी: {miss_hi}"}
        if obc:
            return {"en": "Creamy-layer finding, then sign", "hi": "क्रीमी लेयर निष्कर्ष, फिर हस्ताक्षर"}
        return {"en": "Ready to sign", "hi": "हस्ताक्षर हेतु तैयार"}
    if pending:
        return {"en": "Confirm relationship", "hi": "संबंध तय करें"}
    if undisposed:
        return {"en": "Mark possible record", "hi": "संभावित अभिलेख चिह्नित करें"}
    if defs:
        return {"en": f"Missing: {miss_en}", "hi": f"कमी: {miss_hi}"}
    if evidence_required:
        return {"en": "Normal scrutiny — pick proof", "hi": "सामान्य जांच — प्रमाण चुनें"}
    return {"en": "Normal scrutiny", "hi": "सामान्य जांच"}


# ------------------------------------------------------------------ Round 6: OBC creamy-layer finding (officer's act)
CREAMY_MARK = {"en": "Creamy-layer finding (OBC):", "hi": "क्रीमी लेयर निष्कर्ष (अ.पि.व.):"}
CREAMY_PLACEHOLDER = {"en": f"{CREAMY_MARK['en']} [Officer: tick the creamy-layer finding and the documents relied on]",
                      "hi": f"{CREAMY_MARK['hi']} [अधिकारी: क्रीमी लेयर निष्कर्ष व आधार दस्तावेज़ चुनें]"}
CREAMY_SENTENCE = {
    "en": CREAMY_MARK["en"] + " On examination of {docs}, the undersigned finds that the applicant does not fall within the "
                              "creamy layer and is entitled to the certificate as a non-creamy-layer Other Backward Class applicant.",
    "hi": CREAMY_MARK["hi"] + " {docs} के परीक्षण पर अधोहस्ताक्षरी पाते हैं कि आवेदक क्रीमी लेयर में नहीं आते तथा "
                              "गैर-क्रीमी लेयर अन्य पिछड़ा वर्ग आवेदक के रूप में प्रमाण पत्र के पात्र हैं।",
}
CREAMY_DOC_ORDER = ["father_income", "land_record", "residence_proof", "school_record", "family_tree", "affidavit", "identity_proof"]


def creamy_layer_info(app: dict) -> dict | None:
    """OBC approvals must record the officer's creamy-layer finding and the documents relied on (Rule 3(3) OBC)."""
    if app["service"] != "caste_obc":
        return None
    up = {d["code"]: d["label"] for d in app["documents"] if d["uploaded"]}
    codes = [c for c in CREAMY_DOC_ORDER if c in up] + [c for c in up if c not in CREAMY_DOC_ORDER]
    has_income = "father_income" in up
    return {"required": True, "options": [{"code": c, "label": up[c]} for c in codes],
            "default_docs": ["father_income"] if has_income else [],
            "father_income_on_file": has_income,
            "placeholder": CREAMY_PLACEHOLDER, "sentence": CREAMY_SENTENCE, "mark": CREAMY_MARK,
            "note": ({"en": "The father's income certificate (preceding year) is on file.", "hi": "पिता का आय प्रमाण पत्र (पिछला वर्ष) संलग्न है।"} if has_income else
                     {"en": "The father's income certificate is NOT on file — send back for it unless another document shows the income.",
                      "hi": "पिता का आय प्रमाण पत्र संलग्न नहीं — जब तक कोई अन्य दस्तावेज़ आय न दर्शाए, इसके लिए वापस भेजें।"})}


def creamy_text(app: dict, docs: list[str]) -> dict:
    """The sentence that replaces the placeholder (same as the frontend builds)."""
    up = {d["code"]: d["label"] for d in app["documents"] if d["uploaded"]}
    return {lang: CREAMY_SENTENCE[lang].replace("{docs}", ", ".join(up[c][lang].split(" (")[0] for c in docs if c in up)) for lang in ("en", "hi")}


# ------------------------------------------------------------------ officer's grounds (confirm / not this family)
SAME_GROUNDS = ["same_father_village", "known_to_office", "patwari_report", "applicant_declaration"]
NOT_GROUNDS = ["father_name_differs", "different_village", "age_implausible", "applicant_denies", "patwari_report_not"]
GROUND_LABEL = {
    "same_father_village": {"en": "Same father's name & village", "hi": "पिता का नाम व गांव समान"},
    "known_to_office": {"en": "Family known to this office", "hi": "परिवार कार्यालय को ज्ञात"},
    "patwari_report": {"en": "Patwari report", "hi": "पटवारी प्रतिवेदन"},
    "applicant_declaration": {"en": "Applicant's declaration", "hi": "आवेदक की घोषणा"},
    "father_name_differs": {"en": "Father's name differs", "hi": "पिता का नाम भिन्न"},
    "different_village": {"en": "Different village / family", "hi": "भिन्न गांव / परिवार"},
    "age_implausible": {"en": "Ages do not fit", "hi": "आयु मेल नहीं खाती"},
    "applicant_denies": {"en": "Applicant says not related", "hi": "आवेदक के अनुसार संबंधी नहीं"},
    "patwari_report_not": {"en": "Patwari report: not related", "hi": "पटवारी प्रतिवेदन: संबंधी नहीं"},
}


def _names_same(a: str, b: str) -> bool:
    n = lambda s: re.sub(r"\s+", " ", (s or "").strip().lower())
    return n(a) == n(b)


def _hi_pair(a: dict, b: dict) -> tuple[str, str]:
    """Hindi rendering of two names that may differ only in the Latin spelling as recorded."""
    if a["hi"] == b["hi"] and a["en"] != b["en"]:
        return f"'{a['hi']}' / '{a['en']}'", f"'{b['hi']}' / '{b['en']}' (अभिलेख में दर्ज वर्तनी)"
    return f"'{a['hi']}'", f"'{b['hi']}'"


def ground_sentence(code: str, app: dict, lm: dict) -> dict:
    c = lm["certificate"]
    rel_en, rel_hi = lm["relation_label"]["en"].lower(), lm["relation_label"]["hi"]
    is_parent = lm["relation"] != "sibling"
    cert_father = c["holder_name"] if is_parent else c["father_name"]
    if code == "same_father_village":
        same_name = _names_same(app["father_name"]["en"], cert_father["en"])
        who_en = "the holder's name" if is_parent else "the father's name in the certificate"
        who_hi = "धारक का नाम" if is_parent else "प्रमाण पत्र में पिता का नाम"
        rel_en_txt = "are the same" if same_name else "are spelling variants of one name"
        rel_hi_txt = "समान हैं" if same_name else "एक ही नाम की वर्तनी के भिन्न रूप हैं"
        vil_same = app["village_lgd"] == c["village_lgd"]
        a_hi, c_hi = _hi_pair(app["father_name"], cert_father)
        if not vil_same and lm.get("found_via") == "native_village" and _place_level(lm) == "same_village":
            # Round 7: the record is in the applicant's stated native (maiden) village
            return {"en": f"the father's name in the application ('{app['father_name']['en']}') and {who_en} ('{cert_father['en']}') {rel_en_txt}, "
                          f"and the certificate is of the applicant's native (maiden) village ({c['village']['en']}, LGD {c['village_lgd']}, "
                          f"district {c['district']['en']}); she now lives in {app['village']['en']}",
                    "hi": f"आवेदन में पिता का नाम ({a_hi}) एवं {who_hi} ({c_hi}) {rel_hi_txt}, तथा प्रमाण पत्र आवेदिका के मायके / मूल गांव "
                          f"({c['village']['hi']}, एलजीडी {c['village_lgd']}, जिला {c['district']['hi']}) का है; वर्तमान निवास {app['village']['hi']}"}
        return {"en": f"the father's name in the application ('{app['father_name']['en']}') and {who_en} ('{cert_father['en']}') {rel_en_txt}"
                      + (f", and the village is the same ({app['village']['en']}, LGD {app['village_lgd']})" if vil_same else
                         f"; the villages are {app['village']['en']} and {c['village']['en']}"),
                "hi": f"आवेदन में पिता का नाम ({a_hi}) एवं {who_hi} ({c_hi}) {rel_hi_txt}"
                      + (f", तथा गांव समान है ({app['village']['hi']}, एलजीडी {app['village_lgd']})" if vil_same else
                         f"; गांव क्रमशः {app['village']['hi']} एवं {c['village']['hi']} हैं")}
    if code == "known_to_office":
        return {"en": "the family is known to this office from its own earlier records",
                "hi": "परिवार इस कार्यालय के पूर्व अभिलेखों से ज्ञात है"}
    if code == "patwari_report":
        return {"en": f"the Halka Patwari's report states that the holder is the applicant's {rel_en}",
                "hi": f"हल्का पटवारी के प्रतिवेदन के अनुसार धारक आवेदक के {rel_hi} हैं"}
    if code == "applicant_declaration":
        return {"en": f"the applicant's affidavit (Form 2A) names the holder as the applicant's {rel_en}",
                "hi": f"आवेदक के शपथ पत्र (फॉर्म 2A) में धारक को आवेदक का {rel_hi} बताया गया है"}
    if code == "father_name_differs":
        return {"en": f"the father's name in the application ('{app['father_name']['en']}') and in the record ('{cert_father['en']}') are different persons",
                "hi": f"आवेदन में पिता का नाम ('{app['father_name']['hi']}') एवं अभिलेख में ('{cert_father['hi']}') भिन्न व्यक्ति हैं"}
    if code == "different_village":
        return {"en": f"the holder belongs to another family (village {c['village']['en']})",
                "hi": f"धारक दूसरे परिवार के हैं (ग्राम {c['village']['hi']})"}
    if code == "age_implausible":
        return {"en": f"the ages (born {app['birth_year']} and {c['birth_year']}) do not fit the stated relationship",
                "hi": f"आयु (जन्म {app['birth_year']} एवं {c['birth_year']}) बताए गए संबंध से मेल नहीं खाती"}
    if code == "applicant_denies":
        return {"en": "the applicant states that the holder is not a relative", "hi": "आवेदक के अनुसार धारक संबंधी नहीं हैं"}
    if code == "patwari_report_not":
        return {"en": "the Halka Patwari's report shows no relationship", "hi": "हल्का पटवारी के प्रतिवेदन में कोई संबंध नहीं दर्शाया गया"}
    return {"en": code, "hi": code}


def grounds_text(d: dict, app: dict, lm: dict) -> dict:
    parts = [ground_sentence(g, app, lm) for g in d.get("grounds", [])]
    roman = ["i", "ii", "iii", "iv", "v", "vi"]
    en = "; ".join(f"({roman[i]}) {p['en']}" for i, p in enumerate(parts))
    hi = "; ".join(f"({roman[i]}) {p['hi']}" for i, p in enumerate(parts))
    note = (d.get("note") or "").strip()
    if note:
        en = (en + "; " if en else "") + f"note of the undersigned: {note}"
        hi = (hi + "; " if hi else "") + f"अधोहस्ताक्षरी की टिप्पणी: {note}"
    return {"en": en, "hi": hi}


def default_grounds(app: dict, lm: dict) -> list[str]:
    """Pre-ticked grounds offered to the officer (never committed without the officer's act)."""
    c = lm["certificate"]
    cert_father = c["holder_name"] if lm["relation"] != "sibling" else c["father_name"]
    w = {x["field"]: x["weight"] for x in lm["weights"]}
    g = []
    same_place = app["village_lgd"] == c["village_lgd"] or (lm.get("found_via") == "native_village" and _place_level(lm) == "same_village")
    if same_place and (w.get("father_name", 0) > 0 or _names_same(app["father_name"]["en"], cert_father["en"])):
        g.append("same_father_village")
    return g


# ------------------------------------------------------------------ evidence picker (standard review)
CASTE_EVIDENCE = ["record_1950", "school_record", "sarpanch_cert", "family_tree"]
RESIDENCE_EVIDENCE = ["record_1950", "family_tree", "school_record", "sarpanch_cert", "residence_proof", "land_record", "ration_card"]


def evidence_options(app: dict, family_cert_usable: bool) -> dict:
    labels = {d["code"]: d["label"] for d in app["documents"] if d["uploaded"]}
    if not family_cert_usable:
        labels.pop("family_cert", None)
        labels.pop("family_domicile", None)
    caste = [] if app["service"] == "domicile" else [{"code": c, "label": labels[c]} for c in CASTE_EVIDENCE if c in labels]
    res = [{"code": c, "label": labels[c]} for c in RESIDENCE_EVIDENCE if c in labels]
    return {"caste": caste, "residence": res}


def evidence_key(caste: str | None, res: str | None) -> str:
    return f"{caste or ''}|{res or ''}"


# ------------------------------------------------------------------ analysis
def analyse(entry: dict, dispositions: dict | None = None, show_cause: dict | None = None,
            native_village: int | None = None) -> dict:
    """dispositions: {cert_no: {"decision": "same"|"not", "grounds": [...], "note": str, "ts": iso}} (officer's acts).
    Back-compat: a set/list of cert_nos means "same" with no grounds."""
    app, meta = entry["application"], entry["meta"]
    if dispositions is None:
        dispositions = {}
    elif not isinstance(dispositions, dict):
        dispositions = {c: {"decision": "same", "grounds": [], "note": ""} for c in dispositions}
    declared = app.get("declared_relative_cert_no")
    declared_src = app.get("declared_source", "applicant") if declared else None
    service = app["service"]
    all_matches = lineage_matches(app_query(app, meta), service, app["claimed_category"], app["claimed_caste"],
                                  extra=[declared] if declared else None, as_of=app["submitted_at"])
    # Round 7: officer-requested search of the applicant's native (maiden) village as well (absent -> unchanged)
    npl = native_place(native_village)
    if npl is not None:
        nat = lineage_matches(native_query(app_query(app, meta), npl), service, app["claimed_category"], app["claimed_caste"],
                              extra=[declared] if declared else None, as_of=app["submitted_at"])
        all_matches = merge_native(all_matches, nat, npl)
    for lm in all_matches:
        head, sev = validity_headline(lm, app["claimed_category"])
        lm["validity_headline"] = head
        lm["validity_severity"] = sev
        no = lm["certificate"]["cert_no"]
        lm["disposition"] = dispositions.get(no)
        lm["declared"] = declared == no
        lm["kendra_attached"] = declared == no and declared_src == "kendra_search"
        lm["default_grounds"] = default_grounds(app, lm)
    dismissed = [lm for lm in all_matches if (lm["disposition"] or {}).get("decision") == "not"]
    matches = [lm for lm in all_matches if lm not in dismissed]           # records still in play
    confirmed = {no for no, d in dispositions.items() if d.get("decision") == "same"}
    flags = _flags(app, matches, declared)
    attention = [f for f in flags if f["severity"] == "attention"]

    def valid(lm):
        return all(v["ok"] for v in lm["validity"])
    auto = lambda lm: lm["declared"] and declared_src == "applicant" and lm["match_level"] == "exact"
    accepted = [lm for lm in matches if valid(lm) and (lm["certificate"]["cert_no"] in confirmed or auto(lm))]
    pending = [lm for lm in matches if lm["usable_as_evidence"] and lm not in accepted]
    undisposed = [lm for lm in matches if lm["match_level"] == "possible" and not lm["disposition"]]
    fam = accepted[0]["certificate"] if accepted else None
    pend = pending[0]["certificate"] if (pending and not accepted) else None
    bad_decl = next((lm for lm in matches if lm["declared"] and lm["match_level"] == "exact" and not valid(lm)), None)
    unusable_declared = ({"cert": bad_decl["certificate"], "why": bad_decl["validity_headline"]}
                         if bad_decl is not None and bad_decl["validity_headline"] else None)
    items = rules.checklist(app, fam, pend, unusable_declared)
    defs = rules.deficiencies(items, pend)
    refer_code = suggested_refer(app, attention)

    if attention:
        lane, action = "needs_attention", "refer"
        where = REFER_LABEL[refer_code]
        reason = {"en": f"Refer — {where['en']}: " + "; ".join(f["title"]["en"] for f in attention) + ".",
                  "hi": f"संदर्भित करें — {where['hi']}: " + "; ".join(f["title"]["hi"] for f in attention) + "।"}
    elif accepted:
        lane = "records_complete"
        c = accepted[0]["certificate"]
        how_en = "confirmed by you" if c["cert_no"] in confirmed else "declared by the applicant and matched"
        how_hi = "आपके द्वारा पुष्ट" if c["cert_no"] in confirmed else "आवेदक द्वारा घोषित एवं मिलान"
        if defs:
            action = "send_back"
            reason = {"en": "Family record accepted, but a required document is missing: " + " ".join(d["text"]["en"] for d in defs),
                      "hi": "पारिवारिक अभिलेख स्वीकार्य, पर एक आवश्यक दस्तावेज़ कम है: " + " ".join(d["text"]["hi"] for d in defs)}
        else:
            action = "approve"
            reason = {"en": f"{accepted[0]['relation_label']['en']}'s certificate No. {c['cert_no']} is valid ({how_en}); the checklist documents are on file.",
                      "hi": f"{accepted[0]['relation_label']['hi']} का प्रमाण पत्र क्र. {c['cert_no']} मान्य है ({how_hi}); सूची के दस्तावेज़ संलग्न हैं।"}
    else:
        lane = "standard_review"
        if pending:
            c = pending[0]["certificate"]
            action = "approve"
            reason = {"en": f"Likely approvable once you confirm the relationship with the {pending[0]['relation_label']['en'].lower()}'s certificate No. {c['cert_no']}; "
                            f"it then satisfies the caste proof.",
                      "hi": f"{pending[0]['relation_label']['hi']} के प्रमाण पत्र क्र. {c['cert_no']} से संबंध की पुष्टि के बाद संभवतः स्वीकृति योग्य; "
                            f"इससे जाति प्रमाण की पूर्ति हो जाएगी।"}
        elif defs:
            action = "send_back"
            reason = {"en": "Send back for a specific, curable deficiency: " + " ".join(d["text"]["en"] for d in defs),
                      "hi": "स्पष्ट एवं सुधार योग्य कमी हेतु वापस करें: " + " ".join(d["text"]["hi"] for d in defs)}
        else:
            action = "approve"
            reason = {"en": "The checklist documents are on file. Examine them and record which document shows the claim.",
                      "hi": "सूची के दस्तावेज़ संलग्न हैं। उनका परीक्षण कर दर्ज करें कि कौन-सा दस्तावेज़ दावा दर्शाता है।"}
        if pending:
            extra = {"en": f" A matching family certificate (No. {pending[0]['certificate']['cert_no']}) awaits your confirmation.",
                     "hi": f" मेल खाता पारिवारिक प्रमाण पत्र (क्र. {pending[0]['certificate']['cert_no']}) आपकी पुष्टि की प्रतीक्षा में है।"}
        elif not all_matches:
            extra = {"en": " No family record was found — this is neutral.", "hi": " पारिवारिक अभिलेख नहीं मिला — यह तटस्थ है।"}
            if npl is not None:
                extra = {"en": extra["en"] + f" The native (maiden) village {npl['village']['en']} was searched too.",
                         "hi": extra["hi"] + f" मायके / मूल गांव {npl['village']['hi']} में भी खोजा गया।"}
        else:
            extra = {"en": "", "hi": ""}
    lane_reason = dict(LANE_TEXT[lane])
    if lane == "standard_review":
        lane_reason = {k: lane_reason[k] + extra[k] for k in ("en", "hi")}

    info = office_info(app)
    ctx = order_context(app, entry, all_matches, matches, accepted, pending, attention, items, confirmed, dispositions, info)
    evidence_required = not accepted and lane != "needs_attention"
    opts = evidence_options(app, family_cert_usable=bool(accepted)) if evidence_required else {"caste": [], "residence": []}
    if evidence_required and not (opts["residence"] and (opts["caste"] or service == "domicile")):
        evidence_required = False  # nothing to pick: approving needs the officer's written finding instead
        no_evidence = True
    else:
        no_evidence = False

    draft = draft_order(app, action, refer_code=refer_code, evidence=None, defs=defs, **ctx)
    ropts = refer_options(app, attention)
    refer_drafts = {code: draft_order(app, "refer", refer_code=code, evidence=None, **ctx) for code in ropts}
    approve_drafts = {}
    if evidence_required:
        for cz in (opts["caste"] or [None]):
            for rs in opts["residence"]:
                key = evidence_key(cz and cz["code"], rs["code"])
                approve_drafts[key] = draft_order(app, "approve", refer_code=refer_code,
                                                  evidence={"caste": cz, "residence": rs}, **ctx)
        if action == "approve":
            draft = next(iter(approve_drafts.values()))
    drafts = {"approve": None if evidence_required else draft_order(app, "approve", refer_code=refer_code, evidence=None, **ctx)}

    adverse = adverse_records(attention, all_matches)
    sc = public_show_cause(show_cause)
    drafts["show_cause"] = show_cause_draft(app, info, ctx, adverse)
    drafts["reject"] = reject_draft(app, info, ctx, adverse, sc) if (sc and sc.get("reply")) else None

    open_issue = None
    if attention:
        open_issue = {"en": "An attention point is open: " + attention[0]["title"]["en"] + ".",
                      "hi": "एक ध्यान-बिंदु खुला है: " + attention[0]["title"]["hi"] + "।"}
    elif pending:
        open_issue = {"en": "The family relationship is not confirmed — approving on other evidence needs your written finding.",
                      "hi": "पारिवारिक संबंध की पुष्टि नहीं हुई — अन्य साक्ष्य पर स्वीकृति हेतु आपका लिखित निष्कर्ष आवश्यक है।"}
    elif no_evidence and not accepted:
        open_issue = {"en": "No document on file can be picked as proof — approving needs your written finding.",
                      "hi": "कोई संलग्न दस्तावेज़ प्रमाण के रूप में नहीं चुना जा सकता — स्वीकृति हेतु आपका लिखित निष्कर्ष आवश्यक है।"}
    override = {"en": "Your action differs from what the records suggest — record why.",
                "hi": "आपकी कार्यवाही अभिलेखों के सुझाव से भिन्न है — कारण दर्ज करें।"}
    finding_required = {
        "reject": {"en": "A rejection needs your written findings from the records. A missing document is a reason to send back, not to reject.",
                   "hi": "अस्वीकृति हेतु अभिलेखों पर आधारित आपके लिखित निष्कर्ष आवश्यक हैं। दस्तावेज़ की कमी वापस भेजने का कारण है, अस्वीकृति का नहीं।"},
        "send_back": None,  # the ticked reasons are the grounds
        "approve": open_issue or (override if (action != "approve" and not evidence_required) else None),
        # Round 4 (P0-B3): referring is never adverse to the applicant and is offered in "your job" — following it
        # (or choosing it) needs no written finding. Findings are required for approve over an open point and reject.
        "refer": None,
        "show_cause": {"en": "State the grounds on which rejection is proposed; the applicant will answer them.",
                       "hi": "प्रस्तावित अस्वीकृति के आधार लिखें; आवेदक इनका उत्तर देंगे।"},
    }
    summary, rank = evidence_summary(lane, matches, accepted, pending, attention, defs, confirmed, undisposed, bool(all_matches))
    comp = competence(app)
    nstep = next_step(lane, attention, pending, undisposed, defs, evidence_required, obc=service == "caste_obc")
    # Round 6 (P2): one definition of "ready to sign" for the queue, the case page and the sign tray
    ready = (comp["ok"] and lane == "records_complete" and action == "approve" and not attention and not pending
             and not undisposed and not defs and not finding_required["approve"])
    if not comp["ok"]:
        nstep = {"en": "Not your competence — forward to SDO", "hi": "आपकी सक्षमता नहीं — एसडीओ को अग्रेषित करें"}
        summary = {"en": "Permanent caste certificate — competent authority is the SDO (Revenue)",
                   "hi": "स्थायी जाति प्रमाण पत्र — सक्षम प्राधिकारी अनुविभागीय अधिकारी (राजस्व)"}
        rank = -1
    return {
        "app_id": app["app_id"], "lane": lane, "lane_reason": lane_reason,
        "suggested_action": action, "suggested_action_reason": reason,
        "lineage_matches": all_matches, "evidence_rows": entry.get("evidence_rows", []),
        "flags": flags, "checklist": items, "deficiencies": defs, "draft_order": draft,
        "model_version": matcher().model.version, "rules_version": rules.RULES_VERSION, "legal_basis": ctx["basis"],
        # Round 1 additions
        "confirmed_cert_nos": sorted(c for c in confirmed if any(lm["certificate"]["cert_no"] == c for lm in all_matches)),
        "accepted_cert_nos": [lm["certificate"]["cert_no"] for lm in accepted],
        "evidence_summary": summary, "evidence_rank": rank,
        "next_step": nstep,
        "finding_required": finding_required,
        "refer_to": refer_code,
        "refer_options": [{"code": c, "label": REFER_LABEL[c]} for c in ropts],
        "refer_drafts": refer_drafts,
        "sendback_reasons": rules.sendback_library(service, defs),
        # Round 2 additions
        "office": info["office"], "office_info": info,
        "dismissed_cert_nos": [lm["certificate"]["cert_no"] for lm in dismissed],
        "disposition_required": [lm["certificate"]["cert_no"] for lm in undisposed],
        "grounds_catalogue": {"same": [{"code": g, "label": GROUND_LABEL[g]} for g in SAME_GROUNDS],
                              "not": [{"code": g, "label": GROUND_LABEL[g]} for g in NOT_GROUNDS]},
        "evidence_required": evidence_required,
        "evidence_options": opts,
        "approve_drafts": approve_drafts,
        "drafts": drafts,
        "adverse_cert_nos": [a["cert_no"] for a in adverse],
        "show_cause": sc,
        "officer_segments": ctx["officer_segments"],
        "authoritative_lang": "hi",
        # Round 4 additions
        "competence": competence(app),
        "patwari_form": patwari_form(app, matches, entry.get("evidence_rows", [])),
        "policy": {"tehsildar_issued_permanent": rules.tehsildar_policy(), "sla_pause": rules.sla_pause_policy()},
        # Round 6 additions
        "pending_cert_nos": [lm["certificate"]["cert_no"] for lm in pending],
        "ready_to_sign": ready,
        "subdivision": subdivision_of(app),
        "creamy_layer": creamy_layer_info(app),
        "sla_clock": sla_clock(),
        # Round 7 (only when the officer searched the native village; absent otherwise)
        **({"native_village": native_info(npl, all_matches)} if npl is not None else {}),
    }


# ------------------------------------------------------------------ Round 4: competence guard + Patwari request
def competence(app: dict) -> dict:
    """Wrong-authority guard. The routing table (same policy config as the Tehsildar-issued rule): permanent caste
    certificates -> SDO (Revenue); domicile and temporary caste -> Tehsildar."""
    if app["routed_to"] == "tehsildar" and app["service"] != "domicile" and app.get("certificate_kind", "permanent") == "permanent":
        a = rules.PERMANENT_CASTE_AUTHORITY
        sd = SUBDIVISION.get(app["tehsil"]["en"], app["district"])
        return {"ok": False, "forward_to": "sdo",
                "forward_label": {"en": f"{a['en']}, {sd['en']}", "hi": f"{a['hi']}, {sd['hi']}"},
                "message": {"en": f"Not your competence — this is a PERMANENT caste certificate. Competent authority: {a['en']} "
                                  f"(routing table; CG HC Jul 2026). Forward it to the {a['en']}, {sd['en']}.",
                            "hi": f"आपकी सक्षमता नहीं — यह स्थायी जाति प्रमाण पत्र है। सक्षम प्राधिकारी: {a['hi']} "
                                  f"(मार्ग-निर्धारण तालिका; छ.ग. उच्च न्यायालय, जुलाई 2026)। इसे {a['hi']}, {sd['hi']} को अग्रेषित करें।"}}
    return {"ok": True}


def patwari_form(app: dict, matches: list[dict], evidence_rows: list[dict]) -> dict:
    """Pre-filled vanshavali / field-report form for the Halka Patwari (fields of the Patwari report: caste, land,
    income, relation). Rows found in records are tagged; blank rows are for the Kotwar / Sarpanch statements."""
    rel = lambda en, hi: {"en": en, "hi": hi}
    rows = [
        {"name": app["applicant_name"], "relation": rel("Applicant", "आवेदक"), "birth_year": app["birth_year"], "source": "application"},
        {"name": app["father_name"], "relation": rel("Father", "पिता"), "birth_year": None, "source": "application"},
        {"name": app["mother_name"], "relation": rel("Mother", "माता"), "birth_year": None, "source": "application"},
    ]
    for lm in matches:
        c = lm["certificate"]
        cat = f"{c['category']} ({c['caste_name']['en']})" if c.get("category") else "domicile"
        cat_hi = f"{_chi(c['category'])} ({c['caste_name']['hi']})" if c.get("category") else "मूल निवास"
        rows.append({"name": c["holder_name"], "relation": lm["relation_label"], "birth_year": c["birth_year"], "source": "record",
                     "detail": {"en": f"certificate {c['cert_no']} · {cat} · {c['status'].replace('_', ' ')}",
                                "hi": f"प्रमाण पत्र {c['cert_no']} · {cat_hi} · {({'active': 'सक्रिय', 'cancelled': 'निरस्त', 'under_scrutiny': 'जांचाधीन'})[c['status']]}"}})
    for ev in evidence_rows:
        if ev["field"]["en"] == "Head of household":
            rows.append({"name": {k: v.split(" (")[0] for k, v in ev["value"].items()}, "relation": rel("Head of household (ration roster)", "परिवार मुखिया (राशन सूची)"),
                         "birth_year": None, "source": "ration", "detail": {k: v[v.find("(") + 1:-1] if "(" in v else "" for k, v in ev["value"].items()}})
    rows += [{"name": None, "relation": rel("(to be filled by the Patwari)", "(पटवारी द्वारा भरें)"), "birth_year": None, "source": "oral"} for _ in range(2)]
    land = next((ev["value"] for ev in evidence_rows if ev["field"]["en"] in ("Khasra holder", "Land holding")), None)
    rec = next((lm for lm in matches if lm["certificate"].get("category")), None)
    caste_prefill = ({"en": f"Claimed: {app['claimed_category']} ({app['claimed_caste']['en']})" + (f"; archive: {rec['certificate']['category']} ({rec['certificate']['caste_name']['en']}), {rec['relation_label']['en'].lower()}'s certificate" if rec else "; no family record in the archive"),
                      "hi": f"दावा: {_chi(app['claimed_category'])} ({app['claimed_caste']['hi']})" + (f"; अभिलेखागार: {_chi(rec['certificate']['category'])} ({rec['certificate']['caste_name']['hi']}), {rec['relation_label']['hi']} का प्रमाण पत्र" if rec else "; अभिलेखागार में पारिवारिक अभिलेख नहीं")}
                     if app.get("claimed_caste") else {"en": "Domicile: residence in CG", "hi": "मूल निवास: छ.ग. में निवास"})
    fields = [
        {"code": "caste", "label": rel("Caste / tribe recorded for the family", "परिवार की दर्ज जाति / जनजाति"), "prefill": caste_prefill},
        {"code": "land", "label": rel("Land / residence (Bhuiyan)", "भूमि / निवास (भुइयां)"),
         "prefill": land or rel("No holding found in the family's name — verify residence", "परिवार के नाम भूमि नहीं — निवास का सत्यापन करें")},
        {"code": "income", "label": rel("Income (OBC: father's income, preceding year)", "आय (अ.पि.व.: पिता की पिछले वर्ष की आय)"),
         "prefill": (rel("Father's income certificate on file", "पिता का आय प्रमाण पत्र संलग्न") if any(d["code"] == "father_income" and d["uploaded"] for d in app["documents"])
                     else rel("Not on file — report the family's income", "संलग्न नहीं — परिवार की आय प्रतिवेदित करें")) if app["service"] == "caste_obc" else rel("Not required for this service", "इस सेवा हेतु आवश्यक नहीं")},
        {"code": "relation", "label": rel("Relationship of the record holders to the applicant", "अभिलेख धारकों का आवेदक से संबंध"),
         "prefill": rel("; ".join(f"{lm['certificate']['holder_name']['en']} — {lm['relation_label']['en'].lower()}? (verify)" for lm in matches) or "No record holder — build the tree from statements",
                        "; ".join(f"{lm['certificate']['holder_name']['hi']} — {lm['relation_label']['hi']}? (सत्यापित करें)" for lm in matches) or "कोई अभिलेख धारक नहीं — कथनों से वंशवृक्ष बनाएं")},
    ]
    return {"halka": halka(app), "days": PATWARI_DAYS, "report_by": plus_days(PATWARI_DAYS), "rows": rows, "fields": fields,
            "channel": {"en": "Sent to the Patwari app / Bhuiyan (demo)", "hi": "पटवारी ऐप / भुइयां में भेजा गया (डेमो)"}}


def adverse_records(attention: list[dict], matches: list[dict]) -> list[dict]:
    out, seen = [], set()
    by_no = {lm["certificate"]["cert_no"]: lm for lm in matches}
    for f in attention:
        for no in f.get("cert_nos") or []:
            if no in seen or no not in by_no:
                continue
            seen.add(no)
            out.append({"cert_no": no, "line": f.get("order_point") or _cert_line(by_no[no])})
    return out


def public_show_cause(sc: dict | None) -> dict | None:
    if not sc:
        return None
    return {k: v for k, v in sc.items() if k != "text"}


# ------------------------------------------------------------------ order composition
def order_context(app, entry, all_matches, matches, accepted, pending, attention, items, confirmed, dispositions, info) -> dict:
    """Everything an order needs, split into system facts and the officer's own acts."""
    service = app["service"]
    cat = app["claimed_category"]
    up = [d for d in app["documents"] if d["uploaded"]]
    have = {d["code"] for d in up}
    officer_segments: list[dict] = []

    # legal basis: cite only what the order actually relies on
    authority_issue = any(not next(v for v in lm["validity"] if v["code"] == "competent_authority")["ok"]
                          for lm in matches if lm["match_level"] == "exact")
    if service == "domicile":
        basis = [rules.DOMICILE_BASIS]
    else:
        basis = [rules.ACT_BASIS, rules.ACT_S4, rules.RULE_3_3_DOCS]
        if accepted or pending:
            basis.append(rules.RULE_3_3)
        if service == "caste_obc":
            basis.append(rules.RULE_3_3_OBC)
        if authority_issue:
            basis.append(rules.HC_BASIS)

    records = []
    for lm in accepted:
        records.append(_cert_line(lm))
    for lm in pending[:1]:
        records.append(_cert_line(lm, " — subject to the officer's confirmation of the relationship",
                                  " — अधिकारी द्वारा संबंध की पुष्टि के अधीन"))
    if up:
        records.append({"en": f"Application {app['app_id']}: documents on file — " + ", ".join(d["label"]["en"] for d in up),
                        "hi": f"आवेदन {app['app_id']}: संलग्न दस्तावेज़ — " + ", ".join(d["label"]["hi"] for d in up)})

    # every record shown to the officer and not relied upon, with the reason
    considered = []
    for lm in all_matches:
        if lm in accepted or lm in pending[:1]:
            continue
        d = lm.get("disposition") or {}
        if d.get("decision") == "not":
            g = grounds_text(d, app, lm)
            seg = {"en": f"the undersigned found that the holder is not a member of the applicant's family: {g['en']}",
                   "hi": f"अधोहस्ताक्षरी ने पाया कि धारक आवेदक के परिवार के सदस्य नहीं हैं: {g['hi']}"}
            officer_segments.append(seg)
            considered.append(_cert_line(lm, f" — considered and not relied upon: {seg['en']}",
                                         f" — विचार किया गया, आधार नहीं: {seg['hi']}"))
        elif d.get("decision") == "same":
            why = lm.get("validity_headline") or {"en": "not required for the decision", "hi": "निर्णय हेतु आवश्यक नहीं"}
            g = grounds_text(d, app, lm)
            seg = {"en": f"the undersigned accepts that the holder is the applicant's {lm['relation_label']['en'].lower()} ({g['en'] or 'officer’s satisfaction'})",
                   "hi": f"अधोहस्ताक्षरी स्वीकार करते हैं कि धारक आवेदक के {lm['relation_label']['hi']} हैं ({g['hi'] or 'अधिकारी का समाधान'})"}
            officer_segments.append(seg)
            considered.append(_cert_line(lm, f" — {seg['en']}, but it is not relied upon: {_strip_mock(why['en'])}",
                                         f" — {seg['hi']}, परंतु इस पर आधार नहीं लिया गया: {_strip_mock(why['hi'])}"))
        elif lm["match_level"] == "possible":
            considered.append(_cert_line(lm, " — possible link only; not relied upon (not examined further)",
                                         " — केवल संभावित कड़ी; आधार नहीं (आगे परीक्षण नहीं)"))
        else:
            why = lm.get("validity_headline") or {"en": "not relied upon", "hi": "आधार नहीं"}
            considered.append(_cert_line(lm, f" — not relied upon: {why['en']}", f" — आधार नहीं: {why['hi']}"))
    for ev in entry.get("evidence_rows", []):
        if ev["status"] == "ok":
            considered.append({"en": _strip_mock(f"{ev['source']['en']}: {ev['field']['en']} — {ev['value']['en']} (registry extract; corroborative only)"),
                               "hi": _strip_mock(f"{ev['source']['hi']}: {ev['field']['hi']} — {ev['value']['hi']} (पंजी उद्धरण; केवल पुष्टिकारक)")})

    # facts from the records (system text)
    facts = []
    for lm in accepted[:1]:
        c = lm["certificate"]
        cw = _cat_words(c["category"])
        facts.append({"en": f"Certificate No. {c['cert_no']} is a {c['cert_type']} certificate issued by {c['issuing_authority']['en']} on {dmy(c['issue_date'])}; "
                            f"status in the archive: active; QR / e-sign verified (simulated)"
                            + (f"; it records {cw['en']} ({c['caste_name']['en']}), the same entry as claimed." if c.get("category") else "."),
                      "hi": f"प्रमाण पत्र क्र. {c['cert_no']} {c['issuing_authority']['hi']} द्वारा {dmy(c['issue_date'])} को जारी "
                            f"{'स्थायी' if c['cert_type'] == 'permanent' else 'अस्थायी'} प्रमाण पत्र है; अभिलेखागार में स्थिति: सक्रिय; क्यूआर / ई-हस्ताक्षर सत्यापित (अनुकरण)"
                            + (f"; इसमें {cw['hi']} ({c['caste_name']['hi']}) दर्ज है, जो दावे के समान प्रविष्टि है।" if c.get("category") else "।")})
        if next((v for v in lm["validity"] if v["code"] == "competent_authority"), {}).get("severity") == "note":
            facts.append({"en": f"Issuer: Tehsildar ({c['issue_date'][:4]}); valid per policy setting, Revenue Dept. guidance pending (CG HC, 22-07-2026).",
                          "hi": f"जारीकर्ता: तहसीलदार ({c['issue_date'][:4]}); नीति-सेटिंग अनुसार मान्य, राजस्व विभाग के निर्देश लंबित (छ.ग. उ.न्या., 22-07-2026)।"})
        cert_father = c["holder_name"] if lm["relation"] != "sibling" else c["father_name"]
        if not _names_same(app["father_name"]["en"], cert_father["en"]):
            a_hi, c_hi = _hi_pair(app["father_name"], cert_father)
            facts.append({"en": f"Father's name in the application: '{app['father_name']['en']}'; in the certificate: '{cert_father['en']}'.",
                          "hi": f"आवेदन में पिता का नाम: {a_hi}; प्रमाण पत्र में: {c_hi}।"})
    if service != "domicile":
        facts.append({"en": "Patwari family tree of three generations (Rule 3(3)): " + ("on file." if "family_tree" in have else "not on file."),
                      "hi": "पटवारी द्वारा तीन पीढ़ी का वंशवृक्ष (नियम 3(3)): " + ("संलग्न।" if "family_tree" in have else "संलग्न नहीं।")})
    if service == "caste_obc":
        facts.append({"en": "Father's income certificate for the preceding year (Rule 3(3), OBC): " + ("on file." if "father_income" in have else "not on file."),
                      "hi": "पिता का पिछले वर्ष का आय प्रमाण पत्र (नियम 3(3), अ.पि.व.): " + ("संलग्न।" if "father_income" in have else "संलग्न नहीं।")})
    missing = [i for i in items if i["required"] and not i["present"]]
    facts.append({"en": "Documents required on the Sewa Setu checklist: " + ("all on file." if not missing else "not on file — " + ", ".join(i["label"]["en"] for i in missing) + "."),
                  "hi": "सेवा सेतु सूची के आवश्यक दस्तावेज़: " + ("सभी संलग्न।" if not missing else "संलग्न नहीं — " + ", ".join(i["label"]["hi"] for i in missing) + "।")})

    # satisfaction of the undersigned (the officer's act)
    satisfaction = None
    if accepted:
        lm = accepted[0]
        c = lm["certificate"]
        rel_en, rel_hi = lm["relation_label"]["en"].lower(), lm["relation_label"]["hi"]
        cw = _cat_words(app["claimed_category"])
        claim_en = f"{cw['en']} ({app['claimed_caste']['en']})" if app.get("claimed_caste") else cw["en"]
        claim_hi = f"{cw['hi']} ({app['claimed_caste']['hi']})" if app.get("claimed_caste") else cw["hi"]
        d = lm.get("disposition") or {}
        if c["cert_no"] in confirmed:
            g = grounds_text(d, app, lm)
            seg = {"en": f"the holder of certificate No. {c['cert_no']}, {c['holder_name']['en']}, is the applicant's {rel_en}, on the following grounds recorded on {dmy((d.get('ts') or today_iso()))}: "
                         f"{g['en'] or 'the particulars compared above'}",
                   "hi": f"प्रमाण पत्र क्र. {c['cert_no']} के धारक {c['holder_name']['hi']} आवेदक के {rel_hi} हैं; {dmy((d.get('ts') or today_iso()))} को दर्ज आधार: "
                         f"{g['hi'] or 'ऊपर तुलना किए गए विवरण'}"}
            officer_segments.append(seg)
        else:
            aff_en = "self-declaration affidavit on file" if service == "domicile" else "affidavit in Form 2A on file"
            aff_hi = "स्वघोषणा शपथ पत्र संलग्न" if service == "domicile" else "फॉर्म 2A शपथ पत्र संलग्न"
            seg = {"en": f"the holder of certificate No. {c['cert_no']}, {c['holder_name']['en']}, is the applicant's {rel_en}, as declared by the applicant "
                         f"({aff_en}), the particulars of the certificate agreeing with the application",
                   "hi": f"प्रमाण पत्र क्र. {c['cert_no']} के धारक {c['holder_name']['hi']} आवेदक के {rel_hi} हैं, जैसा कि आवेदक ने घोषित किया है "
                         f"({aff_hi}), तथा प्रमाण पत्र के विवरण आवेदन से मेल खाते हैं"}
        if service == "domicile":
            satisfaction = {"en": f"The undersigned is satisfied that {seg['en']}; and that the family's residence in Chhattisgarh is established by the said domicile certificate.",
                            "hi": f"अधोहस्ताक्षरी का समाधान है कि {seg['hi']}; तथा उक्त मूल निवास प्रमाण पत्र से परिवार का छत्तीसगढ़ में निवास स्थापित होता है।"}
        else:
            satisfaction = {"en": f"The undersigned is satisfied that {seg['en']}; and, the relative's certificate being acceptable evidence under Rule 3(3), that the applicant belongs to {claim_en}.",
                            "hi": f"अधोहस्ताक्षरी का समाधान है कि {seg['hi']}; तथा, नियम 3(3) के अंतर्गत संबंधी का प्रमाण पत्र मान्य साक्ष्य होने से, आवेदक {claim_hi} वर्ग के हैं।"}
    return {"records": records, "considered": considered, "basis": basis, "facts": facts, "satisfaction": satisfaction,
            "flags": attention, "office": info, "officer_segments": officer_segments}


def evidence_satisfaction(app: dict, evidence: dict) -> dict:
    cz, rs = evidence.get("caste"), evidence["residence"]
    cut = rules.CUTOFF.get(app["claimed_category"] or "", "")
    if app["service"] == "domicile":
        return {"en": f"The undersigned has examined the documents on file and is satisfied that the applicant's residence in Chhattisgarh is shown by: {rs['label']['en']}.",
                "hi": f"अधोहस्ताक्षरी ने संलग्न दस्तावेज़ों का परीक्षण किया है तथा समाधान है कि आवेदक का छत्तीसगढ़ में निवास इससे प्रदर्शित होता है: {rs['label']['hi']}।"}
    cw = _cat_words(app["claimed_category"])
    claim_en = f"{cw['en']} ({app['claimed_caste']['en']})" if app.get("claimed_caste") else cw["en"]
    claim_hi = f"{cw['hi']} ({app['claimed_caste']['hi']})" if app.get("claimed_caste") else cw["hi"]
    return {"en": f"The undersigned has examined the documents on file and is satisfied that the applicant's claim to belong to {claim_en} is shown by: {cz['label']['en']}; "
                  f"and that the family's residence before {cut} is shown by: {rs['label']['en']}.",
            "hi": f"अधोहस्ताक्षरी ने संलग्न दस्तावेज़ों का परीक्षण किया है तथा समाधान है कि आवेदक का {claim_hi} वर्ग का दावा इससे प्रदर्शित होता है: {cz['label']['hi']}; "
                  f"तथा {cut} से पूर्व परिवार का निवास इससे प्रदर्शित होता है: {rs['label']['hi']}।"}


def grant_text(app: dict) -> dict:
    if app["service"] == "domicile":
        return {"en": "a domicile (Mool Niwasi) certificate", "hi": "मूल निवास प्रमाण पत्र"}
    caste = app.get("claimed_caste") or {"en": "", "hi": ""}
    cw = _cat_words(app["claimed_category"])
    return {"en": f"a permanent {cw['en']} ({app['claimed_category']}) caste certificate — {caste['en']}",
            "hi": f"स्थायी {cw['hi']} प्रमाण पत्र — {caste['hi']}"}


def _common(app: dict, info: dict) -> dict:
    rel_word = {"en": "son of", "hi": "पुत्र"} if app["gender"] == "M" else {"en": "daughter of", "hi": "पुत्री"}
    return {"app": app, "office": info["office"], "place": info["place"], "rel_word": rel_word,
            "received": dmy(app["submitted_at"]), "today": today_str()}


def draft_order(app: dict, action: str, *, records: list[dict], considered: list[dict], basis: list[dict],
                facts: list[dict], satisfaction: dict | None, flags: list[dict], office: dict,
                officer_segments: list, refer_code: str = "scrutiny_committee", evidence: dict | None = None,
                defs: list[dict] | None = None) -> dict:
    ctx = _common(app, office)
    if action == "approve":
        sat = satisfaction
        if evidence:
            sat = evidence_satisfaction(app, evidence)
        if sat is None:
            sat = {"en": "The undersigned has examined the documents on file and is satisfied that the claim is established, for the reasons recorded below.",
                   "hi": "अधोहस्ताक्षरी ने संलग्न दस्तावेज़ों का परीक्षण किया है तथा नीचे दर्ज कारणों से समाधान है कि दावा स्थापित है।"}
        return render_pair("order_approve", **ctx, records=records, considered=considered, basis=basis, facts=facts,
                           satisfaction=sat, grant=grant_text(app),
                           creamy=CREAMY_PLACEHOLDER if app["service"] == "caste_obc" else None)
    if action == "refer":
        points = [f.get("order_point") or f["title"] for f in flags]
        cut = rules.CUTOFF.get(app["claimed_category"] or "", "")
        return render_pair("order_refer", **ctx, records=records, considered=considered, basis=basis + ([rules.RULE_7_8] if refer_code == "patwari" and app["service"] != "domicile" else []),
                           points=points, refer_code=refer_code, refer_to=refer_target(app, refer_code),
                           report_by=plus_days(7), cutoff=cut, domicile=app["service"] == "domicile")
    if action == "send_back":
        return render_pair("order_send_back", **ctx, deficiencies=defs or [], reply_by=plus_days(30))
    raise ValueError(action)


def show_cause_draft(app: dict, info: dict, ctx: dict, adverse: list[dict]) -> dict:
    c = _common(app, info)
    basis = [rules.ACT_BASIS, rules.ACT_S4, rules.ACT_S15] if app["service"] != "domicile" else [rules.DOMICILE_BASIS]
    return render_pair("order_show_cause", **c, adverse=[a["line"] for a in adverse], records=ctx["records"], basis=basis,
                       days=rules.SHOW_CAUSE_DAYS, reply_by=plus_days(rules.SHOW_CAUSE_DAYS), service=app["service_label"])


def reject_draft(app: dict, info: dict, ctx: dict, adverse: list[dict], sc: dict) -> dict:
    c = _common(app, info)
    if app["service"] != "domicile":
        basis = [rules.ACT_BASIS, rules.ACT_S4, rules.ACT_S15, rules.ACT_S5]
    else:
        basis = [rules.DOMICILE_BASIS]
    reply = sc["reply"]
    if reply["outcome"] == "reply_received":
        rec = {"en": f"Pre-rejection hearing notice No. {sc['no']} dated {sc['date']} was issued to the applicant, allowing {rules.SHOW_CAUSE_DAYS} days to reply. "
                     f"A reply was received on {reply['date']}" + (f": \"{reply['summary']}\"" if reply.get("summary") else "") + ". The reply has been considered.",
               "hi": f"आवेदक को पूर्व-अस्वीकृति सुनवाई सूचना क्र. {sc['no']} दिनांक {sc['date']} जारी कर {rules.SHOW_CAUSE_DAYS} दिन में उत्तर का अवसर दिया गया। "
                     f"दिनांक {reply['date']} को उत्तर प्राप्त हुआ" + (f": \"{reply['summary']}\"" if reply.get("summary") else "") + "। उत्तर पर विचार किया गया।"}
    else:
        # Round 5 (P1-3): the order is dated today, so it must not assert a future date as past. The lapse of the
        # hearing period is a demo simulation and is said so.
        rec = {"en": f"Pre-rejection hearing notice No. {sc['no']} dated {sc['date']} was issued to the applicant, allowing {rules.SHOW_CAUSE_DAYS} days to reply. "
                     f"On the expiry of the hearing period no reply was received (demo simulation: time advanced to the end of the period).",
               "hi": f"आवेदक को पूर्व-अस्वीकृति सुनवाई सूचना क्र. {sc['no']} दिनांक {sc['date']} जारी कर {rules.SHOW_CAUSE_DAYS} दिन में उत्तर का अवसर दिया गया। "
                     f"सुनवाई की अवधि समाप्त होने पर कोई उत्तर प्राप्त नहीं हुआ (डेमो अनुकरण: समय अवधि के अंत तक आगे बढ़ाया गया)।"}
    relied = [a["line"] for a in adverse] + [r for r in ctx["records"] if r["en"].startswith("Application ")]
    return render_pair("order_reject", **c, relied=relied, considered=ctx["considered"] if not adverse else
                       [x for x in ctx["considered"] if not any(a["cert_no"] in x["en"] for a in adverse)],
                       basis=basis, hearing=rec, appellate=rules.APPELLATE, caste=app["service"] != "domicile")


# ------------------------------------------------------------------ finalising a signed document
DRAFT_HEAD_RE = re.compile(r"^(DRAFT|REFERENCE —|PRE-REJECTION NOTICE \(OPPORTUNITY OF HEARING\) —|आदेश का प्रारूप|संदर्भ —|पूर्व-अस्वीकृति सूचना \(सुनवाई का अवसर\) का प्रारूप).*$")
KIND_TITLE = {
    "order": {"en": "ORDER (English translation, for reference; the Hindi text is authoritative)", "hi": "आदेश"},
    "reference": {"en": "REFERENCE (English translation, for reference; the Hindi text is authoritative)", "hi": "संदर्भ पत्र"},
    "notice": {"en": "NOTICE TO THE APPLICANT (English translation; the Hindi text is authoritative)", "hi": "आवेदक को सूचना"},
    "show_cause": {"en": "PRE-REJECTION NOTICE — OPPORTUNITY OF HEARING (English translation; the Hindi text is authoritative)", "hi": "पूर्व-अस्वीकृति सूचना (सुनवाई का अवसर)"},
}
NO_LABEL = {"order": ("Order No.", "आदेश क्र."), "reference": ("Reference No.", "संदर्भ क्र."),
            "notice": ("Notice No.", "सूचना क्र."), "show_cause": ("Notice No.", "सूचना क्र.")}


def finalise(text: dict, kind: str, number: str, info: dict, signed_at: datetime) -> dict:
    """The text that is issued: draft header removed; title, number, date and place stamped; signature line."""
    out = {}
    date_s = signed_at.strftime("%d-%m-%Y")
    for lang in ("en", "hi"):
        lines = (text.get(lang) or "").strip("\n").split("\n")
        if lines and (DRAFT_HEAD_RE.match(lines[0].strip()) or lines[0].strip().startswith(("NOTICE TO THE APPLICANT", "आवेदक को सूचना"))):
            lines = lines[1:]
        body = "\n".join(lines).strip("\n")
        # Round 5: signing is with Sewa Setu's existing DSC token (the older "(e-signature)" placeholders are still accepted)
        en_sig = f"DSC-signed (demo) on {date_s} at {signed_at.strftime('%H:%M')} IST"
        hi_sig = f"DSC-हस्ताक्षरित (डेमो) दिनांक {date_s}, {signed_at.strftime('%H:%M')} बजे"
        body = body.replace("(digital signature — DSC)", en_sig).replace("(e-signature)", en_sig)
        body = body.replace("(डिजिटल हस्ताक्षर — DSC)", hi_sig).replace("(ई-हस्ताक्षर)", hi_sig)
        lbl = NO_LABEL[kind][0 if lang == "en" else 1]
        head = (f"{KIND_TITLE[kind][lang]}\n{lbl} {number}    {'Date' if lang == 'en' else 'दिनांक'}: {date_s}    "
                f"{'Place' if lang == 'en' else 'स्थान'}: {info['place'][lang]}")
        if lang == "hi" and kind in ("order", "reference", "show_cause"):
            head += "\n(प्रामाणिक पाठ: हिंदी)"
        out[lang] = head + "\n\n" + body
    return out


def sha(text: dict) -> str:
    return hashlib.sha256(json.dumps(text, ensure_ascii=False, sort_keys=True).encode()).hexdigest()


# ------------------------------------------------------------------ Kendra pre-check
def resolve_villages(body: dict) -> list[dict]:
    """Village from the LGD code, or by name within the district. LGD has many repeated
    village names in one district (e.g. two 'Kongera' in Kondagaon), so a typed name can
    resolve to several villages; the matcher then tries each one."""
    vs = geo.villages()
    if body.get("village_lgd") and int(body["village_lgd"]) in vs:
        return [vs[int(body["village_lgd"])]]
    name = (body.get("village_name") or "").strip()
    if not name:
        return []
    pool = [v for v in vs.values() if not body.get("district_lgd") or v["district_lgd"] == int(body["district_lgd"])]
    exact = [v for v in pool if name.lower() == v["name_en"].lower() or name == v["name_hi"]]
    if exact:
        return exact[:5]
    best = process.extractOne(name.lower(), {v["lgd"]: v["name_en"].lower() for v in pool}, scorer=fuzz.WRatio)
    if best and best[1] >= 88:
        return [vs[best[2]]]
    return []


def precheck(body: dict) -> dict:
    service = body["service"]
    candidates = resolve_villages(body) or [None]
    extra = [body["relative_cert_no"]] if body.get("relative_cert_no") else None
    cat = claimed_category(service, body.get("claimed_category"))
    best: dict[str, dict] = {}
    for v in candidates:
        district = v["district_lgd"] if v else body.get("district_lgd")
        query = {
            "father_raw": body.get("father_name") or "", "applicant_raw": body.get("applicant_name") or "",
            "birth_year": body.get("birth_year"), "village_lgd": v["lgd"] if v else None,
            "tehsil_lgd": v["tehsil_lgd"] if v else None, "district_lgd": int(district) if district else None,
            "village_name": {"en": v["name_en"], "hi": v["name_hi"]} if v else None,
        }
        for lm in lineage_matches(query, service, cat, None, extra=extra):
            no = lm["certificate"]["cert_no"]
            if no not in best or lm["match_probability"] > best[no]["match_probability"]:
                best[no] = lm
    matches = sorted(best.values(), key=lambda lm: -lm["match_probability"])[:5]
    # Round 7: optional native (maiden) village — searched as well; merged and de-duplicated, labelled found_via
    npl = native_place(body.get("native_village_lgd"))
    if npl is not None:
        query = {"father_raw": body.get("father_name") or "", "applicant_raw": body.get("applicant_name") or "",
                 "birth_year": body.get("birth_year")}
        nat = lineage_matches(native_query(query, npl), service, cat, None, extra=extra)
        matches = merge_native(matches, nat, npl)[:5]
    usable = [lm for lm in matches if lm["usable_as_evidence"]]
    items = rules.precheck_checklist(service, usable[0]["certificate"] if usable else None)
    if usable:
        c = usable[0]["certificate"]
        summary = {"en": f"✔ Matching family certificate found: {usable[0]['relation_label']['en']}'s certificate No. {c['cert_no']} "
                         f"({c['issuing_authority']['en']}, {c['issue_date'][:4]}). Model link: {_strength(usable[0])['en']}.",
                   "hi": f"✔ मेल खाता पारिवारिक प्रमाण पत्र मिला: {usable[0]['relation_label']['hi']} का प्रमाण पत्र क्र. {c['cert_no']} "
                         f"({c['issuing_authority']['hi']}, {c['issue_date'][:4]})। मॉडल कड़ी: {_strength(usable[0])['hi']}।"}
        if usable[0].get("found_via") == "native_village":
            summary = {"en": summary["en"] + f" Found through the native (maiden) village {npl['village']['en']} ({npl['district']['en']}).",
                       "hi": summary["hi"] + f" मायके / मूल गांव {npl['village']['hi']} ({npl['district']['hi']}) की खोज से मिला।"}
        suggestion = {"en": f"If the applicant confirms it is their relative's, attach certificate No. {c['cert_no']} as a Kendra search result (with the applicant's consent). "
                            f"The officer must still confirm the relationship. Also attach the affidavit and identity proof.",
                      "hi": f"आवेदक द्वारा संबंधी का होने की पुष्टि पर, प्रमाण पत्र क्र. {c['cert_no']} को केंद्र खोज परिणाम के रूप में संलग्न करें (आवेदक की सहमति से)। "
                            f"अधिकारी को फिर भी संबंध की पुष्टि करनी होगी। शपथ पत्र और पहचान प्रमाण भी संलग्न करें।"}
    elif matches:
        c = matches[0]["certificate"]
        summary = {"en": f"A possible family certificate was found (No. {c['cert_no']}), but it cannot be used as it is — check the details with the applicant.",
                   "hi": f"एक संभावित पारिवारिक प्रमाण पत्र मिला (क्र. {c['cert_no']}), पर इसे सीधे उपयोग नहीं किया जा सकता — आवेदक से विवरण जांचें।"}
        suggestion = {"en": "If it is the applicant's relative and the certificate is valid, attach it; otherwise attach one of the documents in the checklist.",
                      "hi": "यदि यह आवेदक के संबंधी का है और प्रमाण पत्र मान्य है तो संलग्न करें; अन्यथा सूची का कोई एक दस्तावेज़ संलग्न करें।"}
    else:
        summary = {"en": "No family certificate was found in the archive. This is common and does not affect eligibility.",
                   "hi": "अभिलेखागार में पारिवारिक प्रमाण पत्र नहीं मिला। यह सामान्य है और पात्रता को प्रभावित नहीं करता।"}
        suggestion = {"en": "Attach the documents in the checklist below before paying the fee. For caste proof, any ONE document is enough.",
                      "hi": "शुल्क जमा करने से पहले नीचे दी गई सूची के दस्तावेज़ संलग्न करें। जाति प्रमाण के लिए कोई एक दस्तावेज़ पर्याप्त है।"}
        if npl is not None:
            summary = {"en": summary["en"] + f" The native (maiden) village {npl['village']['en']} was searched too.",
                       "hi": summary["hi"] + f" मायके / मूल गांव {npl['village']['hi']} में भी खोजा गया।"}
    return {"matches": matches, "checklist": items, "summary": summary, "suggestion": suggestion}
