"""Citizen side (nagrik portal mock): the "Family Proof Helper" inside the online application form. SYNTHETIC data.

  POST /api/citizen/precheck   masked archive search for the applicant's family certificate (after Aadhaar e-auth,
                               with consent; 3 searches per application). The citizen never sees another person's
                               name, village, category or full certificate number — only "No. ••••4512 · SDO
                               (Revenue), Kondagaon · 2019" and an opaque proof_ref to attach it.
  POST /api/citizen/submit     files the application: with the archive-verified family certificate attached (the
                               officer still confirms the relationship), or with an unavailability declaration and a
                               Rule 7 inquiry request when the citizen has no papers. It appears in the SDO queue.

Why: today a citizen without a pre-1950/1984 paper often cannot complete the upload step, so the case never reaches
the officer. Legal basis: Rule 3(3)(e)(X) (a relative's certificate) and (XI) / Rules 7-8 (inquiry where no
documentary evidence is available), CG Social Status Certification Rules 2013.

Mounted by api.py; api.STATE is imported lazily to avoid a cycle.
"""
from __future__ import annotations

import copy
import secrets
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

import engine
import geo
from messages import SHORT_SERVICE, check_entities, render_pair
from normalise import deva_to_latin, is_devanagari, roman_to_deva

router = APIRouter()
MAX_SEARCHES = 3
SLA_DAYS = {"caste_sc": 22, "caste_st": 22, "caste_obc": 22, "domicile": 7}
SERVICE_LABEL = {
    "caste_sc": {"en": "Scheduled Caste (SC) caste certificate — permanent", "hi": "अनुसूचित जाति प्रमाण पत्र — स्थायी"},
    "caste_st": {"en": "Scheduled Tribe (ST) caste certificate — permanent", "hi": "अनुसूचित जनजाति प्रमाण पत्र — स्थायी"},
    "caste_obc": {"en": "Other Backward Class (OBC) caste certificate — permanent", "hi": "अन्य पिछड़ा वर्ग जाति प्रमाण पत्र — स्थायी"},
}
CATEGORY = {"caste_sc": "SC", "caste_st": "ST", "caste_obc": "OBC"}
ONLINE = {"en": "Online (citizen portal)", "hi": "ऑनलाइन (नागरिक पोर्टल)"}

# session_id -> {"searches": int, "refs": {proof_ref: cert_no}}; demo-only, cleared on /api/reset
_SESS: dict[str, dict] = {}
_RESET = [None]


def _state():
    import api  # noqa: WPS433 — lazy: api imports this module at its end
    return api.STATE


def _session(sid: str) -> dict:
    st = _state()
    if _RESET[0] != st.reset_id:
        _SESS.clear()
        _RESET[0] = st.reset_id
    return _SESS.setdefault(sid, {"searches": 0, "refs": {}})


def _bi(text: str) -> dict:
    """{"en", "hi"} from whatever script the citizen typed."""
    t = " ".join(text.split())
    if not t:
        return {"en": "", "hi": ""}
    if is_devanagari(t):
        return {"en": deva_to_latin(t).title(), "hi": t}
    return {"en": t, "hi": roman_to_deva(t)}


def _mask(cert_no: str) -> str:
    return "••••" + cert_no[-4:]


class CitizenPrecheck(BaseModel):
    session_id: str = Field(min_length=6, max_length=64)
    service: Literal["caste_sc", "caste_st", "caste_obc"]
    applicant_name: str = Field(default="", max_length=80)
    father_name: str = Field(min_length=2, max_length=80)
    relation: str = Field(default="father", max_length=20)
    village_lgd: Optional[int] = None
    district_lgd: Optional[int] = None
    native_village_lgd: Optional[int] = None
    relative_cert_no: Optional[str] = Field(default=None, max_length=40)
    consent: bool = False
    aadhaar_ok: bool = False


@router.post("/api/citizen/precheck")
def citizen_precheck(body: CitizenPrecheck):
    if not body.aadhaar_ok:
        raise HTTPException(403, "Aadhaar e-authentication is required before the archive is searched")
    if not body.consent:
        raise HTTPException(400, "the applicant's consent is required before the archive is searched")
    s = _session(body.session_id)
    if s["searches"] >= MAX_SEARCHES:
        raise HTTPException(429, f"search limit reached ({MAX_SEARCHES} per application) — continue with documents or the 'no papers' path")
    s["searches"] += 1
    res = engine.precheck({"service": body.service, "applicant_name": body.applicant_name, "father_name": body.father_name,
                           "district_lgd": body.district_lgd, "village_lgd": body.village_lgd,
                           "relative_cert_no": (body.relative_cert_no or "").strip() or None,
                           "native_village_lgd": body.native_village_lgd})
    usable = [m for m in res["matches"] if m["usable_as_evidence"]]
    pick = usable[0] if usable else (res["matches"][0] if res["matches"] else None)
    out: dict = {"searches_left": MAX_SEARCHES - s["searches"], "status": "not_found"}
    if pick:
        c = pick["certificate"]
        ref = secrets.token_hex(8)
        s["refs"][ref] = {"cert_no": c["cert_no"], "native": body.native_village_lgd if pick.get("found_via") == "native_village" else None}
        out.update({
            "status": "found_usable" if usable else "found_review",
            "proof_ref": ref,
            "masked_no": _mask(c["cert_no"]),
            # issuing office and year only: no holder name, no village, no category, no validity detail
            "office": c["issuing_authority"],
            "year": c["issue_date"][:4],
            "relation": pick["relation_label"],
            "found_via_native": pick.get("found_via") == "native_village",
        })
    _state().add_audit("citizen", "citizen_precheck", None, [m["certificate"]["cert_no"] for m in res["matches"]],
                       actor="Citizen (Aadhaar e-authenticated)",
                       note=f"Citizen self-search with consent, {s['searches']}/{MAX_SEARCHES}: father '{body.father_name}', "
                            f"village LGD {body.village_lgd or '—'}" + (f", native village LGD {body.native_village_lgd}" if body.native_village_lgd else "")
                            + f" — result {out['status']}" + (f" ({out['masked_no']}, shown masked)" if pick else ""))
    return out


class Vanshavali(BaseModel):
    relation: str = Field(max_length=20)
    name: str = Field(default="", max_length=80)
    village: str = Field(default="", max_length=80)
    place_1950: str = Field(default="", max_length=120)


class CitizenSubmit(BaseModel):
    session_id: str = Field(min_length=6, max_length=64)
    service: Literal["caste_sc", "caste_st", "caste_obc"]
    applicant_name_hi: str = Field(default="", max_length=80)
    applicant_name_en: str = Field(default="", max_length=80)
    father_name_hi: str = Field(default="", max_length=80)
    father_name_en: str = Field(default="", max_length=80)
    mother_name: str = Field(default="", max_length=80)
    gender: Literal["M", "F"] = "F"
    birth_year: int = Field(ge=1930, le=2025)
    caste: str = Field(default="", max_length=40)
    village_lgd: int
    purpose: str = Field(default="", max_length=80)
    proof_ref: Optional[str] = None
    no_papers: bool = False
    vanshavali: list[Vanshavali] = []
    other_docs: list[str] = []          # codes the citizen uploaded (demo): identity_proof, affidavit, residence_proof …


@router.post("/api/citizen/submit")
def citizen_submit(body: CitizenSubmit):
    st = _state()
    s = _session(body.session_id)
    vs = geo.villages()
    if body.village_lgd not in vs:
        raise HTTPException(422, f"unknown village LGD code {body.village_lgd}")
    v = vs[body.village_lgd]
    if v["district_lgd"] != 643:
        raise HTTPException(422, "demo: applications are routed to the Kondagaon district desks only")
    cert_no, native = None, None
    if body.proof_ref:
        hit = s["refs"].get(body.proof_ref)
        if not hit:
            raise HTTPException(400, "unknown proof reference — search again")
        cert_no, native = hit["cert_no"], hit["native"]
    if not cert_no and not body.no_papers and "caste_proof" not in body.other_docs:
        raise HTTPException(422, "caste proof: attach the family certificate found, upload one document, or choose 'I have no papers'")
    applicant = _bi(body.applicant_name_hi or body.applicant_name_en)
    if body.applicant_name_en:
        applicant["en"] = body.applicant_name_en.strip()
    father = _bi(body.father_name_hi or body.father_name_en)
    if body.father_name_en:
        father["en"] = body.father_name_en.strip()
    if not applicant["en"] or not father["en"]:
        raise HTTPException(422, "applicant's and father's names are required")
    now = datetime.now(engine.IST)
    with st.lock:
        n = 9000 + sum(1 for k in st.entries if k.startswith("SS/2026/KDG/09")) + 1
        app_id = f"SS/2026/KDG/{n:05d}"
    docs = [
        {"code": "affidavit", "label": {"en": "Self-declaration affidavit (Form 2A)", "hi": "स्वघोषणा शपथ पत्र (फॉर्म 2A)"},
         "uploaded": "affidavit" in body.other_docs or body.no_papers},
        {"code": "identity_proof", "label": {"en": "Identity proof (Aadhaar e-authenticated)", "hi": "पहचान प्रमाण (आधार ई-प्रमाणीकृत)"}, "uploaded": True},
        {"code": "record_1950", "label": {"en": "Pre-1950 / pre-1984 record (revenue record, jamabandi)", "hi": "1950/1984 से पूर्व का अभिलेख (राजस्व अभिलेख, जमाबंदी)"},
         "uploaded": "caste_proof" in body.other_docs},
    ]
    if body.service == "caste_obc":
        docs.append({"code": "father_income", "label": {"en": "Father's income certificate, preceding year", "hi": "पिता का आय प्रमाण पत्र, पिछला वर्ष"},
                     "uploaded": "father_income" in body.other_docs})
    rows = []
    if body.no_papers:
        docs.append({"code": "unavailability_declaration",
                     "label": {"en": "Unavailability declaration (no pre-notification papers) — system generated",
                               "hi": "अनुपलब्धता घोषणा (अधिसूचना-पूर्व कागज़ नहीं) — स्वतः निर्मित"}, "uploaded": True})
        for r in body.vanshavali:
            if r.name or r.place_1950:
                rows.append({"source": {"en": "Applicant's family tree (declared online)", "hi": "आवेदक द्वारा दी गई वंशावली (ऑनलाइन)"},
                             "field": {"en": f"{r.relation}", "hi": f"{r.relation}"},
                             "value": {"en": f"{r.name or 'not known'} — {r.village or '—'}; in 1950/1984: {r.place_1950 or 'not known'}",
                                       "hi": f"{r.name or 'पता नहीं'} — {r.village or '—'}; 1950/1984 में: {r.place_1950 or 'पता नहीं'}"},
                             "status": "info"})
    caste = _bi(body.caste) if body.caste else {"en": "", "hi": ""}
    application = {
        "app_id": app_id, "service": body.service, "service_label": SERVICE_LABEL[body.service],
        "applicant_name": applicant, "father_name": father, "mother_name": _bi(body.mother_name) if body.mother_name else {"en": "—", "hi": "—"},
        "gender": body.gender, "birth_year": body.birth_year, "claimed_category": CATEGORY[body.service],
        "claimed_caste": caste if caste["en"] else None,
        "village": {"en": v["name_en"], "hi": v["name_hi"]}, "village_lgd": v["lgd"],
        "tehsil": {"en": v["tehsil_en"], "hi": v["tehsil_hi"]},
        "district": {"en": geo.districts()[v["district_lgd"]]["name_en"], "hi": geo.districts()[v["district_lgd"]]["name_hi"]},
        "district_lgd": v["district_lgd"],
        "purpose": _bi(body.purpose) if body.purpose else {"en": "—", "hi": "—"},
        "submitted_at": now.isoformat(timespec="seconds"),
        "sla_due": (now + timedelta(days=SLA_DAYS[body.service])).strftime("%Y-%m-%d"),
        "kendra": ONLINE, "routed_to": "sdo", "status": "pending", "sendback_count": 0, "documents": docs,
        "channel": "citizen_portal",
        "inquiry_requested": body.no_papers,
        "persona_note": {"en": "Filed on the citizen portal with the Family Proof Helper.", "hi": "नागरिक पोर्टल पर परिवार प्रमाण सहायक से दाखिल।"},
    }
    if cert_no:
        application["declared_relative_cert_no"] = cert_no
        application["declared_source"] = "citizen_search"
    entry = {"application": application, "evidence_rows": rows,
             "meta": {"father_raw": body.father_name_hi or body.father_name_en, "applicant_raw": body.applicant_name_hi or body.applicant_name_en,
                      "tehsil_lgd": v["tehsil_lgd"]}}
    engine.fix_village_hi(application)
    with st.lock:
        st.entries[app_id] = entry
        st.order.insert(0, app_id)
        if native:  # found through the maiden village on the portal: the officer's analysis searches it too
            st.native[app_id] = int(native)
        st.invalidate(app_id)
    st.add_audit("citizen", "citizen_submitted", app_id, [cert_no] if cert_no else [],
                 actor="Citizen (Aadhaar e-authenticated)",
                 note=("Filed online with the archive-verified family certificate attached (shown to the citizen masked as "
                       f"{_mask(cert_no)}); the officer confirms the relationship." if cert_no else
                       "Filed online WITHOUT pre-notification papers: unavailability declaration + family tree; a Rule 7 inquiry is requested."
                       if body.no_papers else "Filed online with an uploaded caste-proof document."))
    an = st.analysis(app_id)
    # the citizen's message, from the template and checked like every other citizen message
    due = datetime.strptime(application["sla_due"], "%Y-%m-%d").strftime("%d-%m-%Y")
    ctx = {"name": applicant, "app_id": app_id, "service": SHORT_SERVICE[body.service], "office": an["office"],
           "proof": _mask(cert_no) if cert_no else "", "no_papers": body.no_papers, "due": due}
    text = render_pair("msg_received", **ctx)
    msg = {"channel": "whatsapp", "text": text, "generator": "template",
           "checker": check_entities(text, [application, an["office"], SHORT_SERVICE[body.service], ctx["proof"], due])}
    return {"app_id": app_id, "submitted_at": application["submitted_at"], "sla_due": application["sla_due"],
            "office": an["office"], "fee": 30, "inquiry_requested": body.no_papers,
            "proof": {"masked_no": _mask(cert_no)} if cert_no else None, "citizen_message": msg}
