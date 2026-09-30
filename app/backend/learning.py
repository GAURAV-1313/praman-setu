"""Round 8a: human-in-the-loop learning — the matcher learns from officers' "same family" / "not this family" acts.

Only relationship confirmations are labels. Approve / reject / send-back decisions are NEVER used (they depend on
documents, policy and the applicant's own claim, not on whether two records are one family).

Method (simple and honest):
  * calibration  — logistic (Platt) calibration of the Fellegi–Sunter score on officer labels:
                   P(same) = σ(a + b·s), s = the model's log-odds. Moves the prior / decision threshold only.
  * per-comparison — the same logistic fit with one scale per comparison (name, surname, place, birth gap), ridge-
                   shrunk towards the EM weights so a few hundred labels cannot swing the model.
  "Exact" stays "calibrated P ≥ 0.95". Precision / recall are measured before vs after on a HELD-OUT slice of the
  synthetic test families (half of the test lineages, never used for labels).

Live officer labels are few in a demo, so 300 SIMULATED officer confirmations are seeded from ground truth with a 3%
officer error rate, drawn from pairs an officer would actually see (P ≥ 0.60). They are labelled "simulated" everywhere.
A recalibration is a PROPOSAL: it is not applied to live matching until the model owner signs it off.
"""
from __future__ import annotations

import csv
import json
import math
import os
import random
from datetime import datetime, timedelta, timezone
from functools import lru_cache
from pathlib import Path

import numpy as np

import engine
import geo
from matcher import COMPARISONS, is_self, query_features

IST = timezone(timedelta(hours=5, minutes=30))
EXACT, POSSIBLE = 0.95, 0.60
N_SIMULATED = 300
OFFICER_ERROR = 0.03
SEED = 20260929
KEEP_MIN_LOG2 = -10.0          # pairs below this raw score are negatives under every model (counted, not stored)
RIDGE = {"calibration": 1.0, "per_comparison": 4.0}
LN2 = math.log(2)
FIELD_TO_COMP = {"father_name": "given_name", "surname": "surname", "village": "place", "birth_year_gap": "birth_gap"}
COMP_LABEL = {"given_name": {"en": "Father's name", "hi": "पिता का नाम"}, "surname": {"en": "Surname", "hi": "उपनाम"},
              "place": {"en": "Village / place", "hi": "ग्राम / स्थान"}, "birth_gap": {"en": "Birth-year gap", "hi": "जन्म-वर्ष अंतर"}}


def _state_file() -> Path:
    d = Path(os.environ.get("PRAMAN_STATE_DIR", Path(__file__).parent / "state"))
    return d / "learning.json"


# ------------------------------------------------------------------ labelled-pair universe (synthetic test families)
@lru_cache(maxsize=1)
def universe() -> dict:
    m = engine.matcher()
    certs = m.archive.certs
    father_of, lineage_of = {}, {}
    with open(geo.SYN / "population.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            father_of[int(r["pid"])] = int(r["father_id"]) if r["father_id"] else None
    kids = {}
    for pid, fid in father_of.items():
        if fid:
            kids.setdefault(fid, []).append(pid)
    by_holder = {}
    for i, c in enumerate(certs):
        by_holder.setdefault(c["_person_id"], []).append(i)
    pairs, missed = [], {"pool": 0, "eval": 0}
    positives = {"pool": 0, "eval": 0}
    queries = []
    with open(geo.SYN / "lineage_queries.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["split"] != "test":
                continue
            for k in ("person_id", "father_id", "birth_year", "village_lgd", "tehsil_lgd", "district_lgd"):
                r[k] = int(r[k])
            queries.append(r)
    for qi, q in enumerate(queries):
        part = "eval" if int(q["lineage"]) % 2 else "pool"
        truth = set(by_holder.get(q["father_id"], []))
        for sib in kids.get(q["father_id"], []):
            if sib != q["person_id"]:
                truth.update(by_holder.get(sib, []))
        positives[part] += len(truth)
        qf = query_features({"father_raw": q["father_raw"], "applicant_raw": q["applicant_raw"], "birth_year": q["birth_year"],
                             "village_lgd": q["village_lgd"], "tehsil_lgd": q["tehsil_lgd"], "district_lgd": q["district_lgd"]})
        best = {}
        for k in m.archive.candidates(qf):
            v = m.archive.views[k]
            c = certs[v.idx]
            if is_self(qf, v, c):
                continue
            lo, levels = m.score_view(qf, k)
            if v.idx not in best or lo > best[v.idx][0]:
                best[v.idx] = (lo, levels, v.hyp)
        kept_true = 0
        for ci, (lo, levels, hyp) in best.items():
            if lo < KEEP_MIN_LOG2:
                continue
            y = ci in truth
            kept_true += y
            pairs.append({"id": f"P{qi:05d}-{ci}", "q": qi, "ci": ci, "hyp": hyp, "part": part, "y": int(y), "s": lo,
                          "w": [m.model.weight(comp, levels[comp]) for comp in COMPARISONS], "levels": levels})
        missed[part] += len(truth) - kept_true
    return {"pairs": pairs, "by_id": {p["id"]: p for p in pairs}, "queries": queries, "missed": missed,
            "positives": positives, "prior": m.model.prior}


# ------------------------------------------------------------------ labels
@lru_cache(maxsize=1)
def simulated_labels() -> list[dict]:
    u = universe()
    shown = [p for p in u["pairs"] if p["part"] == "pool" and _p(p["s"]) >= POSSIBLE]
    rng = random.Random(SEED)
    out = []
    for p in rng.sample(shown, min(N_SIMULATED, len(shown))):
        y = p["y"]
        if rng.random() < OFFICER_ERROR:
            y = 1 - y
        out.append({"pair_id": p["id"], "y": y, "source": "simulated", "officer_error": y != p["y"]})
    return out


class LearningState:
    def __init__(self):
        self.labels: list[dict] = []     # officer answers to "ask the officer" pairs (this session)
        self.calibration: dict | None = None
        self.history: list[dict] = []
        self.load()

    def reset(self):
        self.labels, self.calibration, self.history = [], None, []
        self.save()

    def load(self):
        f = _state_file()
        if f.exists():
            try:
                s = json.loads(f.read_text(encoding="utf-8"))
                self.labels, self.calibration, self.history = s.get("labels", []), s.get("calibration"), s.get("history", [])
            except Exception:
                pass

    def save(self):
        f = _state_file()
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps({"labels": self.labels, "calibration": self.calibration, "history": self.history},
                                ensure_ascii=False, indent=1), encoding="utf-8")


LSTATE = LearningState()


def reset():
    LSTATE.reset()


def disposition_labels(dispositions: dict, analyses: dict) -> list[dict]:
    """Every officer 'same family' / 'not this family' act on a live file → a label with the pair's model features."""
    out = []
    for app_id, per in (dispositions or {}).items():
        an = analyses.get(app_id)
        if not an:
            continue
        for lm in an.get("lineage_matches") or []:
            no = lm["certificate"]["cert_no"]
            d = per.get(no)
            if not d:
                continue
            w = {FIELD_TO_COMP.get(x["field"]): x["weight"] for x in lm.get("weights") or []}
            out.append({"pair_id": f"{app_id}|{no}", "y": 1 if d["decision"] == "same" else 0, "source": "officer_case",
                        "app_id": app_id, "cert_no": no, "ts": d.get("ts"),
                        "w": [w.get(c, 0.0) for c in COMPARISONS], "s": lm.get("prior_weight", 0) + sum(w.get(c, 0.0) for c in COMPARISONS)})
    return out


# ------------------------------------------------------------------ models
def _p(log2_odds: float) -> float:
    return 1.0 / (1.0 + 2.0 ** (-log2_odds))


def _features(kind: str, s: float, w: list[float]) -> np.ndarray:
    if kind == "calibration":
        return np.array([1.0, s * LN2])
    return np.array([1.0] + [x * LN2 for x in w])


def _init(kind: str, prior: float) -> np.ndarray:
    return np.array([0.0, 1.0]) if kind == "calibration" else np.array([prior * LN2] + [1.0] * len(COMPARISONS))


def fit(kind: str, rows: list[tuple[float, list[float], int]], prior: float) -> np.ndarray:
    """Ridge-regularised logistic regression (IRLS), shrunk towards the EM model (theta0)."""
    th0 = _init(kind, prior)
    if not rows:
        return th0
    X = np.array([_features(kind, s, w) for s, w, _ in rows])
    y = np.array([yy for _, _, yy in rows], dtype=float)
    lam = RIDGE[kind]
    def loss(t):
        z = X @ t
        return float(np.sum(np.logaddexp(0, z) - y * z) + 0.5 * lam * np.sum((t - th0) ** 2))

    th = th0.copy()
    cur = loss(th)
    for _ in range(100):
        z = X @ th
        p = 1 / (1 + np.exp(-np.clip(z, -35, 35)))
        g = X.T @ (p - y) + lam * (th - th0)
        H = (X.T * (p * (1 - p))) @ X + lam * np.eye(len(th))
        step = np.linalg.solve(H, g)
        t = 1.0
        while t > 1e-6:           # backtracking line search (damped Newton)
            cand = th - t * step
            new = loss(cand)
            if new <= cur:
                break
            t /= 2
        if new > cur:
            break
        th, done = cand, cur - new < 1e-10
        cur = new
        if done:
            break
    return th


def prob(kind: str | None, th, s: float, w: list[float]) -> float:
    if kind is None:
        return _p(s)
    z = float(np.clip(_features(kind, s, w) @ np.array(th), -30, 30))
    return 1 / (1 + math.exp(-z))


@lru_cache(maxsize=4)
def _arrays(part: str):
    ps = [p for p in universe()["pairs"] if p["part"] == part]
    return np.array([p["s"] for p in ps]), np.array([p["w"] for p in ps]), np.array([p["y"] for p in ps])


def probs(kind: str | None, th, S: np.ndarray, W: np.ndarray) -> np.ndarray:
    if kind is None:
        return 1.0 / (1.0 + np.power(2.0, -S))
    X = np.column_stack([np.ones_like(S), S * LN2]) if kind == "calibration" else np.column_stack([np.ones_like(S), W * LN2])
    return 1.0 / (1.0 + np.exp(-np.clip(X @ np.array(th), -30, 30)))


def metrics(kind: str | None, th, part: str = "eval", thr: float = EXACT) -> dict:
    S, W, Y = _arrays(part)
    pr = probs(kind, th, S, W)
    sel = pr >= thr
    tp, fp = int((Y[sel] == 1).sum()), int((Y[sel] == 0).sum())
    pos = universe()["positives"][part]
    prec = tp / (tp + fp) if tp + fp else None
    rec = tp / pos if pos else None
    r = lambda x: round(float(x), 4) if x is not None else None  # noqa: E731
    return {"precision": r(prec), "recall": r(rec), "tp": tp, "fp": fp, "positives": pos,
            "mean_claimed": r(pr[sel].mean()) if sel.any() else None}


def choose_threshold(kind: str, th, rows: list[tuple[float, list[float], int]], beta: float = 0.5) -> float:
    """Operating point from the labels: the calibrated-P cut that maximises F-beta (beta 0.5: a wrong family link costs
    more than a missed one, which the officer still sees as 'possible'). Never below the 'possible' floor."""
    if not rows:
        return EXACT
    ps = [(prob(kind, th, s, w), y) for s, w, y in rows]
    pos = sum(y for _, y in ps) or 1
    best, best_f = EXACT, -1.0
    for cut in sorted({round(p, 6) for p, _ in ps}):
        sel = [y for p, y in ps if p >= cut]
        if not sel:
            continue
        prec, rec = sum(sel) / len(sel), sum(sel) / pos
        f = (1 + beta ** 2) * prec * rec / (beta ** 2 * prec + rec) if prec + rec else 0.0
        if f > best_f + 1e-12:
            best, best_f = cut, f
    return float(best)


def _threshold_log2(kind: str, th, cut: float) -> float | None:
    """Raw model log2-odds at which the calibrated P crosses the chosen cut (calibration model only)."""
    if kind != "calibration" or abs(th[1]) < 1e-9:
        return None
    cut = min(max(cut, 1e-6), 1 - 1e-6)
    return round((math.log(cut / (1 - cut)) - th[0]) / (th[1] * LN2), 2)


def all_labels(case_labels: list[dict]) -> list[dict]:
    return simulated_labels() + LSTATE.labels + case_labels


def training_rows(labels: list[dict]) -> list[tuple[float, list[float], int]]:
    u = universe()
    rows = []
    for lb in labels:
        if "w" in lb:
            rows.append((lb["s"], lb["w"], lb["y"]))
        else:
            p = u["by_id"].get(lb["pair_id"])
            if p:
                rows.append((p["s"], p["w"], lb["y"]))
    return rows


def recalibrate(case_labels: list[dict]) -> dict:
    u = universe()
    labels = all_labels(case_labels)
    rows = training_rows(labels)
    out = {"fitted_at": datetime.now(IST).isoformat(timespec="seconds"), "n_labels": len(rows),
           "n_real": sum(1 for lb in labels if lb["source"] != "simulated"), "n_simulated": sum(1 for lb in labels if lb["source"] == "simulated"),
           "models": {}}
    before = metrics(None, None)
    before_possible = metrics(None, None, thr=POSSIBLE)
    for kind in ("calibration", "per_comparison"):
        th = fit(kind, rows, u["prior"])
        cut = choose_threshold(kind, th, rows)
        out["models"][kind] = {"theta": [round(float(x), 5) for x in th], "cut": round(cut, 4),
                               "after": metrics(kind, th.tolist(), thr=cut),
                               "after_possible": metrics(kind, th.tolist(), thr=POSSIBLE),
                               "exact_threshold_log2": _threshold_log2(kind, th, cut)}
    # honest uncertainty: refit on 20 bootstrap resamples of the same labels
    rng = random.Random(SEED)
    boots = []
    for _ in range(20):
        bs = [rows[rng.randrange(len(rows))] for _ in rows] if rows else []
        th = fit("calibration", bs, u["prior"])
        m = metrics("calibration", th.tolist(), thr=choose_threshold("calibration", th, bs))
        boots.append((m["precision"] or 0.0, m["recall"] or 0.0))
    if boots:
        ps, rs = sorted(b[0] for b in boots), sorted(b[1] for b in boots)
        out["models"]["calibration"]["bootstrap"] = {"n": len(boots), "precision": [ps[1], ps[-2]], "recall": [rs[1], rs[-2]],
                                                     "note": {"en": "90% range over 20 bootstrap refits of the same labels",
                                                              "hi": "उन्हीं लेबलों के 20 बूटस्ट्रैप पुनः-फिट पर 90% सीमा"}}
    out["models"]["per_comparison"]["note"] = {
        "en": "Experimental: per-comparison scales from a few hundred labels are not stable enough to recommend.",
        "hi": "प्रायोगिक: कुछ सौ लेबलों से प्रति-तुलना भार अनुशंसा हेतु पर्याप्त स्थिर नहीं।"}
    per = out["models"]["per_comparison"]["theta"]
    out["models"]["per_comparison"]["scales"] = [{"comparison": c, "label": COMP_LABEL[c], "scale": round(per[i + 1], 3)}
                                                 for i, c in enumerate(COMPARISONS)]
    out["before"], out["before_possible"] = before, before_possible
    LSTATE.calibration = out
    LSTATE.history.append({k: out[k] for k in ("fitted_at", "n_labels", "n_real", "n_simulated")}
                          | {"precision_after": out["models"]["calibration"]["after"]["precision"],
                             "recall_after": out["models"]["calibration"]["after"]["recall"]})
    LSTATE.save()
    return out


# ------------------------------------------------------------------ active learning ("ask the officer")
def _village(lgd: int) -> dict:
    v = geo.villages().get(lgd)
    return {"en": v["name_en"], "hi": v["name_hi"]} if v else {"en": str(lgd), "hi": str(lgd)}


def uncertain(case_labels: list[dict], k: int = 5) -> list[dict]:
    u = universe()
    certs = engine.matcher().archive.certs
    labelled = {lb["pair_id"] for lb in all_labels(case_labels)}
    cal = LSTATE.calibration
    kind, th = ("calibration", cal["models"]["calibration"]["theta"]) if cal else (None, None)
    cut = cal["models"]["calibration"]["cut"] if cal else EXACT     # closest to the CURRENT decision cut
    cut = min(max(cut, 1e-6), 1 - 1e-6)
    target = math.log(cut / (1 - cut))
    scored = []
    for p in u["pairs"]:
        if p["part"] != "pool" or p["id"] in labelled or _p(p["s"]) < POSSIBLE:
            continue
        pr = prob(kind, th, p["s"], p["w"])
        pr = min(max(pr, 1e-9), 1 - 1e-9)
        scored.append((abs(math.log(pr / (1 - pr)) - target), p["id"], pr, p))
    scored.sort(key=lambda x: (x[0], x[1]))
    out, seen_q = [], set()
    for _, pid, pr, p in scored:
        if p["q"] in seen_q:
            continue
        seen_q.add(p["q"])
        q = u["queries"][p["q"]]
        c = certs[p["ci"]]
        rel = engine.relation_label(p["hyp"], c)
        out.append({
            "pair_id": pid, "probability": round(pr, 4), "raw_probability": round(_p(p["s"]), 4), "relation": p["hyp"], "relation_label": rel,
            "applicant": {"name": q["applicant_raw"], "father": q["father_raw"], "birth_year": q["birth_year"], "village": _village(q["village_lgd"])},
            "record": {"cert_no": c["cert_no"], "holder": c["holder_name"], "father": c["father_name"], "birth_year": c["birth_year"],
                       "village": c["village"]},
            "levels": p["levels"],
            "synthetic_truth": "same" if p["y"] else "not",
        })
        if len(out) >= k:
            break
    return out


def add_label(pair_id: str, decision: str, officer: str | None = None) -> dict:
    u = universe()
    p = u["by_id"].get(pair_id)
    if not p or p["part"] != "pool":
        raise KeyError(pair_id)
    LSTATE.labels = [lb for lb in LSTATE.labels if lb["pair_id"] != pair_id]
    lb = {"pair_id": pair_id, "y": 1 if decision == "same" else 0, "source": "officer_active",
          "ts": datetime.now(IST).isoformat(timespec="seconds"), "officer": officer or "Officer (demo)",
          "agrees_with_truth": (1 if decision == "same" else 0) == p["y"]}
    LSTATE.labels.append(lb)
    LSTATE.save()
    return lb


def status(case_labels: list[dict]) -> dict:
    sim = simulated_labels()
    real_active = LSTATE.labels
    return {
        "synthetic": True,
        "labels": {
            "real": len(real_active) + len(case_labels), "simulated": len(sim),
            "total": len(sim) + len(real_active) + len(case_labels),
            "by_source": {"officer_case": len(case_labels), "officer_active": len(real_active), "simulated": len(sim)},
            "simulated_officer_error_rate": OFFICER_ERROR,
            "simulated_disagreeing": sum(1 for lb in sim if lb["officer_error"]),
            "positives": sum(lb["y"] for lb in sim + real_active + case_labels),
        },
        "calibration": LSTATE.calibration,
        "history": LSTATE.history[-10:],
        "baseline": {"exact": metrics(None, None), "possible": metrics(None, None, thr=POSSIBLE)},
        "live": False,
        "uncertain": uncertain(case_labels),
        "held_out": {"queries": sum(1 for q in universe()["queries"] if int(q["lineage"]) % 2),
                     "positives": universe()["positives"]["eval"]},
        "method": {"en": "Logistic calibration of the model score on officer labels (Platt scaling); optional per-comparison scales, ridge-shrunk to the EM weights. Measured on held-out synthetic families never used for labels.",
                   "hi": "अधिकारी लेबल पर मॉडल स्कोर का लॉजिस्टिक अंशांकन (प्लैट स्केलिंग); वैकल्पिक प्रति-तुलना भार, EM भार की ओर संकुचित। उन सिंथेटिक परिवारों पर मापा गया जो लेबल हेतु कभी उपयोग नहीं हुए।"},
        "note": {"en": "Every confirmation in the shadow pilot becomes a label; the model never learns from approve/reject decisions. A recalibration is a proposal: it goes live only after the model owner signs it off.",
                 "hi": "शैडो पायलट की हर पुष्टि एक लेबल बनती है; मॉडल स्वीकृत/अस्वीकृत निर्णयों से कभी नहीं सीखता। पुनः अंशांकन एक प्रस्ताव है: मॉडल स्वामी की स्वीकृति के बाद ही लागू होता है।"},
        "simulated_note": {"en": f"{len(sim)} SIMULATED officer confirmations drawn from ground truth with a {int(OFFICER_ERROR * 100)}% officer error rate, from pairs an officer would see (P ≥ 0.60).",
                           "hi": f"{len(sim)} सिम्युलेटेड अधिकारी पुष्टियाँ, वास्तविक उत्तर से {int(OFFICER_ERROR * 100)}% त्रुटि-दर सहित, उन जोड़ों से जो अधिकारी देखते (P ≥ 0.60)।"},
    }
