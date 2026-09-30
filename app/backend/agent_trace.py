"""Round 8b: the visible "प्रमाण एजेंट" trace — what the system did for one file, step by step.

Built only from the real analysis and the timing marks engine.analyse() records while it runs (additive; the
analysis itself is unchanged). Honest labels: the agent reads, searches, scores, checks and drafts. It never decides.
The last step is always "waiting for the officer"; the frontend shows it as done once the file is decided.
"""
from __future__ import annotations

KIND = {
    "approve": ({"en": "approval order", "hi": "स्वीकृति आदेश"}),
    "send_back": ({"en": "send-back notice", "hi": "वापसी सूचना"}),
    "refer": ({"en": "reference note", "hi": "संदर्भ पत्र"}),
}
LEVEL = {"exact": {"en": "exact", "hi": "सटीक"}, "possible": {"en": "possible", "hi": "संभावित"}}


def _ms(marks: dict, a: str, b: str) -> float | None:
    if a in marks and b in marks:
        return round((marks[b] - marks[a]) * 1000, 1)
    return None


def build(entry: dict, an: dict, marks: dict, model_name: str = "Splink Fellegi–Sunter (EM)") -> list[dict]:
    app = entry["application"]
    steps: list[dict] = []

    # ① read the application
    docs = app.get("documents", [])
    up = sum(1 for d in docs if d.get("uploaded"))
    steps.append({
        "code": "read", "status": "ok", "ms": _ms(marks, "t0", "read"),
        "title": {"en": "Read the application", "hi": "आवेदन पढ़ा"},
        "detail": {"en": f"{app['service_label']['en']} · {app['applicant_name']['en']} · father {app['father_name']['en']} · "
                         f"documents {up}/{len(docs)} uploaded",
                   "hi": f"{app['service_label']['hi']} · {app['applicant_name']['hi']} · पिता {app['father_name']['hi']} · "
                         f"दस्तावेज़ {up}/{len(docs)} अपलोड"},
    })

    # ② blocking: narrow the search to the village / tehsil (LGD)
    searches = marks.get("search") or []
    cur = searches[0] if searches else {}
    n_cand = sum(s.get("candidates", 0) for s in searches)
    total = cur.get("archive_certs")
    en = (f"Village {app['village']['en']} (LGD {app['village_lgd']}), tehsil {app['tehsil']['en']}, same surname in the district "
          f"→ {cur.get('candidates', 0)} candidate certificates")
    hi = (f"गांव {app['village']['hi']} (एलजीडी {app['village_lgd']}), तहसील {app['tehsil']['hi']}, जिले में समान उपनाम "
          f"→ {cur.get('candidates', 0)} उम्मीदवार प्रमाण पत्र")
    nat = next((s for s in searches if s.get("place") == "native"), None)
    if nat is not None and an.get("native_village"):
        nv = an["native_village"]
        en += f" + native village {nv['village']['en']} (LGD {nv['village_lgd']}) → {nat.get('candidates', 0)}"
        hi += f" + मायके / मूल गांव {nv['village']['hi']} (एलजीडी {nv['village_lgd']}) → {nat.get('candidates', 0)}"
    if total:
        en += f" (of {total:,} in the archive; like-for-like kind only)"
        hi += f" (अभिलेखागार के {total:,} में से; केवल समान प्रकार)"
    steps.append({
        "code": "search", "status": "ok",
        "ms": round(sum(s.get("block_ms", 0) for s in searches), 1) if searches else None,
        "title": {"en": f"Search narrowed by LGD → {n_cand} candidates", "hi": f"खोज सीमित: गांव/तहसील (एलजीडी) → {n_cand} उम्मीदवार"},
        "detail": {"en": en, "hi": hi},
        "count": n_cand,
    })

    # ③ relative matching (the learned model)
    matches = an.get("lineage_matches", [])
    top = matches[0] if matches else None
    undisposed = set(an.get("disposition_required") or [])
    pending = set(an.get("pending_cert_nos") or [])
    if top is None:
        status = "ok"
        t_en = "Relative matching: no record ≥ 60%"
        t_hi = "रिश्तेदार मिलान: 60% से ऊपर कोई अभिलेख नहीं"
        d_en = "No family record found. This is neutral: examine the documents as today."
        d_hi = "पारिवारिक अभिलेख नहीं मिला। यह तटस्थ है: दस्तावेज़ों की जांच आज की तरह करें।"
    else:
        p = round(top["match_probability"] * 100)
        rel = top["relation_label"]
        lvl = LEVEL[top["match_level"]]
        t_en = f"Relative matching: {rel['en']} {p}% ({lvl['en']})"
        t_hi = f"रिश्तेदार मिलान: {rel['hi']} {p}% ({lvl['hi']})"
        d_en = f"{len(matches)} record(s) shown · top: {top['certificate']['cert_no']} · score = prior + {len(top['weights'])} field weights"
        d_hi = f"{len(matches)} अभिलेख दिखाए · शीर्ष: {top['certificate']['cert_no']} · अंक = पूर्व-भार + {len(top['weights'])} क्षेत्र-भार"
        needs = [lm for lm in matches if lm["certificate"]["cert_no"] in undisposed | pending]
        status = "attention" if needs else "ok"
        if needs:
            d_en += " · the officer must confirm “same family / not this family”"
            d_hi += " · अधिकारी को “एक ही परिवार / यह परिवार नहीं” तय करना है"
    d_en += f" · model: {model_name}, {an.get('model_version')}"
    d_hi += f" · मॉडल: {model_name}, {an.get('model_version')}"
    steps.append({
        "code": "match", "status": status,
        "ms": round(sum(s.get("score_ms", 0) for s in searches), 1) if searches else None,
        "title": {"en": t_en, "hi": t_hi}, "detail": {"en": d_en, "hi": d_hi},
        "model_version": an.get("model_version"),
    })

    # ④ rule checks (validity of the top record + checklist)
    checks = top["validity"] if top else []
    passed = sum(1 for v in checks if v["ok"])
    failed = [v for v in checks if not v["ok"]]
    attention = [f for f in an.get("flags", []) if f["severity"] == "attention"]
    req = [c for c in an.get("checklist", []) if c.get("required")]
    have = sum(1 for c in req if c.get("present"))
    defs = an.get("deficiencies", [])
    if checks:
        t_en = f"Rule checks: {passed}/{len(checks)} validity checks passed"
        t_hi = f"नियम जांच: {passed}/{len(checks)} वैधता जांच पास"
    else:
        t_en, t_hi = "Rule checks: documents checklist", "नियम जांच: दस्तावेज़ सूची"
    d_en = f"required documents {have}/{len(req)}"
    d_hi = f"आवश्यक दस्तावेज़ {have}/{len(req)}"
    if failed:
        d_en += " · failed: " + ", ".join(v["label"]["en"] for v in failed)
        d_hi += " · विफल: " + ", ".join(v["label"]["hi"] for v in failed)
    if attention:
        d_en += " · attention: " + "; ".join(f["title"]["en"] for f in attention)
        d_hi += " · ध्यान: " + "; ".join(f["title"]["hi"] for f in attention)
    if defs:
        d_en += " · gap: " + " ".join(d["text"]["en"] for d in defs)
        d_hi += " · कमी: " + " ".join(d["text"]["hi"] for d in defs)
    d_en += f" · rules {an.get('rules_version')}"
    d_hi += f" · नियम {an.get('rules_version')}"
    steps.append({
        "code": "rules", "status": "attention" if (failed or attention or defs) else "ok",
        "ms": _ms(marks, "match", "rules"),
        "title": {"en": t_en, "hi": t_hi}, "detail": {"en": d_en, "hi": d_hi},
        "passed": passed, "total": len(checks),
    })

    # ⑤ draft prepared (template-bound, cites records only)
    kind = KIND.get(an.get("suggested_action"), {"en": "draft", "hi": "प्रारूप"})
    steps.append({
        "code": "draft", "status": "ok", "ms": _ms(marks, "rules", "draft"),
        "title": {"en": f"Draft prepared: {kind['en']}", "hi": f"प्रारूप तैयार: {kind['hi']}"},
        "detail": {"en": "From reviewed templates; cites record numbers only; editable. Nothing is issued without your signature.",
                   "hi": "समीक्षित टेम्पलेट से; केवल अभिलेख क्रमांक उद्धृत; संपादन योग्य। आपके हस्ताक्षर के बिना कुछ जारी नहीं होता।"},
    })

    # ⑥ waiting for the officer (the agent never decides)
    steps.append({
        "code": "officer", "status": "waiting", "ms": None,
        "title": {"en": "Waiting for the officer", "hi": "अधिकारी की प्रतीक्षा"},
        "detail": {"en": "The agent never decides, approves or rejects. You decide; the audit records what this screen showed.",
                   "hi": "एजेंट निर्णय, स्वीकृति या अस्वीकृति नहीं करता। निर्णय आपका है; इस स्क्रीन पर दिखी जानकारी ऑडिट में दर्ज होती है।"},
    })
    for i, s in enumerate(steps, 1):
        s["step"] = i
    return steps
