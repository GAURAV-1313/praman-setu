"""LGD geography for Chhattisgarh (REAL public LGD directory files under data/geo)."""
from __future__ import annotations

import csv
from functools import lru_cache
from pathlib import Path

from normalise import roman_to_deva

ROOT = Path(__file__).resolve().parents[2]  # /Users/.../HACKATHON
DATA = ROOT / "data"
GEO = DATA / "geo"
SYN = DATA / "synthetic"

# 3-letter codes used in synthetic certificate / application numbers
DISTRICT_CODES = {
    646: "BLD", 644: "BBT", 649: "BRP", 374: "BST", 650: "BMT", 636: "BJP", 375: "BSP", 376: "DTW",
    377: "DMT", 378: "DRG", 645: "GRB", 734: "GPM", 379: "JCH", 380: "JSP", 382: "KBD", 381: "KNK",
    759: "KCG", 643: "KDG", 383: "KRB", 384: "KOR", 385: "MSM", 760: "MCB", 761: "MMA", 647: "MGL",
    637: "NRP", 386: "RGH", 387: "RPR", 388: "RJN", 762: "SKT", 763: "SBG", 642: "SKM", 648: "SJP",
    389: "SGJ",
}

# Hand-checked Hindi names for tehsils/villages used in the demo stories.
HI_OVERRIDES = {
    # tehsils
    "Kondagaon": "कोंडागांव", "Keskal": "केशकाल", "Farasgaon": "फरसगांव", "Makdi": "माकड़ी",
    "Bade Rajpur": "बड़ेराजपुर", "Mardapal": "मर्दापाल", "Dhanora": "धनोरा", "Nawagarh": "नवागढ़",
    "Bemetara": "बेमेतरा", "Jagdalpur": "जगदलपुर", "Raipur": "रायपुर", "Pendra": "पेंड्रा",
    "Marwahi": "मरवाही", "Gaurella": "गौरेला", "Pendra Road": "पेंड्रा रोड",
    # demo villages
    "Kongera": "कोंगेरा", "Bayanar": "बयानार", "Kumhari": "कुम्हारी", "Isalnar": "ईसलनार",
    "Makadi": "माकड़ी", "Umargaon": "उमरगांव", "Bansgaon": "बांसगांव", "Telanga": "तेलंगा",
    "Jhanki": "झांकी",
    # Round 4: villages in the demo queue (machine transliteration was garbled; hand-curated — to be re-checked
    # by a Hindi reader / replaced by LGD's local-language name field in production)
    "Mohlai": "मोहलई", "Seonipal": "सिवनीपाल", "Chilputi": "चिलपुटी", "Dhurwapara": "धुरवापारा",
    "Banchapai": "बांचापाई", "Halda": "हल्दा", "Chichadi": "चिचाड़ी", "Korgaon": "कोरगांव", "Sandsa": "सांडसा",
    "Umla": "उमला", "Uparbedi": "उपरबेदी", "Sodhma": "सोढ़मा", "Gare": "गारे", "Nalajhar": "नलाझर",
    "Arangula": "अरंगुला", "Padoki": "पडोकी", "Nugali": "नुगली", "Golawand": "गोलावंड", "Jamgaon": "जामगांव",
    "Adnar": "अड़नार", "Marangpuri": "मरंगपुरी",
    # Round 7: native-village demo (husband's village / maiden village and its tehsil)
    "Masora": "मसोरा", "Garhbengal": "गढ़बेंगाल", "Narayanpur": "नारायणपुर",
}


def hi_name(en: str) -> str:
    en = en.strip()
    return HI_OVERRIDES.get(en) or roman_to_deva(en)


@lru_cache(maxsize=1)
def districts() -> dict[int, dict]:
    out = {}
    with open(GEO / "cg_districts_lgd.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = int(r["lgd_district_code"])
            out[code] = {
                "lgd": code,
                "name_en": r["district_mis_name"],
                "name_hi": r["name_hi"],
                "division": r["division"],
                "pop_2011": int(r["pop_2011_approx"] or 0),
                "code3": DISTRICT_CODES[code],
            }
    return out


@lru_cache(maxsize=1)
def district_demographics() -> dict[str, dict]:
    out = {}
    with open(DATA / "cg_district_demographics_census2011.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            out[r["district"]] = {"sc": float(r["sc_pct"]) / 100, "st": float(r["st_pct"]) / 100}
    return out


@lru_cache(maxsize=1)
def tehsils() -> dict[int, dict]:
    out = {}
    with open(GEO / "cg_tehsils_lgd.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = int(r["sub_district_code"])
            name = r["sub_district_name"].strip()
            out[code] = {"lgd": code, "name_en": name, "name_hi": hi_name(name),
                         "district_lgd": int(r["district_code"])}
    return out


def _title(s: str) -> str:
    s = s.strip()
    return s[:1].upper() + s[1:] if s else s


@lru_cache(maxsize=1)
def villages() -> dict[int, dict]:
    out = {}
    with open(GEO / "cg_villages_lgd.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            code = int(r["village_code"])
            name = _title(r["village_name"])
            out[code] = {
                "lgd": code,
                "name_en": name,
                "name_hi": hi_name(name),
                "tehsil_lgd": int(r["sub_district_code"]),
                "tehsil_en": r["sub_district_name"].strip(),
                "district_lgd": int(r["district_code"]),
            }
    for v in out.values():
        t = tehsils().get(v["tehsil_lgd"])
        v["tehsil_hi"] = t["name_hi"] if t else hi_name(v["tehsil_en"])
    # Round 4: no two villages of a district may share a Hindi label when their LGD names differ
    # (e.g. "Nawadih" / "Navadih" both transliterate to "नवडिह"): append the LGD code to disambiguate.
    by_label: dict[tuple, list[dict]] = {}
    for v in out.values():
        by_label.setdefault((v["district_lgd"], v["name_hi"]), []).append(v)
    for group in by_label.values():
        if len({g["name_en"] for g in group}) > 1:
            for g in group:
                g["name_hi"] = f"{g['name_hi']} (एलजीडी {g['lgd']})"
    return out


def place(village_lgd: int) -> dict:
    """I18n place block for a village: village, tehsil, district."""
    v = villages()[village_lgd]
    d = districts()[v["district_lgd"]]
    return {
        "village": {"en": v["name_en"], "hi": v["name_hi"]},
        "village_lgd": v["lgd"],
        "tehsil": {"en": v["tehsil_en"], "hi": v["tehsil_hi"]},
        "tehsil_lgd": v["tehsil_lgd"],
        "district": {"en": d["name_en"], "hi": d["name_hi"]},
        "district_lgd": d["lgd"],
        "division": d["division"],
    }
