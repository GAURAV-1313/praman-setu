"""Round 8a: family knowledge graph + integrity analytics (networkx). ALL PERSON DATA SYNTHETIC.

The graph: people are nodes; father/mother -> child and spouse edges come from the synthetic population register
(in production they would come ONLY from officer-confirmed links: every "same family" confirmation adds an edge);
certificates from the archive hang off their holders.

Four integrity signals ("needs a look", never "fraud"; CATEGORY labels only — ST/SC/OBC — never community names):
  a) category_conflict      children of one father (or father and child) hold certificates / claims in different categories
  b) cancelled_relative     a relative's certificate is cancelled or under scrutiny, and family members hold active
                            certificates that may have relied on it
  c) duplicate_identity     the same person appears certified twice with different details (matched by normalised
                            name + father's name + district, birth year within 5; namesakes can trigger it — hence "look")
  d) tehsildar_permanent    a PERMANENT caste certificate issued by a Tehsildar (competent-authority policy check)

The generated archive is clean for (a) and (c), so the statewide view plants a small, DETERMINISTIC overlay at known
rates (never in the demo families, never in the archive the matcher uses) and reports planted vs found — a test of the
detector, labelled as such. The per-application family view uses the untouched archive.
"""
from __future__ import annotations

import copy
import csv
import random
from collections import Counter, defaultdict
from functools import lru_cache

import networkx as nx

import engine
import geo
from normalise import norm

CASTE_SERVICES = {"caste_st", "caste_sc", "caste_obc"}
PLANT_SEED = 20260929
PLANT_CATEGORY_FAMILIES = 30
PLANT_DUPLICATES = 20
OTHER_CAT = {"ST": "OBC", "SC": "OBC", "OBC": "SC"}

SIGNALS = {
    "category_conflict": {
        "title": {"en": "Category differs within one family", "hi": "एक ही परिवार में श्रेणी भिन्न"},
        "explanation": {"en": "Children of the same father (or father and child) hold certificates or claims in different categories. Needs a look: one entry may be a data-entry slip, or the family's status needs a field report.",
                        "hi": "एक ही पिता की संतानों (या पिता व संतान) के प्रमाण पत्र / दावे भिन्न श्रेणी में हैं। देखना आवश्यक: प्रविष्टि की त्रुटि हो सकती है, या परिवार की स्थिति हेतु क्षेत्रीय प्रतिवेदन चाहिए।"},
    },
    "cancelled_relative": {
        "title": {"en": "A relative's certificate is cancelled / under scrutiny", "hi": "संबंधी का प्रमाण पत्र निरस्त / जांचाधीन"},
        "explanation": {"en": "Other family members hold active certificates that may have relied on it. Needs a look at how those were issued; they stay valid until an authority decides.",
                        "hi": "परिवार के अन्य सदस्यों के सक्रिय प्रमाण पत्र संभवतः उसी पर आधारित हैं। वे कैसे जारी हुए, यह देखना आवश्यक; सक्षम प्राधिकारी के निर्णय तक वे वैध रहते हैं।"},
    },
    "duplicate_identity": {
        "title": {"en": "Same person certified twice with different details", "hi": "एक ही व्यक्ति के दो प्रमाण पत्र, विवरण भिन्न"},
        "explanation": {"en": "Two caste certificates with the same name, father's name and district, but a different birth year or category. Could be a namesake or a re-issue; needs a look.",
                        "hi": "एक ही नाम, पिता के नाम व जिले के दो जाति प्रमाण पत्र, पर जन्म-वर्ष या श्रेणी भिन्न। हमनाम या पुनः जारी हो सकता है; देखना आवश्यक।"},
    },
    "tehsildar_permanent": {
        "title": {"en": "Permanent caste certificate issued by a Tehsildar", "hi": "तहसीलदार द्वारा जारी स्थायी जाति प्रमाण पत्र"},
        "explanation": {"en": "Policy check: competent authority for permanent certificates is the SDO (CG HC, Jul 2026). Valid with a note under the current policy setting.",
                        "hi": "नीति जांच: स्थायी प्रमाण पत्र हेतु सक्षम प्राधिकारी अनुविभागीय अधिकारी हैं (छ.ग. उच्च न्यायालय, जुलाई 2026)। वर्तमान नीति में टिप्पणी सहित मान्य।"},
    },
}
SIGNAL_ORDER = list(SIGNALS)


# ------------------------------------------------------------------ data
@lru_cache(maxsize=1)
def population() -> dict[int, dict]:
    out = {}
    with open(geo.SYN / "population.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pid = int(r["pid"])
            out[pid] = {
                "pid": pid, "lineage": r["lineage"], "gen": int(r["gen"]), "gender": r["gender"],
                "birth_year": int(r["birth_year"]), "village_lgd": int(r["village_lgd"]),
                "father_id": int(r["father_id"]) if r["father_id"] else None,
                "mother_id": int(r["mother_id"]) if r["mother_id"] else None,
                "spouse_id": int(r["spouse_id"]) if r["spouse_id"] else None,
                "name": {"en": r["name_en"], "hi": r["name_hi"]},
                "father_name": {"en": r["father_name_en"], "hi": r["father_name_hi"]},
                "split": r["split"],
            }
    return out


def _is_caste(c: dict) -> bool:
    return c["service"] in CASTE_SERVICES


def _district(lgd: int | None) -> dict:
    d = geo.districts().get(lgd or 0)
    return {"en": d["name_en"], "hi": d["name_hi"]} if d else {"en": "—", "hi": "—"}


def build_graph(certs: list[dict]) -> nx.DiGraph:
    """Person nodes p:<pid>, certificate nodes c:<cert_no>. Edges: parent (parent -> child, attr role father/mother),
    spouse (both directions), holds (person -> certificate)."""
    G = nx.DiGraph()
    pop = population()
    for pid, p in pop.items():
        G.add_node(f"p:{pid}", kind="person", pid=pid)
    for pid, p in pop.items():
        for role in ("father", "mother"):
            par = p[f"{role}_id"]
            if par and par in pop:
                G.add_edge(f"p:{par}", f"p:{pid}", kind="parent", role=role)
        if p["spouse_id"] and p["spouse_id"] in pop:
            G.add_edge(f"p:{pid}", f"p:{p['spouse_id']}", kind="spouse")
    for i, c in enumerate(certs):
        cn = f"c:{c['cert_no']}"
        G.add_node(cn, kind="cert", idx=i)
        pid = c.get("_person_id")
        if pid is not None:
            if f"p:{pid}" not in G:
                G.add_node(f"p:{pid}", kind="person", pid=pid)
            G.add_edge(f"p:{pid}", cn, kind="holds")
    return G


def children(G: nx.DiGraph, pnode: str, role: str = "father") -> list[str]:
    return [v for v in G.successors(pnode) if G.edges[pnode, v].get("kind") == "parent" and G.edges[pnode, v].get("role") == role]


def parent(G: nx.DiGraph, pnode: str, role: str = "father") -> str | None:
    for u in G.predecessors(pnode):
        e = G.edges[u, pnode]
        if e.get("kind") == "parent" and e.get("role") == role:
            return u
    return None


def certs_of(G: nx.DiGraph, pnode: str) -> list[int]:
    if pnode not in G:
        return []
    return [G.nodes[v]["idx"] for v in G.successors(pnode) if G.edges[pnode, v].get("kind") == "holds"]


def relatives(G: nx.DiGraph, pnode: str) -> set[str]:
    """Parents, children and siblings (same father) — the paternal circle a certificate can be relied on within."""
    out: set[str] = set()
    f = parent(G, pnode, "father")
    m = parent(G, pnode, "mother")
    for x in (f, m):
        if x:
            out.add(x)
    if f:
        out.update(children(G, f, "father"))
    out.update(children(G, pnode, "father"))
    out.update(children(G, pnode, "mother"))
    out.discard(pnode)
    return out


# ------------------------------------------------------------------ statewide overlay (planted, deterministic)
@lru_cache(maxsize=1)
def overlay() -> dict:
    """A copy of the archive with a known number of planted anomalies (never demo families)."""
    certs = copy.deepcopy(engine.archive())
    G = build_graph(certs)
    pop = population()
    rng = random.Random(PLANT_SEED)
    # (a) flip one child's category in families where >= 2 children of a father hold active caste certificates
    eligible = []
    for pid, p in sorted(pop.items()):
        if p["split"] == "demo" or p["gender"] != "M":
            continue
        kids = children(G, f"p:{pid}")
        kc = [(k, ci) for k in kids for ci in certs_of(G, k) if _is_caste(certs[ci]) and certs[ci]["category"]
              and certs[ci]["status"] == "active"]
        if len({k for k, _ in kc}) >= 2 and len({certs[ci]["category"] for _, ci in kc}) == 1:
            eligible.append((pid, kc))
    planted_cat = []
    for pid, kc in rng.sample(eligible, min(PLANT_CATEGORY_FAMILIES, len(eligible))):
        _, ci = kc[-1]
        certs[ci]["category"] = OTHER_CAT[certs[ci]["category"]]
        certs[ci]["_planted"] = "category_conflict"
        planted_cat.append(pid)
    # (c) re-issue a certificate to the same person with a different birth year (half also with a respelt father name)
    cands = [i for i, c in enumerate(certs) if _is_caste(c) and c["status"] == "active" and c["_person_id"] in pop
             and pop[c["_person_id"]]["split"] != "demo" and "_planted" not in c]
    planted_dup = []
    for n, ci in enumerate(rng.sample(cands, PLANT_DUPLICATES)):
        c = copy.deepcopy(certs[ci])
        c["cert_no"] = c["cert_no"].rsplit("/", 1)[0] + f"/9{n:05d}"
        c["birth_year"] = c["birth_year"] + rng.choice([-4, -3, -2, 2, 3, 4])
        c["issue_date"] = f"{min(int(c['issue_date'][:4]) + 2, 2026)}{c['issue_date'][4:]}"
        if n % 2:
            c["_father_raw"] = c["_father_raw"].replace("a", "aa", 1)
            c["father_name"] = {**c["father_name"], "en": c["_father_raw"]}
        c["_planted"] = "duplicate_identity"
        certs.append(c)
        planted_dup.append(c["_person_id"])
    return {"certs": certs, "planted": {"category_conflict": planted_cat, "duplicate_identity": planted_dup}}


def detect(certs: list[dict], G: nx.DiGraph | None = None, claims: list[dict] | None = None, only_claims: bool = False) -> dict:
    """All four signals over a certificate list (+ optional pending-application claims {pid, father_pid, category, app_id}).
    Returns {code: [hit, ...]}; a hit has family (lineage), district_lgd, pids, cert_nos."""
    G = G or build_graph(certs)
    pop = population()
    lineage = lambda pn: pop.get(G.nodes[pn].get("pid"), {}).get("lineage") if pn in G else None  # noqa: E731
    hits: dict[str, list[dict]] = {k: [] for k in SIGNAL_ORDER}

    # (a) category conflict among a father and his children (certificates + pending claims)
    claims_by_father = defaultdict(list)
    for cl in claims or []:
        if cl.get("father_pid") is not None and cl.get("category"):
            claims_by_father[f"p:{cl['father_pid']}"].append(cl)
    fathers = set(claims_by_father) if only_claims else \
        {pn for pn in G if G.nodes[pn].get("kind") == "person" and children(G, pn)} | set(claims_by_father)
    for f in sorted(fathers):
        if f not in G:
            continue
        members = [f] + children(G, f)
        cats = defaultdict(set)
        certs_used = []
        for pn in members:
            for ci in certs_of(G, pn):
                c = certs[ci]
                if _is_caste(c) and c["category"] and c["status"] != "cancelled":
                    cats[c["category"]].add(pn)
                    certs_used.append(c["cert_no"])
        for cl in claims_by_father.get(f, []):
            cats[cl["category"]].add(f"p:{cl['pid']}")
        if len(cats) > 1:
            dl = next((certs[ci]["district_lgd"] for pn in members for ci in certs_of(G, pn)), None)
            hits["category_conflict"].append({"family": lineage(f), "district_lgd": dl, "father": f,
                                              "categories": sorted(cats), "cert_nos": certs_used,
                                              "app_ids": [cl["app_id"] for cl in claims_by_father.get(f, [])]})

    # (b) cancelled / under-scrutiny certificate with relatives holding active certificates
    for i, c in enumerate(certs):
        if c["status"] == "active" or not _is_caste(c):
            continue
        holder = f"p:{c['_person_id']}"
        if holder not in G:
            continue
        at_risk = [certs[ci]["cert_no"] for r in relatives(G, holder) for ci in certs_of(G, r)
                   if _is_caste(certs[ci]) and certs[ci]["status"] == "active"]
        if at_risk:
            hits["cancelled_relative"].append({"family": lineage(holder), "district_lgd": c["district_lgd"],
                                               "cert_nos": [c["cert_no"]] + at_risk, "status": c["status"],
                                               "at_risk": len(at_risk)})

    # (c) duplicate identity: blocking on normalised name + father's name + district, birth year within 5
    blocks = defaultdict(list)
    for i, c in enumerate(certs):
        if not _is_caste(c):
            continue
        h, fa = norm(c["_holder_raw"]), norm(c["_father_raw"])
        blocks[(h.given_skel, h.surname_skel, fa.given_skel, c["district_lgd"])].append(i)
    for key, idxs in blocks.items():
        if len(idxs) < 2:
            continue
        for a in range(len(idxs)):
            for b in range(a + 1, len(idxs)):
                x, y = certs[idxs[a]], certs[idxs[b]]
                if abs(x["birth_year"] - y["birth_year"]) > 5 or x["gender"] != y["gender"]:
                    continue
                differs = [k for k in ("birth_year", "category") if x[k] != y[k]]
                if norm(x["_father_raw"]).given != norm(y["_father_raw"]).given:
                    differs.append("father_name")
                if differs:
                    hits["duplicate_identity"].append({"family": lineage(f"p:{x['_person_id']}"), "district_lgd": x["district_lgd"],
                                                       "cert_nos": [x["cert_no"], y["cert_no"]], "differs": differs,
                                                       "same_person_truth": x["_person_id"] == y["_person_id"]})

    # (d) permanent caste certificate issued by a Tehsildar
    for c in certs:
        if _is_caste(c) and c["cert_type"] == "permanent" and c["authority_role"] == "Tehsildar":
            hits["tehsildar_permanent"].append({"family": lineage(f"p:{c['_person_id']}"), "district_lgd": c["district_lgd"],
                                                "cert_nos": [c["cert_no"]], "issue_year": int(c["issue_date"][:4])})
    return hits


# ------------------------------------------------------------------ statewide summary
def _claims(entries: dict | None) -> list[dict]:
    out = []
    pop = population()
    for e in (entries or {}).values():
        a, meta = e["application"], e.get("meta") or {}
        cat = engine.claimed_category(a["service"], a.get("claimed_category"))
        pid = meta.get("person_id")
        if not cat or pid is None or a.get("status") != "pending":
            continue
        fp = meta.get("father_id") if meta.get("father_id") is not None else (pop.get(pid) or {}).get("father_id")
        out.append({"pid": pid, "father_pid": fp, "category": cat, "app_id": a["app_id"]})
    return out


@lru_cache(maxsize=1)
def _statewide_hits() -> dict:
    ov = overlay()
    G = build_graph(ov["certs"])
    return {"hits": detect(ov["certs"], G), "G_nodes": G.number_of_nodes(), "G_edges": G.number_of_edges(),
            "families": len({p["lineage"] for p in population().values()})}


def integrity(entries: dict | None = None) -> dict:
    sw = _statewide_hits()
    hits = {k: list(v) for k, v in sw["hits"].items()}
    # pending applications' claims (live queue) add to (a) — e.g. 08841 (claim ST, brother's certificate OBC)
    claim_hits = _claim_hits(entries)
    hits["category_conflict"] += [h for h in claim_hits if h["app_ids"]]
    ov = overlay()
    planted_cat = {population()[p]["lineage"] for p in ov["planted"]["category_conflict"]}
    found_cat = {h["family"] for h in hits["category_conflict"]}
    dup_hits = hits["duplicate_identity"]
    planted_dup_nos = {c["cert_no"] for c in ov["certs"] if c.get("_planted") == "duplicate_identity"}
    found_dup = {n for h in dup_hits for n in h["cert_nos"]} & planted_dup_nos

    by_d: dict[int, Counter] = defaultdict(Counter)
    signals = []
    for code in SIGNAL_ORDER:
        hs = hits[code]
        for h in hs:
            by_d[h["district_lgd"]][code] += 1
        dc = Counter(h["district_lgd"] for h in hs)
        examples = []
        seen = set()
        for h in sorted(hs, key=lambda h: (not h.get("app_ids"), str(h["family"]))):
            if h["family"] in seen:
                continue
            seen.add(h["family"])
            ex = {"family_id": f"FAM-{h['family']}", "district": _district(h["district_lgd"]), "cert_nos": h["cert_nos"][:3]}
            if h.get("app_ids"):
                ex["app_id"] = h["app_ids"][0]
            examples.append(ex)
            if len(examples) >= 4:
                break
        signals.append({
            "code": code, **SIGNALS[code], "count": len(hs), "families": len({h["family"] for h in hs}),
            "certificates": len({n for h in hs for n in h["cert_nos"]}),
            "examples": examples,
            "top_districts": [{"lgd": d, "name": _district(d), "count": n} for d, n in dc.most_common(5)],
        })
    districts = sorted(({"lgd": d, "name": _district(d), **{k: cnt.get(k, 0) for k in SIGNAL_ORDER},
                         "total": sum(cnt.values())} for d, cnt in by_d.items() if d),
                       key=lambda r: -r["total"])
    return {
        "synthetic": True,
        "note": {"en": "SYNTHETIC archive and families. Counts are signals that need a look, not findings. Category labels only.",
                 "hi": "सिंथेटिक अभिलेख व परिवार। संख्याएँ देखने योग्य संकेत हैं, निष्कर्ष नहीं। केवल श्रेणी लेबल।"},
        "graph": {"people": len(population()), "certificates": len(ov["certs"]), "families": sw["families"],
                  "nodes": sw["G_nodes"], "edges": sw["G_edges"]},
        "overlay": {
            "note": {"en": "The generated archive has no category conflicts or duplicates, so a small overlay is planted at known rates (not in demo families, not in the live matcher's archive) to test the detector.",
                     "hi": "बनाए गए अभिलेख में श्रेणी-भिन्नता या दोहराव नहीं है, अतः डिटेक्टर जांचने हेतु ज्ञात दर पर एक छोटा ओवरले जोड़ा गया (डेमो परिवारों व लाइव मिलान अभिलेख में नहीं)।"},
            "planted": {"category_conflict": len(planted_cat), "duplicate_identity": len(planted_dup_nos)},
            "found": {"category_conflict": len(planted_cat & found_cat), "duplicate_identity": len(found_dup)},
            "extra_flags": {"category_conflict": len(found_cat - planted_cat),
                            "duplicate_identity": sum(1 for h in dup_hits if not (set(h["cert_nos"]) & planted_dup_nos))},
        },
        "edges_note": {"en": "Here family edges come from the synthetic population register. In production they would come only from officer-confirmed links: every “same family” confirmation adds an edge.",
                       "hi": "यहाँ पारिवारिक कड़ियाँ सिंथेटिक जनसंख्या रजिस्टर से हैं। वास्तविक प्रणाली में ये केवल अधिकारी द्वारा पुष्ट कड़ियों से बनेंगी: हर “एक ही परिवार” पुष्टि एक कड़ी जोड़ती है।"},
        "signals": signals,
        "districts": districts[:12],
    }


def _claim_hits(entries: dict | None) -> list[dict]:
    certs = engine.archive()
    G = _base_graph()
    fam = defaultdict(list)
    for cl in _claims(entries):
        fam[cl["father_pid"]].append(cl)
    out = []
    for cls in fam.values():
        h = _cat_only(certs, G, cls)
        if h:
            out.append(h)
    return out


def _cat_only(certs, G, cls):
    hs = [h for h in _detect_cat(certs, G, cls)]
    return hs[0] if hs else None


def _detect_cat(certs, G, cls):
    pop = population()
    f = f"p:{cls[0]['father_pid']}"
    if f not in G:
        return []
    members = [f] + children(G, f)
    cats = defaultdict(set)
    nos = []
    for pn in members:
        for ci in certs_of(G, pn):
            c = certs[ci]
            if _is_caste(c) and c["category"] and c["status"] != "cancelled":
                cats[c["category"]].add(pn)
                nos.append(c["cert_no"])
    for cl in cls:
        cats[cl["category"]].add(f"p:{cl['pid']}")
    if len(cats) < 2:
        return []
    dl = next((certs[ci]["district_lgd"] for pn in members for ci in certs_of(G, pn)), None)
    lin = pop.get(G.nodes[f].get("pid"), {}).get("lineage") or cls[0]["app_id"].rsplit("/", 1)[-1]
    return [{"family": lin, "district_lgd": dl, "father": f, "categories": sorted(cats), "cert_nos": nos,
             "app_ids": [cl["app_id"] for cl in cls]}]


@lru_cache(maxsize=1)
def _base_graph() -> nx.DiGraph:
    return build_graph(engine.archive())


# ------------------------------------------------------------------ family subgraph for one application
def _cert_node(c: dict, status: str | None) -> dict:
    return {
        "id": f"c:{c['cert_no']}", "kind": "cert", "cert_no": c["cert_no"], "service": c["service"],
        "category": c["category"], "cert_type": c["cert_type"], "status": c["status"],
        "authority_role": c["authority_role"], "issue_year": int(c["issue_date"][:4]),
        "district": c["district"], "use": status,
        "label": {"en": f"{c['category'] or 'Domicile'} · {c['issue_date'][:4]}", "hi": f"{c['category'] or 'मूल निवास'} · {c['issue_date'][:4]}"},
    }


REL = {
    "applicant": {"en": "Applicant", "hi": "आवेदक"}, "father": {"en": "Father", "hi": "पिता"},
    "mother": {"en": "Mother", "hi": "माता"}, "grandfather": {"en": "Grandfather", "hi": "दादा"},
    "grandmother": {"en": "Grandmother", "hi": "दादी"}, "sibling": {"en": "Sibling", "hi": "भाई/बहन"},
    "uncle": {"en": "Father's sibling", "hi": "चाचा/बुआ"}, "spouse": {"en": "Spouse", "hi": "पति/पत्नी"},
    "outside": {"en": "Matched by name — outside this family tree", "hi": "नाम से मिला — इस वंश-वृक्ष से बाहर"},
}


def family(entry: dict, analysis: dict) -> dict:
    """3-generation subgraph around one application + its certificates + which record was used."""
    a, meta = entry["application"], entry.get("meta") or {}
    arch = engine.archive()
    G = _base_graph()
    pop = population()
    by_no = {c["cert_no"]: c for c in arch}
    pid = meta.get("person_id")
    fid = meta.get("father_id")
    if pid in pop and pop[pid]["father_id"] is not None:
        fid = pop[pid]["father_id"]
    nodes: dict[str, dict] = {}
    edges: list[dict] = []

    def person(pid_: int | None, rel: str, gen: int, name: dict | None = None, **kw) -> str | None:
        if pid_ is None and name is None:
            return None
        nid = f"p:{pid_}" if pid_ is not None else f"n:{rel}:{name['en']}"
        if nid in nodes:
            return nid
        p = pop.get(pid_) if pid_ is not None else None
        nodes[nid] = {"id": nid, "kind": "person", "rel": rel, "rel_label": REL[rel], "gen": gen,
                      "label": name or (p["name"] if p else {"en": "—", "hi": "—"}),
                      "gender": p["gender"] if p else kw.get("gender"),
                      "birth_year": p["birth_year"] if p else kw.get("birth_year"),
                      "in_register": p is not None, **({"name_only": True} if pid_ is None else {})}
        return nid

    def edge(s, t, kind, **kw):
        if s and t:
            edges.append({"id": f"e{len(edges)}", "source": s, "target": t, "kind": kind, **kw})

    # applicant (from the application itself — the name the file carries)
    app_n = person(pid, "applicant", 3, a["applicant_name"], gender=a["gender"], birth_year=a["birth_year"])
    nodes[app_n].update({"kind": "applicant", "label": a["applicant_name"], "gender": a["gender"], "birth_year": a["birth_year"]})
    # parents
    fcert = next((c for c in arch if fid is not None and c.get("_person_id") == fid), None)
    f_n = person(fid, "father", 2, None if fid in pop else (fcert["holder_name"] if fcert else a["father_name"]), gender="M")
    m_id = pop.get(pid, {}).get("mother_id") if pid in pop else None
    m_n = person(m_id, "mother", 2) if m_id in pop else None
    edge(f_n, app_n, "parent")
    edge(m_n, app_n, "parent")
    if f_n and m_n:
        edge(f_n, m_n, "spouse")
    # grandparents (register, else the father's recorded father's name as a name-only node)
    gf_n = gm_n = None
    if fid in pop:
        gf, gm = pop[fid]["father_id"], pop[fid]["mother_id"]
        gf_n = person(gf, "grandfather", 1) if gf in pop else person(None, "grandfather", 1, pop[fid]["father_name"], gender="M")
        gm_n = person(gm, "grandmother", 1) if gm in pop else None
        # father's siblings
        if gf in pop:
            for u in children(G, f"p:{gf}"):
                upid = G.nodes[u]["pid"]
                if upid != fid:
                    edge(gf_n, person(upid, "uncle", 2), "parent")
    elif fcert:
        gf_n = person(None, "grandfather", 1, fcert["father_name"], gender="M")
    edge(gf_n, f_n, "parent")
    edge(gm_n, f_n, "parent")
    if gf_n and gm_n:
        edge(gf_n, gm_n, "spouse")
    # siblings
    if fid is not None and f"p:{fid}" in G:
        for s in children(G, f"p:{fid}"):
            spid = G.nodes[s]["pid"]
            if spid != pid:
                edge(f_n, person(spid, "sibling", 3), "parent")
    # spouse of the applicant
    sp = pop.get(pid, {}).get("spouse_id") if pid in pop else None
    if sp in pop:
        edge(app_n, person(sp, "spouse", 3), "spouse")

    # certificates held by anyone in the tree
    accepted = set(analysis.get("accepted_cert_nos") or [])
    confirmed = set(analysis.get("confirmed_cert_nos") or [])
    dismissed = set(analysis.get("dismissed_cert_nos") or [])
    matched = {m["certificate"]["cert_no"]: m for m in analysis.get("lineage_matches") or []}

    def use_of(no: str) -> str | None:
        if no in accepted:
            return "relied"
        if no in dismissed:
            return "dismissed"
        if no in matched:
            return "candidate"
        return None

    for nid in list(nodes):
        if nodes[nid].get("name_only"):
            continue
        p_id = int(nid[2:])
        for c in arch:
            if c.get("_person_id") == p_id:
                cn = _cert_node(c, use_of(c["cert_no"]))
                nodes[cn["id"]] = cn
                edge(nid, cn["id"], "holds")
    # matched records outside the tree (the model linked them by name/place; the officer decides)
    for no, m in matched.items():
        cid = f"c:{no}"
        if cid not in nodes:
            c = by_no.get(no)
            if not c:
                continue
            hn = f"x:{no}"
            nodes[hn] = {"id": hn, "kind": "person", "rel": "outside", "rel_label": REL["outside"], "gen": 2 if m["relation"] == "father" else 3,
                         "label": c["holder_name"], "gender": c["gender"], "birth_year": c["birth_year"], "in_register": False}
            cn = _cert_node(c, use_of(no))
            nodes[cid] = cn
            edge(hn, cid, "holds")
        edge(app_n, cid, "match", probability=m["match_probability"], match_level=m["match_level"],
             relation=m["relation"], relation_label=m["relation_label"], use=use_of(no))
    # the application itself (claimed category)
    claimed = engine.claimed_category(a["service"], a.get("claimed_category"))
    an_id = f"a:{a['app_id']}"
    nodes[an_id] = {"id": an_id, "kind": "application", "app_id": a["app_id"], "category": claimed, "status": a["status"],
                    "service": a["service"], "label": {"en": f"Applied · {claimed or 'Domicile'}", "hi": f"आवेदन · {claimed or 'मूल निवास'}"}}
    edge(app_n, an_id, "applied")

    # family-level signals
    sig = []
    fam_people = [n for n in nodes.values() if n["kind"] in ("person", "applicant") and n.get("rel") in ("father", "sibling", "applicant")]
    fam_ids = {n["id"] for n in fam_people}
    cat_nodes = defaultdict(list)
    for e in edges:
        if e["kind"] == "holds" and e["source"] in fam_ids:
            c = nodes[e["target"]]
            if c["service"] in CASTE_SERVICES and c["category"] and c["status"] != "cancelled":
                cat_nodes[c["category"]].append(c["id"])
    if claimed and a["service"] in CASTE_SERVICES:
        cat_nodes[claimed].append(an_id)
    if len(cat_nodes) > 1:
        parts = " · ".join(f"{k}: {len(v)}" for k, v in sorted(cat_nodes.items()))
        sig.append({"code": "category_conflict", "title": SIGNALS["category_conflict"]["title"],
                    "detail": {"en": f"Categories in this family: {parts} (claim included).", "hi": f"इस परिवार में श्रेणियाँ: {parts} (दावा सहित)।"},
                    "node_ids": [x for v in cat_nodes.values() for x in v]})
    for n in list(nodes.values()):
        if n["kind"] == "cert" and n["service"] in CASTE_SERVICES and n["status"] != "active":
            st = {"cancelled": ("cancelled", "निरस्त"), "under_scrutiny": ("under scrutiny", "जांचाधीन")}[n["status"]]
            others = [x["id"] for x in nodes.values() if x["kind"] == "cert" and x["id"] != n["id"] and x["status"] == "active"
                      and x["service"] in CASTE_SERVICES]
            sig.append({"code": "cancelled_relative", "title": SIGNALS["cancelled_relative"]["title"],
                        "detail": {"en": f"{n['cert_no']} is {st[0]}; {len(others)} other active certificate(s) in this tree"
                                         + ("" if not others else " may have relied on it") + ". Do not rely on it for this file.",
                                   "hi": f"{n['cert_no']} {st[1]} है; इस वृक्ष में {len(others)} अन्य सक्रिय प्रमाण पत्र"
                                         + ("" if not others else " संभवतः उस पर आधारित") + "। इस प्रकरण हेतु उस पर निर्भर न रहें।"},
                        "node_ids": [n["id"]] + others})
        if n["kind"] == "cert" and n["service"] in CASTE_SERVICES and n["cert_type"] == "permanent" and n["authority_role"] == "Tehsildar":
            sig.append({"code": "tehsildar_permanent", "title": SIGNALS["tehsildar_permanent"]["title"],
                        "detail": {"en": f"{n['cert_no']} ({n['issue_year']}): competent-authority policy check.",
                                   "hi": f"{n['cert_no']} ({n['issue_year']}): सक्षम-प्राधिकारी नीति जांच।"},
                        "node_ids": [n["id"]]})
    held = defaultdict(list)
    for e in edges:
        if e["kind"] == "holds" and nodes[e["target"]]["service"] in CASTE_SERVICES:
            held[e["source"]].append(nodes[e["target"]])
    for pn, cs in held.items():
        if len(cs) > 1 and len({(c["category"], c["cert_type"]) for c in cs}) > 1:
            sig.append({"code": "duplicate_identity", "title": SIGNALS["duplicate_identity"]["title"],
                        "detail": {"en": "Two caste certificates for one person with different details.", "hi": "एक व्यक्ति के दो जाति प्रमाण पत्र, विवरण भिन्न।"},
                        "node_ids": [c["id"] for c in cs]})

    used = [n for n in (analysis.get("accepted_cert_nos") or [])]
    return {
        "app_id": a["app_id"], "synthetic": True,
        "applicant": {"name": a["applicant_name"], "claimed_category": claimed, "service": a["service"], "village": a["village"],
                      "district": a["district"], "status": a["status"]},
        "family_id": f"FAM-{pop[pid]['lineage']}" if pid in pop else f"FAM-{a['app_id'].rsplit('/', 1)[-1]}",
        "lane": analysis.get("lane"),
        "nodes": list(nodes.values()), "edges": edges, "signals": sig,
        "records_used": used,
        "records_found": list(matched),
        "note": {"en": "Family tree from the SYNTHETIC register; the dashed line is the model's link, which the officer confirms or rejects. No community names are shown.",
                 "hi": "सिंथेटिक रजिस्टर से वंश-वृक्ष; बिंदुदार रेखा मॉडल की कड़ी है, जिसकी पुष्टि या अस्वीकृति अधिकारी करते हैं। कोई जाति-नाम नहीं दिखाया गया।"},
    }
