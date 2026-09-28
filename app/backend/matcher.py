"""Runtime lineage matcher: pure-Python Fellegi-Sunter scorer using the m/u
probabilities learned by Splink (EM) and exported to model/model.json.

Task: link an APPLICANT to a RELATIVE's archived certificate.
  hypothesis "father":  applicant.father_name  <->  cert.holder_name
                        applicant.birth_year - cert.birth_year in [18, 48]
  hypothesis "sibling": applicant.father_name  <->  cert.father_name
                        |applicant.birth_year - cert.birth_year| <= 14
Each (applicant, certificate, hypothesis) triple is a candidate pair. The comparison
levels below are reproduced 1:1 in SQL for Splink training (train_model.py).
"""
from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

from rapidfuzz.distance import JaroWinkler

from normalise import norm

MODEL_PATH = Path(__file__).parent / "model" / "model.json"

HYP = {
    "father": {"lo": 18, "hi": 48},     # child birth year - holder birth year
    "sibling": {"lo": -14, "hi": 14},
}
NEAR = 5  # years outside the plausible window that still count as "near"

REL_LABEL = {
    "father": {"en": "Father", "hi": "पिता"},
    "sibling": {"en": "Sibling", "hi": "भाई/बहन"},
}


def jw(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return JaroWinkler.normalized_similarity(a, b)


# ----------------------------------------------------------------------------- comparison levels
# (these functions define the model; train_model.py mirrors them in DuckDB SQL)
def level_given(a_given: str, a_skel: str, b_given: str, b_skel: str) -> str:
    if not a_given or not b_given:
        return "null"
    if a_given == b_given:
        return "exact"
    if a_skel and a_skel == b_skel:
        return "skeleton"
    s = jw(a_given, b_given)
    if s >= 0.92:
        return "jw>=0.92"
    if s >= 0.80:
        return "jw>=0.80"
    return "else"


def level_surname(a: str, a_skel: str, b: str, b_skel: str) -> str:
    if not a or not b:
        return "null"
    if a == b:
        return "exact"
    if a_skel and a_skel == b_skel:
        return "skeleton"
    if jw(a, b) >= 0.85:
        return "jw>=0.85"
    return "else"


def level_place(q: dict, c: dict) -> str:
    if not q.get("district_lgd"):
        return "null"
    if q.get("village_lgd") and q["village_lgd"] == c["village_lgd"]:
        return "same_village"
    if q.get("tehsil_lgd") and q["tehsil_lgd"] == c.get("_tehsil_lgd"):
        return "same_tehsil"
    if q["district_lgd"] == c["district_lgd"]:
        return "same_district"
    return "else"


def level_gap(q_by, c_by, hyp: str) -> str:
    if not q_by or not c_by:
        return "null"
    gap = q_by - c_by
    lo, hi = HYP[hyp]["lo"], HYP[hyp]["hi"]
    if lo <= gap <= hi:
        return "plausible"
    if lo - NEAR <= gap <= hi + NEAR:
        return "near"
    return "implausible"


COMPARISONS = ["given_name", "surname", "place", "birth_gap"]


# ----------------------------------------------------------------------------- model
class Model:
    def __init__(self, path: Path = MODEL_PATH):
        self.raw = json.loads(path.read_text(encoding="utf-8"))
        self.version = self.raw["model_version"]
        self.name = self.raw["model"]
        self.prior = self.raw["prior_log2_odds"]
        self.w: dict[str, dict[str, float]] = {}
        for comp in self.raw["comparisons"]:
            self.w[comp["name"]] = {lv["level"]: lv["weight"] for lv in comp["levels"]}

    def weight(self, comp: str, level: str) -> float:
        return self.w[comp].get(level, 0.0)


def prob_from_log2(x: float) -> float:
    return 1.0 / (1.0 + 2.0 ** (-x))


# ----------------------------------------------------------------------------- archive views + blocking
@dataclass
class View:
    idx: int          # index into archive list
    hyp: str
    raw: str          # the raw name string compared (holder name or father's name on the cert)
    given: str
    given_skel: str
    surname: str
    surname_skel: str
    self_given: str   # the holder's own given name (for the self-exclusion rule)


def query_features(q: dict) -> dict:
    n = norm(q.get("father_raw") or "")
    a = norm(q.get("applicant_raw") or "")
    return {**q, "rel_given": n.given, "rel_given_skel": n.given_skel, "rel_surname": n.surname,
            "rel_surname_skel": n.surname_skel, "self_given": a.given}


def is_self(q: dict, v: View, c: dict) -> bool:
    """Deterministic rule: the applicant's OWN earlier certificate is not a relative's."""
    if v.hyp != "sibling" or not q.get("self_given") or not q.get("birth_year"):
        return False
    return jw(q["self_given"], v.self_given) >= 0.88 and abs(q["birth_year"] - c["birth_year"]) <= 2


class Archive:
    def __init__(self, certs: list[dict]):
        self.certs = certs
        self.by_no = {c["cert_no"]: i for i, c in enumerate(certs)}
        self.views: list[View] = []
        self.idx_dist_sur: dict[tuple, list[int]] = {}
        self.idx_village: dict[tuple, list[int]] = {}
        self.idx_names: dict[tuple, list[int]] = {}
        for i, c in enumerate(certs):
            holder = norm(c["_holder_raw"])
            for hyp, raw in (("father", c["_holder_raw"]), ("sibling", c["_father_raw"])):
                n = norm(raw)
                v = View(i, hyp, raw, n.given, n.given_skel, n.surname, n.surname_skel, holder.given)
                k = len(self.views)
                self.views.append(v)
                self.idx_dist_sur.setdefault((hyp, c["district_lgd"], n.surname_skel), []).append(k)
                self.idx_village.setdefault((hyp, c["village_lgd"]), []).append(k)
                self.idx_names.setdefault((hyp, n.given_skel, n.surname_skel), []).append(k)

    def candidates(self, qf: dict) -> list[int]:
        """Blocking — identical to the Splink prediction blocking rules."""
        out: set[int] = set()
        for hyp in HYP:
            if qf.get("district_lgd"):
                out.update(self.idx_dist_sur.get((hyp, qf["district_lgd"], qf["rel_surname_skel"]), []))
            if qf.get("village_lgd"):
                out.update(self.idx_village.get((hyp, qf["village_lgd"]), []))
            if qf["rel_given_skel"]:
                out.update(self.idx_names.get((hyp, qf["rel_given_skel"], qf["rel_surname_skel"]), []))
        return sorted(out)

    def views_for_cert(self, cert_idx: int) -> list[int]:
        return [2 * cert_idx, 2 * cert_idx + 1]


# ----------------------------------------------------------------------------- scoring
COMP_LABEL = {
    ("given_name", "father"): {"en": "Father's name ↔ certificate holder", "hi": "पिता का नाम ↔ प्रमाण पत्र धारक"},
    ("given_name", "sibling"): {"en": "Father's name ↔ father's name on sibling's certificate",
                                "hi": "पिता का नाम ↔ भाई/बहन के प्रमाण पत्र पर पिता का नाम"},
    ("surname", None): {"en": "Surname", "hi": "उपनाम"},
    ("place", None): {"en": "Village (LGD code)", "hi": "ग्राम (एलजीडी कोड)"},
    ("birth_gap", None): {"en": "Birth-year gap", "hi": "जन्म-वर्ष अंतर"},
}
FIELD = {"given_name": "father_name", "surname": "surname", "place": "village", "birth_gap": "birth_year_gap"}
LEVEL_TEXT = {
    "exact": ("exact after normalisation", "सामान्यीकरण के बाद समान"),
    "skeleton": ("same consonant skeleton", "व्यंजन-ढांचा समान"),
    "jw>=0.92": ("Jaro-Winkler {s:.2f} (very close)", "जारो-विंकलर {s:.2f} (बहुत निकट)"),
    "jw>=0.85": ("Jaro-Winkler {s:.2f} (close)", "जारो-विंकलर {s:.2f} (निकट)"),
    "jw>=0.80": ("Jaro-Winkler {s:.2f} (similar)", "जारो-विंकलर {s:.2f} (मिलता-जुलता)"),
    "else": ("different (Jaro-Winkler {s:.2f})", "भिन्न (जारो-विंकलर {s:.2f})"),
    "null": ("not available", "उपलब्ध नहीं"),
    "same_village": ("same village", "एक ही ग्राम"),
    "same_tehsil": ("same tehsil, different village", "एक ही तहसील, भिन्न ग्राम"),
    "same_district": ("same district, different tehsil", "एक ही जिला, भिन्न तहसील"),
    "plausible": ("plausible", "संभव"),
    "near": ("borderline", "सीमा पर"),
    "implausible": ("implausible", "असंभव"),
}


def _split_surname(raw: str) -> str:
    toks = raw.split()
    return toks[-1] if toks else raw


class Matcher:
    def __init__(self, certs: list[dict], model: Model | None = None):
        self.model = model or Model()
        self.archive = Archive(certs)
        self.village_names: dict[int, dict] = {}

    # -- levels for one pair
    def pair_levels(self, qf: dict, v: View) -> dict[str, str]:
        c = self.archive.certs[v.idx]
        return {
            "given_name": level_given(qf["rel_given"], qf["rel_given_skel"], v.given, v.given_skel),
            "surname": level_surname(qf["rel_surname"], qf["rel_surname_skel"], v.surname, v.surname_skel),
            "place": level_place(qf, c),
            "birth_gap": level_gap(qf.get("birth_year"), c["birth_year"], v.hyp),
        }

    def log2_odds(self, levels: dict[str, str]) -> float:
        return self.model.prior + sum(self.model.weight(k, lv) for k, lv in levels.items())

    def explain(self, qf: dict, v: View, levels: dict[str, str]) -> list[dict]:
        c = self.archive.certs[v.idx]
        items = []
        for comp in COMPARISONS:
            lv = levels[comp]
            en_t, hi_t = LEVEL_TEXT.get(lv, (lv, lv))
            if comp == "given_name":
                s = jw(qf["rel_given"], v.given)
                q_raw, c_raw = qf.get("father_raw", ""), v.raw
                en = f"{en_t.format(s=s)} ({q_raw} ↔ {c_raw})"
                hi = f"{hi_t.format(s=s)} ({q_raw} ↔ {c_raw})"
            elif comp == "surname":
                s = jw(qf["rel_surname"], v.surname)
                a, b = _split_surname(qf.get("father_raw", "")), _split_surname(v.raw)
                en, hi = f"{en_t.format(s=s)} ({a} ↔ {b})", f"{hi_t.format(s=s)} ({a} ↔ {b})"
            elif comp == "place":
                qv = qf.get("village_name") or {"en": str(qf.get("village_lgd") or "—"), "hi": str(qf.get("village_lgd") or "—")}
                en = f"{en_t} ({qv['en']} ↔ {c['village']['en']}, LGD {c['village_lgd']})"
                hi = f"{hi_t} ({qv['hi']} ↔ {c['village']['hi']}, एलजीडी {c['village_lgd']})"
            else:
                if lv == "null":
                    en, hi = en_t, hi_t
                else:
                    gap = qf["birth_year"] - c["birth_year"]
                    rel_en = "father" if v.hyp == "father" else "sibling"
                    rel_hi = "पिता" if v.hyp == "father" else "भाई/बहन"
                    en = f"applicant born {qf['birth_year']}, holder born {c['birth_year']}: gap {gap} yrs — {en_t} for a {rel_en}"
                    hi = f"आवेदक जन्म {qf['birth_year']}, धारक जन्म {c['birth_year']}: अंतर {gap} वर्ष — {rel_hi} हेतु {hi_t}"
            label = COMP_LABEL.get((comp, v.hyp)) or COMP_LABEL[(comp, None)]
            items.append({"field": FIELD[comp], "label": label, "comparison": {"en": en, "hi": hi},
                          "level": lv, "weight": round(self.model.weight(comp, lv), 3)})
        return items

    def score_view(self, qf: dict, k: int) -> tuple[float, dict[str, str]]:
        v = self.archive.views[k]
        levels = self.pair_levels(qf, v)
        return self.log2_odds(levels), levels

    def match(self, query: dict, min_prob: float = 0.60, top: int = 5,
              extra_cert_nos: list[str] | None = None, explain: bool = True,
              kind: str | None = None) -> list[dict]:
        """Score all blocked candidates; return best hypothesis per certificate, sorted.
        kind: "caste" or "domicile" keeps only certificates of that kind (evidence must be like-for-like)."""
        qf = query_features(query)
        cand = self.archive.candidates(qf)
        for no in extra_cert_nos or []:
            if no in self.archive.by_no:
                cand += self.archive.views_for_cert(self.archive.by_no[no])
        best: dict[int, tuple] = {}
        for k in set(cand):
            v = self.archive.views[k]
            c = self.archive.certs[v.idx]
            if is_self(qf, v, c):
                continue
            if kind and (c["service"] == "domicile") != (kind == "domicile"):
                continue
            lo, levels = self.score_view(qf, k)
            if v.idx not in best or lo > best[v.idx][0]:
                best[v.idx] = (lo, k, levels)
        out = []
        for idx, (lo, k, levels) in best.items():
            p = prob_from_log2(lo)
            forced = extra_cert_nos and self.archive.certs[idx]["cert_no"] in extra_cert_nos
            if p < min_prob and not forced:
                continue
            v = self.archive.views[k]
            out.append({
                "cert_idx": idx, "hyp": v.hyp, "log2_odds": lo, "probability": p, "levels": levels,
                "weights": self.explain(qf, v, levels) if explain else None,
            })
        out.sort(key=lambda r: -r["probability"])
        return out[:top]

    def score_all(self, query: dict) -> dict[int, tuple[float, str]]:
        """For evaluation: best (log2 odds, hyp) per blocked certificate (no threshold)."""
        qf = query_features(query)
        best: dict[int, tuple[float, str]] = {}
        for k in self.archive.candidates(qf):
            v = self.archive.views[k]
            c = self.archive.certs[v.idx]
            if is_self(qf, v, c):
                continue
            lo, _ = self.score_view(qf, k)
            if v.idx not in best or lo > best[v.idx][0]:
                best[v.idx] = (lo, v.hyp)
        return best


def match_level(p: float) -> str | None:
    if p >= 0.95:
        return "exact"
    if p >= 0.60:
        return "possible"
    return None
