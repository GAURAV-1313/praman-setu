"""Template-bound draft orders and citizen messages, plus the entity checker.

generator = "template": every sentence comes from a reviewed Jinja2 template; only record
values are substituted. The entity checker re-reads the finished message and verifies that
every number, certificate/application number and name-like word in it appears either in
the template's own fixed wording or in the source record. Anything else is reported as an
unsupported entity (this is the same guard an LLM rewrite would have to pass).
"""
from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

TPL_DIR = Path(__file__).parent / "templates"
env = Environment(loader=FileSystemLoader(str(TPL_DIR)), undefined=StrictUndefined, keep_trailing_newline=False,
                  autoescape=False)

TOKEN_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9/\-]*[A-Za-z0-9]|[0-9]|[\u0900-\u0963\u0966-\u097F]+")  # no danda


HI_AGREEMENT = [("के बहन", "की बहन"), ("के बहन,", "की बहन,")]  # Hindi gender agreement for a sister


def render_pair(template: str, **ctx) -> dict:
    out = {lang: env.get_template(f"{template}.{lang}.j2").render(**ctx).strip() for lang in ("en", "hi")}
    for a, b in HI_AGREEMENT:
        out["hi"] = out["hi"].replace(a, b)
    return out


@lru_cache(maxsize=4)
def template_vocab(pattern: str = "msg_*.j2") -> set[str]:
    vocab: set[str] = set()
    for p in TPL_DIR.glob(pattern):
        text = re.sub(r"\{\{.*?\}\}|\{%.*?%\}", " ", p.read_text(encoding="utf-8"))
        vocab.update(t.lower() for t in TOKEN_RE.findall(text))
    return vocab


def _tokens(text: str) -> list[str]:
    text = re.sub(r"(?m)^\s*\d{1,2}[).]\s", " ", text or "")  # list numbering "1) " is layout, not an entity
    return TOKEN_RE.findall(text)


def _flatten(obj) -> list[str]:
    if obj is None:
        return []
    if isinstance(obj, str):
        return [obj]
    if isinstance(obj, (int, float)):
        return [str(obj)]
    if isinstance(obj, dict):
        return [s for v in obj.values() for s in _flatten(v)]
    if isinstance(obj, (list, tuple)):
        return [s for v in obj for s in _flatten(v)]
    return []


def check_entities(text: dict, source, vocab_pattern: str = "msg_*.j2") -> dict:
    """Every entity in the message (both languages) must be traceable to the source record.
    vocab_pattern (Round 8b): which templates' fixed wording counts as vocabulary (default: the decision messages)."""
    corpus = {t.lower() for s in _flatten(source) for t in _tokens(s)}
    vocab = template_vocab(vocab_pattern)
    checked, unsupported = [], []
    for lang in ("en", "hi"):
        for tok in _tokens(text.get(lang, "")):
            low = tok.lower()
            is_id = "/" in tok or any(ch.isdigit() for ch in tok)
            is_name_like = tok[:1].isupper() or "ऀ" <= tok[:1] <= "ॿ"
            if not is_id and (low in vocab or not is_name_like):
                continue
            if low in vocab and not is_id:
                continue
            if tok not in checked:
                checked.append(tok)
            if low not in corpus and low not in vocab:
                if tok not in unsupported:
                    unsupported.append(tok)
    return {"passed": not unsupported, "unsupported_entities": unsupported, "checked_entities": checked}


SHORT_SERVICE = {
    "caste_st": {"en": "ST caste certificate", "hi": "अनुसूचित जनजाति प्रमाण पत्र"},
    "caste_sc": {"en": "SC caste certificate", "hi": "अनुसूचित जाति प्रमाण पत्र"},
    "caste_obc": {"en": "OBC caste certificate", "hi": "अन्य पिछड़ा वर्ग प्रमाण पत्र"},
    "domicile": {"en": "domicile certificate", "hi": "मूल निवास प्रमाण पत्र"},
}


SEEN_LABEL = {"Bhuiyan": {"en": "land record (Bhuiyan)", "hi": "भू-अभिलेख (भुइयां)"},
              "Khadya": {"en": "ration roster (Khadya)", "hi": "राशन सूची (खाद्य)"}}


def records_used(cert_nos: list[str], registry_sources: list[str]) -> dict:
    """DPDP notice line: which records the decision used, and which were only seen (never the relative's caste)."""
    seen = [SEEN_LABEL[k] for k in SEEN_LABEL if any(src.startswith(k) for src in registry_sources)]
    return {"cert": list(cert_nos), "seen": {"en": ", ".join(x["en"] for x in seen), "hi": ", ".join(x["hi"] for x in seen)}}


# Round 5 (P1-8): the citizen gets plain words — legal references like "(… under Rule 3(3))" stay in the notice
LEGAL_PAREN_RE = re.compile(r"\s*\((?:[^()]|\([^()]*\))*?(?:Rule|नियम|creamy|क्रीमी)(?:[^()]|\([^()]*\))*\)")


def plain_words(text: dict) -> dict:
    return {k: LEGAL_PAREN_RE.sub("", v) if isinstance(v, str) else v for k, v in text.items()}


def citizen_message(action: str, app: dict, office: dict, deficiencies: list[dict] | None = None,
                    findings: str | None = None, records: dict | None = None, refer_to: str | None = None) -> dict:
    records = records or {"cert": [], "seen": {"en": "", "hi": ""}}
    if action == "send_back" and deficiencies:
        deficiencies = [{**d, "text": plain_words(d["text"])} for d in deficiencies]
    ctx = {
        "name": app["applicant_name"], "app_id": app["app_id"], "service": SHORT_SERVICE[app["service"]],
        "kendra": app["kendra"], "office": office, "deficiencies": deficiencies or [], "findings": findings or "",
        "records": records, "patwari": refer_to == "patwari",
    }
    text = render_pair(f"msg_{action}", **ctx)
    source = [app, office, SHORT_SERVICE[app["service"]], deficiencies or [], findings or "", records]
    return {"channel": "whatsapp", "text": text, "generator": "template", "checker": check_entities(text, source)}
