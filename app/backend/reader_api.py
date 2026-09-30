"""Round 8c: Praman Reader (प्रमाण रीडर) support endpoint.

OCR and QR decoding run in the officer's browser (tesseract.js + jsQR, served locally); the only server call is
this archive lookup by certificate number, so the page can compare what the paper says with what the archive says.
SYNTHETIC data. The lookup is audited like every other archive access. A missing record is never a ground for rejection.
"""
from __future__ import annotations

import re
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import engine

router = APIRouter()

# OCR commonly reads G as 6 and O as 0 in certificate numbers such as CG/KDG/SDO/2019/004512
_CERT_RE = re.compile(r"^\s*C[G6]\s*/\s*([A-Z0-9]{3})\s*/\s*(SD[O0]|TSL|TS[L1I])\s*/\s*(\d{4})\s*/\s*(\d{4,6})\s*$", re.I)


def normalise_cert_no(raw: str) -> Optional[str]:
    """'c6/kdg/sd0/2019/004512' -> 'CG/KDG/SDO/2019/004512'; None when it does not look like a certificate number."""
    m = _CERT_RE.match(raw or "")
    if not m:
        return None
    dist, role, year, seq = m.groups()
    dist = dist.upper().replace("0", "O")
    role = role.upper()
    role = "SDO" if role.startswith("SD") else "TSL"
    return f"CG/{dist}/{role}/{year}/{int(seq):06d}"


def qr_payload(c: dict) -> str:
    """What the certificate's QR code carries (demo format): number, holder (as printed in English), issue date, category."""
    return (f"SEWASETU-CG|CERT={c['cert_no']}|HOLDER={c['holder_name']['en']}|ISSUED={c['issue_date']}"
            f"|CAT={c.get('category') or ''}")


@router.get("/api/archive/certificate/{cert_no:path}")
def archive_certificate(cert_no: str, role: str = "sdo", app_id: Optional[str] = None):
    import api  # late import: api.py includes this router at the end of its module

    no = normalise_cert_no(cert_no)
    if not no:
        raise HTTPException(422, "not a certificate number (expected e.g. CG/KDG/SDO/2019/004512)")
    c = next((x for x in engine.archive() if x["cert_no"] == no), None)
    api.STATE.add_audit(role if role in ("sdo", "tehsildar", "kendra_operator", "collector") else "sdo",
                        "archive_certificate_lookup", app_id=app_id, records=[no] if c else [],
                        note=f"Praman Reader: certificate number read from an uploaded paper ({no})"
                             + ("" if c else " — not in the archive"))
    if not c:
        # returned (not raised): the app-wide handler flattens HTTPException details to a string
        return JSONResponse(status_code=404, content={"found": False, "cert_no": no, "detail": {"en": f"No record {no} in the archive. This is not a ground for rejection; "
                                        "check the original paper or ask the issuing office.",
                                  "hi": f"अभिलेखागार में {no} का अभिलेख नहीं मिला। यह अस्वीकृति का आधार नहीं है; "
                                        "मूल दस्तावेज़ देखें या जारीकर्ता कार्यालय से पूछें।"}})
    return {"found": True, "cert_no": no, "normalised_from": cert_no if cert_no.strip().upper() != no else None,
            "certificate": engine.public_cert(c), "qr_payload": qr_payload(c)}


# ------------------------------------------------------------------ duplicate-paper check (perceptual hash)
# The browser sends only a 64-bit perceptual hash (pHash, DCT-based, as in Python's imagehash) of the page image —
# never the image. A rescan or a tilted phone photo of the same paper lands within a few bits (synthetic aff.png vs
# aff_noisy.jpg: 4 bits; different papers: >= 18). Held in memory, cleared by a demo reset.
_FP: dict[str, list[dict]] = {}
_FP_RESET: list[str] = [""]
DUP_MAX_BITS = 10


class Fingerprint(BaseModel):
    app_id: str = Field(min_length=3, max_length=40)
    phash: str = Field(pattern=r"^[0-9a-f]{16}$")
    kind: str = Field(default="unknown", max_length=20)
    label: str = Field(default="", max_length=80)


@router.post("/api/reader/fingerprint")
def fingerprint(body: Fingerprint):
    """Record this paper's fingerprint for the application and return near-identical papers already read for
    OTHER applications. A neutral prompt to look ("the same paper is on another file — check"), never a finding."""
    import api

    if _FP_RESET[0] != api.STATE.reset_id:
        _FP.clear()
        _FP_RESET[0] = api.STATE.reset_id
    h = int(body.phash, 16)
    others = []
    for app_id, rows in _FP.items():
        if app_id == body.app_id:
            continue
        for r in rows:
            d = bin(h ^ int(r["phash"], 16)).count("1")
            if d <= DUP_MAX_BITS:
                others.append({"app_id": app_id, "kind": r["kind"], "label": r["label"], "distance_bits": d})
    mine = _FP.setdefault(body.app_id, [])
    if not any(r["phash"] == body.phash for r in mine):
        mine.append({"phash": body.phash, "kind": body.kind, "label": body.label})
    others.sort(key=lambda x: x["distance_bits"])
    return {"app_id": body.app_id, "same_paper_elsewhere": others, "max_bits": DUP_MAX_BITS}
