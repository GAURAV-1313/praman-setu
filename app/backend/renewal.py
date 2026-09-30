"""Round 8b: a second service on the same evidence engine — PROACTIVE INCOME-CERTIFICATE RENEWAL. SYNTHETIC.

Isolated on purpose: rules.py / engine.py (caste and domicile) are not touched. This module has its own synthetic
income-certificate archive, its own mock evidence (last year's certificate, Khadya ration category, Bhuiyan land
holding), its own rule file (data/rules/income_certificate.starter.jdm.json, placeholder thresholds) and its own
templates (templates/renewal_nudge.*.j2), and reuses only the citizen-message entity checker.

Why: income certificates are valid for one year in Chhattisgarh and are 49% of Sewa Setu's volume (REAL public MIS,
fetched 27-09-2026). Last year's record already holds almost everything a renewal needs.

Safeguards: nothing is auto-issued. A renewal is only PRE-FILLED; the citizen must still confirm at the Kendra that the
family income is unchanged (if it changed, a normal application with a new affidavit), and the Tehsildar still
examines and decides. Deterministic: the income archive is derived from the synthetic population by hashing
person ids; the expiry dates are relative to today so the 30/60-day windows always have files in them.
"""
from __future__ import annotations

import copy
import csv
import hashlib
import json
import re
from datetime import date, datetime, timedelta, timezone
from functools import lru_cache

import geo
import mis
from messages import check_entities, render_pair

IST = timezone(timedelta(hours=5, minutes=30))
RULE_FILE = geo.DATA / "rules" / "income_certificate.starter.jdm.json"
SELECT_MOD = 100         # ~1 in 100 adults holds an income certificate issued 10-12 months ago (synthetic)
MAX_DAYS = 90            # expiries spread over the next 90 days; the list shows 30 / 60-day windows
HERO_PID = 17544         # Ramlal Markam, Bayanar — father of Sunita (08812), whose scholarship also needs it
HERO_DAYS = 12
DEMO_DISTRICTS = [643, 374, 387, 734, 650]   # districts with synthetic population (Kondagaon first)

RATION = {
    "AAY": {"en": "AAY (Antyodaya)", "hi": "अंत्योदय (AAY)"},
    "PHH": {"en": "PHH (priority household)", "hi": "प्राथमिकता परिवार (PHH)"},
    "APL": {"en": "APL (general)", "hi": "सामान्य (APL)"},
}
SOURCES = {"en": "Agriculture and wage labour", "hi": "खेती एवं मज़दूरी"}
STRENGTH_LABEL = {
    "strong": {"en": "Strong: 3/3 sources as last year", "hi": "मज़बूत: 3/3 स्रोत पिछले वर्ष जैसे"},
    "partial": {"en": "Partial: a source changed", "hi": "आंशिक: एक स्रोत बदला"},
    "verify": {"en": "Verify: rule-file flag", "hi": "जांचें: नियम-फ़ाइल संकेत"},
}
RULE_FLAG_LABEL = {
    "LOW_INCOME_BUT_LARGE_LANDHOLDING": {"en": "Low income but a large land holding (rule file; placeholder thresholds)",
                                         "hi": "कम आय पर अधिक भूमि (नियम फ़ाइल; सांकेतिक सीमाएँ)"},
    "INCOME_ABOVE_EWS_THRESHOLD": {"en": "Income above the rule file's threshold (placeholder)",
                                   "hi": "आय नियम फ़ाइल की सीमा से अधिक (सांकेतिक)"},
}
SRC = {
    "archive": {"en": "Sewa Setu archive: last year's income certificate", "hi": "सेवा सेतु अभिलेखागार: पिछले वर्ष का आय प्रमाण पत्र"},
    "khadya": {"en": "Khadya ration roster (mock)", "hi": "खाद्य राशन सूची (नमूना)"},
    "bhuiyan": {"en": "Bhuiyan land record (mock)", "hi": "भुइयां भू-अभिलेख (नमूना)"},
}
SERVICE_LABEL = {"en": "Income certificate: renewal", "hi": "आय प्रमाण पत्र: नवीनीकरण"}
ROADMAP = [
    {"code": "legal_heir", "label": {"en": "Legal heir certificate (वारिस)", "hi": "वारिस (उत्तराधिकार) प्रमाण पत्र"},
     "note": {"en": "Family tree from the archive + death record; same same-family / not-this-family step",
              "hi": "अभिलेखागार से वंशावली + मृत्यु अभिलेख; वही “एक ही परिवार / यह परिवार नहीं” चरण"}},
    {"code": "ews", "label": {"en": "EWS certificate", "hi": "ईडब्ल्यूएस (EWS) प्रमाण पत्र"},
     "note": {"en": "Income + land + residence evidence; a rule file for the thresholds",
              "hi": "आय + भूमि + निवास साक्ष्य; सीमाओं हेतु एक नियम फ़ाइल"}},
]

_prefilled: dict[str, dict] = {}   # cert_no -> renewal record (demo state; cleared by POST /api/reset)
_seq: dict[str, int] = {}


def reset() -> None:
    _prefilled.clear()
    _seq.clear()


def today() -> date:
    return datetime.now(IST).date()


def _h(*parts) -> int:
    return int(hashlib.sha1(":".join(map(str, parts)).encode()).hexdigest(), 16)


def rupees(n: int) -> str:
    s = str(n)
    if len(s) <= 3:
        return "₹" + s
    head, tail = s[:-3], s[-3:]
    head = re.sub(r"(\d)(?=(\d\d)+$)", r"\1,", head)
    return f"₹{head},{tail}"


def dmy(d: date) -> str:
    return d.strftime("%d-%m-%Y")


# ------------------------------------------------------------------ rule file (GoRules JDM decision table, starter)
@lru_cache(maxsize=1)
def rule_table() -> dict:
    jdm = json.loads(RULE_FILE.read_text(encoding="utf-8"))
    return next(n for n in jdm["nodes"] if n["type"] == "decisionTableNode")


_EXPR = re.compile(r"^\s*(>=|<=|>|<|==)?\s*(-?\d+(?:\.\d+)?)\s*$")


def _test(expr: str, value: float) -> bool:
    if not expr.strip():
        return True
    m = _EXPR.match(expr)
    if not m:
        return False
    op, num = m.group(1) or "==", float(m.group(2))
    return {">": value > num, "<": value < num, ">=": value >= num, "<=": value <= num, "==": value == num}[op]


def rule_flags(inputs: dict) -> list[str]:
    """Evaluate the starter decision table (hit policy "collect"): every matching row's output."""
    t = rule_table()["content"]
    fields = {i["id"]: i["field"] for i in t["inputs"]}
    out_id = t["outputs"][0]["id"]
    flags = []
    for r in t["rules"]:
        if all(_test(r.get(iid, ""), float(inputs.get(f, 0))) for iid, f in fields.items()):
            flags.append(r[out_id].strip('"'))
    return flags


# ------------------------------------------------------------------ synthetic income-certificate archive
def _mock_household(pid: int) -> dict:
    """Deterministic mock registry state for one family: ration category, land (ha), income; at issue and now."""
    h = _h("income-hh", pid)
    ration = ["AAY", "PHH", "PHH", "PHH", "APL", "APL"][h % 6]
    if ration == "AAY":
        land, income = [0.0, 0.2, 0.4][(h >> 4) % 3], 18000 + 1000 * ((h >> 8) % 18)
    elif ration == "PHH":
        land, income = [0.4, 0.8, 1.2, 1.6][(h >> 4) % 4], 36000 + 1000 * ((h >> 8) % 60)
    else:
        land, income = [1.0, 1.6, 2.2, 3.0][(h >> 4) % 4], 120000 + 5000 * ((h >> 8) % 24)
    change = (h >> 16) % 10
    now_ration, now_land = ration, land
    if change == 0 and ration != "APL":           # ration category changed since last year
        now_ration = "PHH" if ration == "AAY" else "APL"
    elif change == 1:                              # land holding increased since last year
        now_land = round(land + 1.5, 1)
    elif change == 2 and ration != "APL":          # the rule file's low-income / large-land pattern
        land = now_land = 2.4
        income = 26000
    return {"ration": ration, "land_ha": land, "income": income, "now_ration": now_ration, "now_land_ha": now_land}


@lru_cache(maxsize=4)
def _archive(as_of: str) -> list[dict]:
    t = date.fromisoformat(as_of)
    villages = geo.villages()
    dist = geo.districts()
    rows = list(csv.DictReader(open(geo.SYN / "population.csv", encoding="utf-8")))
    chosen: dict[int, dict] = {}
    for r in rows:
        pid = int(r["pid"])
        v = villages.get(int(r["village_lgd"]))
        if not v or v["district_lgd"] not in DEMO_DISTRICTS:
            continue
        age = t.year - int(r["birth_year"])
        if not (25 <= age <= 65):
            continue
        if pid != HERO_PID and _h("income-sel", pid) % SELECT_MOD:
            continue
        sp = int(r["spouse_id"]) if r["spouse_id"] else None
        if sp is not None and sp in chosen:        # one income certificate per family
            continue
        chosen[pid] = r
    certs = []
    seq: dict[tuple, int] = {}
    for pid, r in sorted(chosen.items()):
        pl = dict(geo.place(int(r["village_lgd"])))
        v = villages[int(r["village_lgd"])]
        pl["village"] = {"en": pl["village"]["en"], "hi": v["name_hi"]}
        days = HERO_DAYS if pid == HERO_PID else 1 + _h("income-days", pid) % MAX_DAYS
        valid_until = t + timedelta(days=days)
        issue = valid_until - timedelta(days=364)
        code = dist[pl["district_lgd"]]["code3"]
        key = (code, issue.year)
        seq[key] = seq.get(key, 0) + 1 + _h("income-seq", pid) % 37
        hh = _mock_household(pid)
        if pid == HERO_PID:
            hh = {"ration": "PHH", "land_ha": 1.2, "income": 68000, "now_ration": "PHH", "now_land_ha": 1.2}
        cert = {
            "cert_no": f"CG/{code}/TSL/INC/{issue.year}/{seq[key]:06d}",
            "service": "income", "cert_type": "annual",
            "holder_name": {"en": r["name_en"], "hi": r["name_hi"]},
            "father_name": {"en": r["father_name_en"], "hi": r["father_name_hi"]},
            "gender": r["gender"], "birth_year": int(r["birth_year"]),
            "village": pl["village"], "village_lgd": pl["village_lgd"], "tehsil": pl["tehsil"],
            "district": pl["district"], "district_lgd": pl["district_lgd"],
            "annual_income": hh["income"], "annual_income_text": rupees(hh["income"]), "income_sources": SOURCES,
            "issue_date": issue.isoformat(), "valid_until": valid_until.isoformat(),
            "issuing_authority": {"en": f"Tehsildar, {pl['tehsil']['en']}", "hi": f"तहसीलदार, {pl['tehsil']['hi']}"},
            "authority_role": "Tehsildar", "status": "active", "qr_verified": True, "synthetic": True,
            "_hh": hh, "_pid": pid,
        }
        if pid == HERO_PID:
            cert["persona_note"] = {
                "en": "Same family as the hero caste file: Sunita's (08812) post-matric scholarship also needs this income certificate.",
                "hi": "हीरो जाति प्रकरण का ही परिवार: सुनीता (08812) की पोस्ट-मैट्रिक छात्रवृत्ति हेतु यह आय प्रमाण पत्र भी चाहिए।"}
        certs.append(cert)
    return certs


def archive() -> list[dict]:
    return _archive(today().isoformat())


def public(c: dict) -> dict:
    return {k: v for k, v in c.items() if not k.startswith("_")}


def find(cert_no: str) -> dict | None:
    return next((c for c in archive() if c["cert_no"] == cert_no), None)


# ------------------------------------------------------------------ evidence and strength
def evidence(c: dict) -> tuple[list[dict], list[str], str, dict]:
    hh = c["_hh"]
    issue = date.fromisoformat(c["issue_date"])
    rows = [{
        "source": SRC["archive"], "field": {"en": "Number and income", "hi": "क्रमांक व आय"},
        "value": {"en": f"No. {c['cert_no']} · {c['annual_income_text']}/year · {c['issuing_authority']['en']} · {dmy(issue)} · QR ✓",
                  "hi": f"क्र. {c['cert_no']} · {c['annual_income_text']}/वर्ष · {c['issuing_authority']['hi']} · {dmy(issue)} · QR ✓"},
        "status": "ok",
    }]
    same_r = hh["now_ration"] == hh["ration"]
    rows.append({
        "source": SRC["khadya"], "field": {"en": "Ration category", "hi": "राशन श्रेणी"},
        "value": {"en": RATION[hh["now_ration"]]["en"] + (" · same as last year" if same_r else f" · last year {RATION[hh['ration']]['en']}"),
                  "hi": RATION[hh["now_ration"]]["hi"] + (" · पिछले वर्ष जैसी" if same_r else f" · पिछले वर्ष {RATION[hh['ration']]['hi']}")},
        "status": "ok" if same_r else "warn",
        **({} if same_r else {"note": {"en": "Category changed: income may have changed. The citizen confirms, the officer checks.",
                                       "hi": "श्रेणी बदली: आय बदली हो सकती है। नागरिक पुष्टि करें, अधिकारी जांचें।"}}),
    })
    same_l = hh["now_land_ha"] == hh["land_ha"]
    rows.append({
        "source": SRC["bhuiyan"], "field": {"en": "Land holding", "hi": "भूमि धारिता"},
        "value": {"en": f"{hh['now_land_ha']} ha" + (" · same as last year" if same_l else f" · last year {hh['land_ha']} ha"),
                  "hi": f"{hh['now_land_ha']} हे." + (" · पिछले वर्ष जैसी" if same_l else f" · पिछले वर्ष {hh['land_ha']} हे.")},
        "status": "ok" if same_l else "warn",
        **({} if same_l else {"note": {"en": "Land holding changed since last year.", "hi": "पिछले वर्ष से भूमि धारिता बदली।"}}),
    })
    flags = rule_flags({"affidavit_income": c["annual_income"], "land_acres": round(hh["now_land_ha"] * 2.471, 2)})
    agree = sum(1 for r in rows if r["status"] == "ok")
    if flags:
        strength = "verify"
        reason = {"en": "; ".join(RULE_FLAG_LABEL.get(f, {"en": f})["en"] for f in flags),
                  "hi": "; ".join(RULE_FLAG_LABEL.get(f, {"hi": f})["hi"] for f in flags)}
    elif agree < 3:
        strength = "partial"
        changed = [r["field"] for r in rows if r["status"] != "ok"]
        reason = {"en": f"{agree}/3 sources as last year; changed: " + ", ".join(x["en"].lower() for x in changed),
                  "hi": f"{agree}/3 स्रोत पिछले वर्ष जैसे; बदला: " + ", ".join(x["hi"] for x in changed)}
    else:
        strength = "strong"
        reason = {"en": "Last year's certificate, ration category and land holding all as last year",
                  "hi": "पिछले वर्ष का प्रमाण पत्र, राशन श्रेणी व भूमि धारिता — सभी पिछले वर्ष जैसे"}
    return rows, flags, strength, reason


def item(c: dict, t: date | None = None) -> dict:
    t = t or today()
    days = (date.fromisoformat(c["valid_until"]) - t).days
    rows, flags, strength, reason = evidence(c)
    return {
        "certificate": public(c), "days_left": days, "window": 30 if days <= 30 else 60,
        "evidence": rows, "rule_flags": [{"code": f, "label": RULE_FLAG_LABEL.get(f, {"en": f, "hi": f})} for f in flags],
        "strength": strength, "strength_label": STRENGTH_LABEL[strength], "strength_reason": reason,
        "renewal_id": (_prefilled.get(c["cert_no"]) or {}).get("renewal_id"),
    }


def income_share() -> float | None:
    s = next((x for x in mis.summary()["services"] if x["key"] == "income"), None)
    return s["share_of_volume"] if s else None


def listing(district_lgd: int = 643, window: int = 60) -> dict:
    t = today()
    d = geo.districts().get(district_lgd)
    items = [item(c, t) for c in archive() if c["district_lgd"] == district_lgd]
    items = [i for i in items if 0 <= i["days_left"] <= window]
    items.sort(key=lambda i: (i["days_left"], i["certificate"]["cert_no"]))
    return {
        "district_lgd": district_lgd,
        "district": {"en": d["name_en"], "hi": d["name_hi"]} if d else None,
        "as_of": t.isoformat(), "window_days": window,
        "counts": {"d30": sum(1 for i in items if i["days_left"] <= 30), "d60": len(items),
                   "strong": sum(1 for i in items if i["strength"] == "strong"),
                   "partial": sum(1 for i in items if i["strength"] == "partial"),
                   "verify": sum(1 for i in items if i["strength"] == "verify")},
        "items": items,
        "districts": [{"lgd": k, "name": {"en": geo.districts()[k]["name_en"], "hi": geo.districts()[k]["name_hi"]}}
                      for k in DEMO_DISTRICTS],
        "context": {
            "income_share_of_volume": income_share(),
            "note": {"en": "Income certificates are valid for one year and are about half of all Sewa Setu applications (REAL public MIS, 27-09-2026). "
                           "Certificates and registry rows here are SYNTHETIC.",
                     "hi": "आय प्रमाण पत्र एक वर्ष हेतु मान्य हैं और सेवा सेतु के लगभग आधे आवेदन इन्हीं के हैं (वास्तविक सार्वजनिक MIS, 27-09-2026)। "
                           "यहाँ के प्रमाण पत्र व अभिलेख सिंथेटिक हैं।"},
        },
        "roadmap": ROADMAP,
        "synthetic": True,
    }


# ------------------------------------------------------------------ nudge + prefill
def kendra_of(c: dict) -> dict:
    return {"en": f"Lok Seva Kendra, {c['tehsil']['en']}", "hi": f"लोक सेवा केंद्र, {c['tehsil']['hi']}"}


def nudge(c: dict, days: int) -> dict:
    expiry = dmy(date.fromisoformat(c["valid_until"]))
    ctx = {"name": c["holder_name"], "cert_no": c["cert_no"], "days": days, "expiry": expiry,
           "kendra": kendra_of(c), "office": c["issuing_authority"]}
    text = render_pair("renewal_nudge", **ctx)
    source = [public(c), str(days), expiry, kendra_of(c)]
    return {"channel": "whatsapp", "text": text, "generator": "template",
            "checker": check_entities(text, source, vocab_pattern="renewal_nudge.*.j2"),
            "status": "preview", "status_note": {"en": "Preview only: not sent from the demo.", "hi": "केवल पूर्वावलोकन: डेमो से नहीं भेजा गया।"}}


def prefill(cert_no: str) -> tuple[dict, bool]:
    """Returns (renewal record, created). Idempotent per certificate until reset."""
    c = find(cert_no)
    if c is None:
        raise KeyError(cert_no)
    if cert_no in _prefilled:
        return _prefilled[cert_no], False
    it = item(c)
    code = cert_no.split("/")[1]
    year = today().year
    _seq[code] = _seq.get(code, 0) + 1
    addr = {"en": f"{c['village']['en']}, tehsil {c['tehsil']['en']}, district {c['district']['en']}",
            "hi": f"{c['village']['hi']}, तहसील {c['tehsil']['hi']}, जिला {c['district']['hi']}"}
    last = {"en": "Last year's certificate", "hi": "पिछले वर्ष का प्रमाण पत्र"}
    hh = c["_hh"]
    rec = {
        "renewal_id": f"REN/{code}/{year}/{_seq[code]:04d}",
        "created_at": datetime.now(IST).isoformat(timespec="seconds"),
        "status": "awaiting_citizen_confirmation",
        "service": "income_renewal", "service_label": SERVICE_LABEL,
        "source_certificate": public(c), "days_left": it["days_left"],
        "fields": [
            {"label": {"en": "Applicant", "hi": "आवेदक"}, "value": c["holder_name"], "source": last},
            {"label": {"en": "Father / husband", "hi": "पिता / पति"}, "value": c["father_name"], "source": last},
            {"label": {"en": "Address", "hi": "पता"}, "value": addr, "source": last},
            {"label": {"en": "Annual family income", "hi": "वार्षिक पारिवारिक आय"},
             "value": {"en": f"{c['annual_income_text']} (last year's; citizen to confirm)", "hi": f"{c['annual_income_text']} (पिछले वर्ष की; नागरिक पुष्टि करें)"},
             "source": last},
            {"label": {"en": "Income sources", "hi": "आय के स्रोत"}, "value": c["income_sources"], "source": last},
            {"label": {"en": "Ration category", "hi": "राशन श्रेणी"}, "value": RATION[hh["now_ration"]], "source": SRC["khadya"]},
            {"label": {"en": "Land holding", "hi": "भूमि धारिता"},
             "value": {"en": f"{hh['now_land_ha']} ha", "hi": f"{hh['now_land_ha']} हे."}, "source": SRC["bhuiyan"]},
        ],
        "evidence_reused": it["evidence"], "rule_flags": it["rule_flags"],
        "strength": it["strength"], "strength_label": it["strength_label"], "strength_reason": it["strength_reason"],
        "citizen_confirmation": {
            "required": True, "confirmed": False,
            "statement": {"en": f"My family's annual income is unchanged from last year ({c['annual_income_text']}).",
                          "hi": f"मेरे परिवार की वार्षिक आय पिछले वर्ष ({c['annual_income_text']}) से अपरिवर्तित है।"},
            "note": {"en": "Confirmed in person at the Kendra. If the income changed, the citizen files a normal application with a new affidavit.",
                     "hi": "केंद्र पर स्वयं पुष्टि। आय बदली हो तो नए शपथ पत्र के साथ सामान्य आवेदन।"},
        },
        "officer_step": {
            "required": True, "auto_issue": False, "office": c["issuing_authority"],
            "note": {"en": f"{c['issuing_authority']['en']} still examines and decides. Never auto-issued.",
                     "hi": f"{c['issuing_authority']['hi']} ही परीक्षण कर निर्णय लेंगे। स्वतः जारी नहीं होता।"},
        },
        "nudge": nudge(c, it["days_left"]),
        "rule_file": {"name": RULE_FILE.name, "note": {"en": "Starter decision table; thresholds are placeholders, not CG policy.",
                                                        "hi": "प्रारंभिक निर्णय तालिका; सीमाएँ सांकेतिक हैं, छ.ग. नीति नहीं।"}},
        "synthetic": True,
    }
    _prefilled[cert_no] = rec
    return rec, True


def records_accessed(rec: dict) -> list[str]:
    return [rec["source_certificate"]["cert_no"], SRC["khadya"]["en"], SRC["bhuiyan"]["en"]]


def snapshot() -> dict:
    return copy.deepcopy(_prefilled)
