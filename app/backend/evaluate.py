"""Evaluate the lineage matcher on HELD-OUT synthetic families (30% of lineages, never used
for training) against the generator's ground truth. Writes model/eval.json in the
/api/eval shape.

A candidate pair is (applicant, archived certificate). It is a TRUE link when the
certificate holder is the applicant's father or a sibling (ground truth from
population.csv). Recall counts every true link in the archive, including those the
blocking never surfaced (so blocking misses are counted as misses).

Run:  uv run python evaluate.py
"""
from __future__ import annotations

import csv
import json
import time
from collections import defaultdict
from pathlib import Path

import geo
from matcher import Matcher, prob_from_log2
from normalise import norm

OUT = Path(__file__).parent / "model"
EXACT, POSSIBLE = 0.95, 0.60


def inr(n: int) -> str:
    """Indian digit grouping (3,92,604), as elsewhere on screen."""
    s = str(n)
    if len(s) <= 3:
        return s
    head, tail, parts = s[:-3], s[-3:], []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts) + "," + tail


def load():
    certs = json.load(open(geo.SYN / "certificate_archive.json", encoding="utf-8"))
    father_of = {}
    with open(geo.SYN / "population.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            father_of[int(r["pid"])] = int(r["father_id"]) if r["father_id"] else None
    queries = []
    with open(geo.SYN / "lineage_queries.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["split"] != "test":
                continue
            for k in ("person_id", "father_id", "birth_year", "village_lgd", "tehsil_lgd", "district_lgd"):
                r[k] = int(r[k])
            queries.append(r)
    return certs, father_of, queries


def truth_for(q, certs_by_holder, kids_of):
    """cert_idx -> relation for every archived certificate of a father/sibling."""
    out = {}
    for ci in certs_by_holder.get(q["father_id"], []):
        out[ci] = "father"
    for sib in kids_of.get(q["father_id"], []):
        if sib == q["person_id"]:
            continue
        for ci in certs_by_holder.get(sib, []):
            out[ci] = "sibling"
    return out


def prf(tp, fp, fn):
    p = tp / (tp + fp) if tp + fp else None
    r = tp / (tp + fn) if tp + fn else None
    f1 = 2 * p * r / (p + r) if p and r else None
    rnd = lambda x: round(x, 4) if x is not None else None
    return rnd(p), rnd(r), rnd(f1)


def native_village_slice(m, certs, queries, certs_by_holder, kids_of) -> dict:
    """Round 7: women applicants when the native (maiden) village is ALSO searched. Simulation: for every married woman
    in the held-out set the native village (her birth village in the synthetic population) is known and searched as
    well, as the officer / Kendra operator would when the applicant states it. Scores from both searches are merged
    per certificate (max). Unmarried women and women whose native village is their current village are scored as
    before. This does not change any other number in this file."""
    birth_village = {}
    with open(geo.SYN / "population.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            birth_village[int(r["pid"])] = int(r["birth_village_lgd"])

    def query_of(q, lgd=None):
        pl = geo.place(lgd) if lgd else None
        return {"father_raw": q["father_raw"], "applicant_raw": q["applicant_raw"], "birth_year": q["birth_year"],
                "village_lgd": pl["village_lgd"] if pl else q["village_lgd"],
                "tehsil_lgd": pl["tehsil_lgd"] if pl else q["tehsil_lgd"],
                "district_lgd": pl["district_lgd"] if pl else q["district_lgd"]}

    rows = {"women_before": [], "women_after": [], "married_before": [], "married_after": []}
    searched = 0
    for q in queries:
        if q["gender"] != "F":
            continue
        truth = truth_for(q, certs_by_holder, kids_of)
        before = m.score_all(query_of(q))
        after = dict(before)
        married = str(q.get("married")) == "1"
        nat = birth_village.get(q["person_id"]) if married else None
        if nat and nat != q["village_lgd"]:
            searched += 1
            for ci, (lo, hyp) in m.score_all(query_of(q, nat)).items():
                if ci not in after or lo > after[ci][0]:
                    after[ci] = (lo, hyp)
        for key, scored in (("before", before), ("after", after)):
            out = [(prob_from_log2(lo), ci in truth) for ci, (lo, _) in scored.items()]
            out += [(0.0, True) for ci in truth if ci not in scored]   # never surfaced by blocking = a miss
            rows[f"women_{key}"] += out
            if married:
                rows[f"married_{key}"] += out

    def pr(rs, thr):
        tp = sum(1 for p, t in rs if p >= thr and t)
        fp = sum(1 for p, t in rs if p >= thr and not t)
        fn = sum(1 for p, t in rs if p < thr and t)
        p, r, _ = prf(tp, fp, fn)
        return {"precision": p, "recall": r, "positives": tp + fn, "n": len(rs)}

    res = {k: {"exact": pr(v, EXACT), "possible": pr(v, POSSIBLE)} for k, v in rows.items()}
    after = res["women_after"]
    return {
        "slice": {"key": "women_native_village",
                  "name": {"en": "Women applicants, with native-village search (maiden village also searched for married women)",
                           "hi": "महिला आवेदक, मायके / मूल गांव की खोज सहित (विवाहित महिलाओं हेतु मायके का गांव भी खोजा गया)"},
                  "n": after["exact"]["n"], "positives": after["exact"]["positives"],
                  "precision": after["exact"]["precision"], "recall": after["exact"]["recall"],
                  "precision_possible": after["possible"]["precision"], "recall_possible": after["possible"]["recall"],
                  "note": {"en": "Simulation: the native village is known for every married woman in the held-out set (an upper bound; in practice only when she states it).",
                           "hi": "अनुकरण: परीक्षण-समूह की हर विवाहित महिला का मायके का गांव ज्ञात माना गया (ऊपरी सीमा; व्यवहार में केवल जब वह बताएं)।"}},
        "women_queries_with_native_search": searched,
        "women": {"before": res["women_before"], "after": res["women_after"]},
        "married_women": {"before": res["married_before"], "after": res["married_after"]},
        "assumption": {"en": "Native village = the woman's birth village in the synthetic population, searched in addition to her current village; scores merged per certificate (max). Synthetic data.",
                       "hi": "मायके का गांव = नमूना जनसंख्या में महिला का जन्म-गांव, वर्तमान गांव के अतिरिक्त खोजा गया; प्रत्येक प्रमाण पत्र का अधिकतम अंक लिया गया। नमूना (सिंथेटिक) डेटा।"},
    }


def main():
    t0 = time.time()
    certs, father_of, queries = load()
    m = Matcher(certs)
    certs_by_holder = defaultdict(list)
    for i, c in enumerate(certs):
        certs_by_holder[c["_person_id"]].append(i)
    kids_of = defaultdict(list)
    for pid, fid in father_of.items():
        if fid:
            kids_of[fid].append(pid)

    rows = []   # (prob, is_true, rel_ok, slices:set)
    n_pos_total = 0
    missed_by_blocking = 0
    for q in queries:
        qn = norm(q["father_raw"])
        query = {"father_raw": q["father_raw"], "applicant_raw": q["applicant_raw"], "birth_year": q["birth_year"],
                 "village_lgd": q["village_lgd"], "tehsil_lgd": q["tehsil_lgd"], "district_lgd": q["district_lgd"]}
        truth = truth_for(q, certs_by_holder, kids_of)
        scored = m.score_all(query)
        base = set()
        if q["division"] in ("Bastar", "Surguja"):
            base.add("tribal_div")
        else:
            base.add("plains")
        if q["gender"] == "F":
            base.add("women")
        seen = set()
        for ci, (lo, hyp) in scored.items():
            c = certs[ci]
            sl = set(base)
            if c["village_lgd"] == q["village_lgd"] and norm(c["_holder_raw"]).surname_skel == qn.surname_skel:
                sl.add("hard")
            if c["_script"] != q["script"]:
                sl.add("cross_script")
            is_true = ci in truth
            rows.append((prob_from_log2(lo), is_true, is_true and truth[ci] == hyp, sl))
            seen.add(ci)
        for ci, rel in truth.items():
            n_pos_total += 1
            if ci not in seen:
                missed_by_blocking += 1
                c = certs[ci]
                sl = set(base)
                if c["village_lgd"] == q["village_lgd"] and norm(c["_holder_raw"]).surname_skel == qn.surname_skel:
                    sl.add("hard")
                if c["_script"] != q["script"]:
                    sl.add("cross_script")
                rows.append((0.0, True, False, sl))

    def metrics(filter_fn, thr):
        tp = fp = fn = 0
        n = 0
        for p, t, _, sl in rows:
            if not filter_fn(sl):
                continue
            n += 1
            if p >= thr and t:
                tp += 1
            elif p >= thr and not t:
                fp += 1
            elif t:
                fn += 1
        return n, tp, fp, fn

    n_all, tp, fp, fn = metrics(lambda s: True, EXACT)
    p_e, r_e, f_e = prf(tp, fp, fn)
    _, tp2, fp2, fn2 = metrics(lambda s: True, POSSIBLE)
    p_p, r_p, f_p = prf(tp2, fp2, fn2)
    rel_ok = sum(1 for p, t, ok, _ in rows if p >= EXACT and t and ok)

    slice_defs = [
        ("hard", {"en": "Same village & common surname (the relative is in the candidate set; the test is telling families apart)", "hi": "एक ही ग्राम व सामान्य उपनाम (संबंधी उम्मीदवार-सूची में रहता है; परीक्षा परिवारों को अलग पहचानना है)"}),
        ("tribal_div", {"en": "Bastar & Surguja divisions", "hi": "बस्तर और सरगुजा संभाग"}),
        ("plains", {"en": "Plains divisions (Raipur, Durg, Bilaspur)", "hi": "मैदानी संभाग (रायपुर, दुर्ग, बिलासपुर)"}),
        ("women", {"en": "Women applicants", "hi": "महिला आवेदक"}),
        ("cross_script", {"en": "Cross-script (Devanagari ↔ Latin)", "hi": "भिन्न लिपि (देवनागरी ↔ लैटिन)"}),
    ]
    slices = []
    for key, name in slice_defs:
        n, a, b, c = metrics(lambda s, k=key: k in s, EXACT)
        p, r, _ = prf(a, b, c)
        n2, a2, b2, c2 = metrics(lambda s, k=key: k in s, POSSIBLE)
        p2, r2, _ = prf(a2, b2, c2)
        slices.append({"name": name, "n": n, "positives": a + c, "precision": p, "recall": r,
                       "precision_possible": p2, "recall_possible": r2})

    native = native_village_slice(m, certs, queries, certs_by_holder, kids_of)
    slices.append(native.pop("slice"))

    model = json.loads((OUT / "model.json").read_text())
    weights = []
    for comp in model["comparisons"]:
        for lv in comp["levels"]:
            if lv["level"] == "null":
                continue
            weights.append({"comparison": comp["name"], "level": lv["level"], "m": lv["m"], "u": lv["u"],
                            "weight": lv["weight"]})

    out = {
        "model": model["model"],
        "model_version": model["model_version"],
        "test_set": {
            "pairs": n_all, "positives": n_pos_total, "queries": len(queries),
            "description": {
                "en": (f"SYNTHETIC held-out families (30% of lineages, unseen in training): {inr(len(queries))} applicants, "
                       f"{inr(n_all)} scored applicant–certificate pairs, {inr(n_pos_total)} true father/sibling certificates. "
                       f"{missed_by_blocking} true links were never surfaced by blocking and count as misses."),
                "hi": (f"नमूना (सिंथेटिक) परीक्षण परिवार (30% वंश, प्रशिक्षण में शामिल नहीं): {inr(len(queries))} आवेदक, "
                       f"{inr(n_all)} आवेदक–प्रमाण पत्र जोड़े, {inr(n_pos_total)} वास्तविक पिता/भाई-बहन प्रमाण पत्र।"),
            },
        },
        "thresholds": {"exact": EXACT, "possible": POSSIBLE},
        "overall": {"precision": p_e, "recall": r_e, "f1": f_e},
        "overall_possible": {"precision": p_p, "recall": r_p, "f1": f_p},
        "relation_correct_at_exact": round(rel_ok / tp, 4) if tp else None,
        "blocking_recall": round(1 - missed_by_blocking / n_pos_total, 4) if n_pos_total else None,
        "slices": slices,
        "native_village_search": native,
        "weights_learned": weights,
        "honesty_note": {
            "en": "Measured on synthetic data generated by us; real-archive accuracy must be re-measured on a labelled sample before any pilot.",
            "hi": "यह माप हमारे द्वारा बनाए गए नमूना डेटा पर है; किसी भी पायलट से पहले वास्तविक अभिलेखों के लेबल किए गए नमूने पर पुनः मापना आवश्यक है।",
        },
        "seconds": round(time.time() - t0, 1),
    }
    (OUT / "eval.json").write_text(json.dumps(out, indent=1, ensure_ascii=False))
    print(json.dumps({k: out[k] for k in ("test_set", "overall", "overall_possible", "relation_correct_at_exact",
                                          "blocking_recall", "seconds")}, indent=1, ensure_ascii=False))
    nv = out["native_village_search"]
    print(f"  native-village search (women): exact {nv['women']['before']['exact']} -> {nv['women']['after']['exact']}")
    print(f"  native-village search (married women): exact {nv['married_women']['before']['exact']} -> {nv['married_women']['after']['exact']}")
    for s in slices:
        print(f"  {s['name']['en']:45} n={s['n']:6} pos={s['positives']:5} P={s['precision']} R={s['recall']}  "
              f"(possible: P={s['precision_possible']} R={s['recall_possible']})")


if __name__ == "__main__":
    main()
