"""Train the lineage record-linkage model with Splink v4 (DuckDB), Fellegi-Sunter + EM.

Unsupervised: labels are NOT used for training (only by evaluate.py, on held-out families).
Candidate pairs = (applicant, certificate, hypothesis) where the hypothesis is
"father" (applicant's father's name vs the certificate HOLDER) or "sibling"
(applicant's father's name vs the FATHER'S NAME on the certificate).

Outputs:
  model/splink_model.json   Splink's own saved settings (m/u per level)
  model/model.json          compact runtime model read by matcher.py

Run:  uv run python train_model.py
"""
from __future__ import annotations

import json
import math
import time
from datetime import date
from pathlib import Path

import pandas as pd
import splink.comparison_level_library as cll
import splink.comparison_library as cl
from splink import DuckDBAPI, Linker, SettingsCreator

import geo
from matcher import HYP, NEAR
from normalise import norm

OUT = Path(__file__).parent / "model"
OUT.mkdir(exist_ok=True)


def load_tables(split: str = "train") -> tuple[pd.DataFrame, pd.DataFrame]:
    certs = json.load(open(geo.SYN / "certificate_archive.json", encoding="utf-8"))
    q = pd.read_csv(geo.SYN / "lineage_queries.csv")
    q = q[q["split"] == split]
    left = []
    for r in q.itertuples():
        n, a = norm(r.father_raw), norm(r.applicant_raw)
        for hyp in HYP:
            left.append({
                "uid": f"{r.query_id}|{hyp}", "hyp": hyp,
                "rel_given": n.given or None, "rel_given_skel": n.given_skel or None,
                "rel_surname": n.surname or None, "rel_surname_skel": n.surname_skel or None,
                "village_lgd": int(r.village_lgd), "tehsil_lgd": int(r.tehsil_lgd), "district_lgd": int(r.district_lgd),
                "by_q": int(r.birth_year), "by_lo": None, "by_hi": None, "by_near_lo": None, "by_near_hi": None,
                "self_given": a.given, "self_by": int(r.birth_year),
            })
    right = []
    for c in certs:
        holder = norm(c["_holder_raw"])
        for hyp, raw in (("father", c["_holder_raw"]), ("sibling", c["_father_raw"])):
            n = norm(raw)
            lo, hi = c["birth_year"] + HYP[hyp]["lo"], c["birth_year"] + HYP[hyp]["hi"]
            right.append({
                "uid": f"{c['cert_no']}|{hyp}", "hyp": hyp,
                "rel_given": n.given or None, "rel_given_skel": n.given_skel or None,
                "rel_surname": n.surname or None, "rel_surname_skel": n.surname_skel or None,
                "village_lgd": c["village_lgd"], "tehsil_lgd": c["_tehsil_lgd"], "district_lgd": c["district_lgd"],
                "by_q": None, "by_lo": lo, "by_hi": hi, "by_near_lo": lo - NEAR, "by_near_hi": hi + NEAR,
                "self_given": holder.given, "self_by": c["birth_year"],
            })
    return pd.DataFrame(left), pd.DataFrame(right)


# pair orientation (applicant on the left or right) is not guaranteed, so conditions are symmetric
GAP_PLAUS = "((by_q_l BETWEEN by_lo_r AND by_hi_r) OR (by_q_r BETWEEN by_lo_l AND by_hi_l))"
GAP_NEAR = "((by_q_l BETWEEN by_near_lo_r AND by_near_hi_r) OR (by_q_r BETWEEN by_near_lo_l AND by_near_hi_l))"
GAP_NULL = "(coalesce(by_q_l, by_q_r) IS NULL)"

# The applicant's own earlier certificate is not a relative's (deterministic rule, same as matcher.is_self)
NOT_SELF = ("NOT (l.hyp = 'sibling' AND jaro_winkler_similarity(l.self_given, r.self_given) >= 0.88 "
            "AND abs(l.self_by - r.self_by) <= 2)")

BLOCK_DIST_SURNAME = f"l.hyp = r.hyp AND l.district_lgd = r.district_lgd AND l.rel_surname_skel = r.rel_surname_skel AND {NOT_SELF}"
BLOCK_VILLAGE = f"l.hyp = r.hyp AND l.village_lgd = r.village_lgd AND {NOT_SELF}"
BLOCK_EM_GIVEN_GAP = ("l.hyp = r.hyp AND l.rel_given = r.rel_given AND ((l.by_q BETWEEN r.by_lo AND r.by_hi) "
                      f"OR (r.by_q BETWEEN l.by_lo AND l.by_hi)) AND {NOT_SELF}")
BLOCK_NAMES = f"l.hyp = r.hyp AND l.rel_given_skel = r.rel_given_skel AND l.rel_surname_skel = r.rel_surname_skel AND {NOT_SELF}"


def comparisons():
    given = cl.CustomComparison(
        output_column_name="given_name",
        comparison_levels=[
            cll.NullLevel("rel_given"),
            cll.ExactMatchLevel("rel_given").configure(label_for_charts="exact", m_probability=0.70),
            cll.CustomLevel("rel_given_skel_l = rel_given_skel_r", label_for_charts="skeleton").configure(m_probability=0.12),
            cll.CustomLevel("jaro_winkler_similarity(rel_given_l, rel_given_r) >= 0.92", label_for_charts="jw>=0.92").configure(m_probability=0.08),
            cll.CustomLevel("jaro_winkler_similarity(rel_given_l, rel_given_r) >= 0.80", label_for_charts="jw>=0.80").configure(m_probability=0.05),
            cll.ElseLevel().configure(label_for_charts="else", m_probability=0.05),
        ],
    )
    surname = cl.CustomComparison(
        output_column_name="surname",
        comparison_levels=[
            cll.NullLevel("rel_surname"),
            cll.ExactMatchLevel("rel_surname").configure(label_for_charts="exact", m_probability=0.80),
            cll.CustomLevel("rel_surname_skel_l = rel_surname_skel_r", label_for_charts="skeleton").configure(m_probability=0.12),
            cll.CustomLevel("jaro_winkler_similarity(rel_surname_l, rel_surname_r) >= 0.85", label_for_charts="jw>=0.85").configure(m_probability=0.05),
            cll.ElseLevel().configure(label_for_charts="else", m_probability=0.03),
        ],
    )
    place = cl.CustomComparison(
        output_column_name="place",
        comparison_levels=[
            cll.NullLevel("district_lgd"),
            cll.CustomLevel("village_lgd_l = village_lgd_r", label_for_charts="same_village").configure(m_probability=0.80),
            cll.CustomLevel("tehsil_lgd_l = tehsil_lgd_r", label_for_charts="same_tehsil").configure(m_probability=0.08),
            cll.CustomLevel("district_lgd_l = district_lgd_r", label_for_charts="same_district").configure(m_probability=0.07),
            cll.ElseLevel().configure(label_for_charts="else", m_probability=0.05),
        ],
    )
    gap = cl.CustomComparison(
        output_column_name="birth_gap",
        comparison_levels=[
            cll.CustomLevel(GAP_NULL, label_for_charts="null").configure(is_null_level=True),
            cll.CustomLevel(GAP_PLAUS, label_for_charts="plausible").configure(m_probability=0.90),
            cll.CustomLevel(GAP_NEAR, label_for_charts="near").configure(m_probability=0.07),
            cll.ElseLevel().configure(label_for_charts="implausible", m_probability=0.03),
        ],
    )
    return [given, surname, place, gap]


def build_linker(left: pd.DataFrame, right: pd.DataFrame) -> Linker:
    settings = SettingsCreator(
        link_type="link_only",
        unique_id_column_name="uid",
        comparisons=comparisons(),
        blocking_rules_to_generate_predictions=[BLOCK_DIST_SURNAME, BLOCK_VILLAGE, BLOCK_NAMES],
        retain_intermediate_calculation_columns=True,
        retain_matching_columns=True,
    )
    return Linker([left, right], settings, db_api=DuckDBAPI(), input_table_aliases=["a_applicants", "b_archive"])


def main():
    t0 = time.time()
    left, right = load_tables("train")
    print(f"training rows: applicants x hyp = {len(left)}, certificates x hyp = {len(right)}")
    linker = build_linker(left, right)

    # 1. prior: probability two random records match, from a high-precision deterministic rule
    linker.training.estimate_probability_two_random_records_match(
        [f"l.hyp = r.hyp AND l.rel_given = r.rel_given AND l.rel_surname = r.rel_surname "
         f"AND l.village_lgd = r.village_lgd AND {NOT_SELF}"], recall=0.6)
    # 2. u probabilities from random pairs (almost all non-matches)
    linker.training.estimate_u_using_random_sampling(max_pairs=3e6, seed=7)
    # 3. m probabilities by EM (initialised from weak domain priors), three sessions with different blocking so every comparison is trained
    #    session A (same district + surname skeleton): learns given-name and birth-gap m
    linker.training.estimate_parameters_using_expectation_maximisation(BLOCK_DIST_SURNAME)
    #    session B (same given name + plausible birth gap, state-wide): learns surname and place m
    linker.training.estimate_parameters_using_expectation_maximisation(BLOCK_EM_GIVEN_GAP)
    #    (a village-blocked session was tried and rejected: inside a village EM latches on to
    #     "same household surname" instead of the relative link — see README notes)

    splink_path = OUT / "splink_model.json"
    linker.misc.save_model_to_json(str(splink_path), overwrite=True)
    export(json.loads(splink_path.read_text()), n_left=len(left), n_right=len(right), seconds=time.time() - t0)

    # sanity: compare Splink's gamma levels with matcher.py's pure-Python levels on predicted pairs
    check_parity(linker)


def export(sm: dict, n_left: int, n_right: int, seconds: float):
    # Splink's lambda is over the full cartesian product of the two (hypothesis-doubled) tables.
    # Half of those pairs are cross-hypothesis (father-view vs sibling-view) and can never be
    # compared (every blocking rule requires l.hyp = r.hyp), so the prior for a comparable pair is 2x.
    lam_splink = sm["probability_two_random_records_match"]
    lam = 2 * lam_splink
    comps = []
    for comp in sm["comparisons"]:
        levels = []
        for lv in comp["comparison_levels"]:
            name = lv.get("label_for_charts") or "null"
            if lv.get("is_null_level"):
                name = "null"
                levels.append({"level": name, "m": None, "u": None, "weight": 0.0})
                continue
            m, u = lv.get("m_probability"), lv.get("u_probability")
            w = math.log2(m / u) if m and u else 0.0
            levels.append({"level": name, "m": m, "u": u, "weight": round(w, 4)})
        comps.append({"name": comp["output_column_name"], "levels": levels})
    model = {
        "model": "Splink Fellegi–Sunter (EM)",
        "model_version": f"lineage-fs-splink-{date.today().isoformat()}",
        "trained_on": {"applicant_rows": n_left, "certificate_rows": n_right,
                       "description": "SYNTHETIC Chhattisgarh population, training families only (70%)",
                       "seconds": round(seconds, 1)},
        "probability_two_random_records_match": lam,
        "splink_lambda_full_cartesian": lam_splink,
        "prior_log2_odds": round(math.log2(lam / (1 - lam)), 4),
        "thresholds": {"exact": 0.95, "possible": 0.60},
        "comparisons": comps,
    }
    (OUT / "model.json").write_text(json.dumps(model, indent=1, ensure_ascii=False))
    print(json.dumps(model, indent=1)[:3000])


def check_parity(linker: Linker, n: int = 20000):
    from matcher import COMPARISONS, level_gap, level_given, level_surname

    df = linker.inference.predict().as_pandas_dataframe(limit=n)
    labels = {}
    sm = json.loads((OUT / "splink_model.json").read_text())
    for comp in sm["comparisons"]:
        # gamma index -> label; Splink numbers levels from the top, null = -1
        lv = [x for x in comp["comparison_levels"] if not x.get("is_null_level")]
        k = len(lv)
        labels[comp["output_column_name"]] = {k - 1 - i: (x.get("label_for_charts")) for i, x in enumerate(lv)}
        labels[comp["output_column_name"]][-1] = "null"
    bad = 0
    for r in df.itertuples():
        d = r._asdict()
        py = {
            "given_name": level_given(d["rel_given_l"] or "", d["rel_given_skel_l"] or "", d["rel_given_r"] or "", d["rel_given_skel_r"] or ""),
            "surname": level_surname(d["rel_surname_l"] or "", d["rel_surname_skel_l"] or "", d["rel_surname_r"] or "", d["rel_surname_skel_r"] or ""),
        }
        for comp in ("given_name", "surname"):
            if labels[comp][d[f"gamma_{comp}"]] != py[comp]:
                bad += 1
                if bad <= 5:
                    print("parity mismatch", comp, labels[comp][d[f"gamma_{comp}"]], py[comp], d["rel_given_l"], d["rel_given_r"])
    print(f"parity check on {len(df)} predicted pairs: {bad} level mismatches (name comparisons)")


if __name__ == "__main__":
    main()
