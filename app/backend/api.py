"""Praman Setu demo API (FastAPI). Every endpoint in app/CONTRACT.md.

In-memory state, persisted to state/state.json (decisions, confirmations, audit).
POST /api/reset restores the demo. No auth, no network calls, no LLM.

Run:  ./run.sh   (uvicorn api:app --port 8000)
"""
from __future__ import annotations

import copy
import json
from functools import lru_cache
import os
import re
import threading
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

import rules

import engine
import agent_trace
import renewal
import seed_round7
import geo
import mis
from messages import citizen_message, records_used

HERE = Path(__file__).parent
STATE_DIR = Path(os.environ.get("PRAMAN_STATE_DIR", HERE / "state"))
STATE_FILE = STATE_DIR / "state.json"
IST = timezone(timedelta(hours=5, minutes=30))

ROLES = ("kendra_operator", "sdo", "tehsildar", "collector")
DEFAULT_ACTOR = {
    "kendra_operator": "Operator, CSC Kongera",
    "sdo": "SDO (Revenue)",
    "tehsildar": "Tehsildar",
    "collector": "Collector, Kondagaon",
}
STATUS_FOR = {"approve": "approved", "send_back": "sent_back", "refer": "referred", "reject": "rejected",
              "show_cause": "show_cause_issued"}
KIND_FOR = {"approve": "order", "reject": "order", "refer": "reference", "send_back": "notice", "show_cause": "show_cause"}
SEQ_CODE = {"order": "", "reference": "REF/", "notice": "NTC/", "show_cause": "HRG/"}


# ------------------------------------------------------------------ state
class State:
    """dispositions: {app_id: {cert_no: {decision: same|not, grounds, note, ts}}} — the officer's acts on records.
    show_cause: {app_id: {...notice, reply}}. decisions: {app_id: final decision + snapshot}.
    history: called-back decisions. seq: document number counters per office and kind.
    Demo persistence is a mutable JSON file; production would be append-only and hash-chained."""

    def __init__(self):
        self.lock = threading.RLock()
        self.reset(persist=False)
        self.load()

    def reset(self, persist: bool = True):
        with self.lock:
            entries = json.load(open(geo.SYN / "applications.json", encoding="utf-8"))
            self.entries = {e["application"]["app_id"]: e for e in entries}
            for e in entries:
                e["application"].setdefault("sendback_count", 0)
            self.order = [e["application"]["app_id"] for e in entries]
            self.dispositions: dict[str, dict] = {}
            self.show_cause: dict[str, dict] = {}
            self.decisions: dict[str, dict] = {}
            self.history: list[dict] = []
            self.seq: dict[str, int] = {}
            self.audit: list[dict] = []
            self._cache: dict[str, dict] = {}
            # Round 4
            self.policy: dict[str, str] = dict(rules.POLICY_DEFAULTS)
            rules.POLICY.clear()
            rules.POLICY.update(self.policy)
            self.tray: list[dict] = []
            self.forwarded: dict[str, dict] = {}
            # Round 7: officer-requested native (maiden) village per application {app_id: village_lgd}
            self.native: dict[str, int] = {}
            # Round 5: a new id on every reset; the browser clears its UI modes when it sees a new one
            self.reset_id = datetime.now(IST).strftime("%Y%m%d%H%M%S%f")
            seed_round4(self.entries, self.order)
            if persist:
                self.save()

    def load(self):
        if not STATE_FILE.exists():
            return
        try:
            s = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        except Exception:
            return
        disp = s.get("dispositions")
        if disp is None:  # Round 1 state file: {"confirmed": {app: [cert_no]}}
            disp = {a: {c: {"decision": "same", "grounds": [], "note": "", "ts": None} for c in lst}
                    for a, lst in s.get("confirmed", {}).items()}
        self.dispositions = disp
        self.show_cause = s.get("show_cause", {})
        self.decisions = s.get("decisions", {})
        self.history = s.get("history", [])
        self.seq = s.get("seq", {})
        self.audit = s.get("audit", [])
        self.policy = {**rules.POLICY_DEFAULTS, **s.get("policy", {})}
        rules.POLICY.clear()
        rules.POLICY.update(self.policy)
        self.tray = s.get("tray", [])
        self.forwarded = s.get("forwarded", {})
        self.native = {k: int(v) for k, v in s.get("native", {}).items()}
        self.reset_id = s.get("reset_id") or self.reset_id
        for app_id, fw in self.forwarded.items():
            if app_id in self.entries:
                self.entries[app_id]["application"]["routed_to"] = fw["to"]
        for app_id, sc in self.show_cause.items():
            if app_id in self.entries and not sc.get("reply"):
                self.entries[app_id]["application"]["status"] = "show_cause_issued"
        for app_id, d in self.decisions.items():
            if app_id in self.entries:
                self.entries[app_id]["application"]["status"] = d.get("status") or STATUS_FOR[d["action"]]
                if d["action"] == "send_back":
                    self.entries[app_id]["application"]["sendback_count"] += 1

    def save(self):
        STATE_DIR.mkdir(exist_ok=True)
        STATE_FILE.write_text(json.dumps({"dispositions": self.dispositions, "show_cause": self.show_cause,
                                          "decisions": self.decisions, "history": self.history, "seq": self.seq,
                                          "audit": self.audit, "policy": self.policy, "tray": self.tray,
                                          "forwarded": self.forwarded, "native": self.native,
                                          "reset_id": self.reset_id},
                                         ensure_ascii=False, indent=1), encoding="utf-8")

    def entry(self, app_id: str) -> dict:
        e = self.entries.get(app_id)
        if not e:
            raise HTTPException(404, f"application {app_id} not found")
        return e

    def analysis(self, app_id: str) -> dict:
        with self.lock:
            if app_id not in self._cache:
                marks: dict = {}
                an = engine.analyse(self.entry(app_id), self.dispositions.get(app_id, {}),
                                    self.show_cause.get(app_id), native_village=self.native.get(app_id), timings=marks)
                an["trace"] = agent_trace.build(self.entry(app_id), an, marks)  # Round 8b (additive)
                self._cache[app_id] = an
            return self._cache[app_id]

    def invalidate(self, app_id: str):
        self._cache.pop(app_id, None)

    def next_no(self, code: str, kind: str) -> str:
        year = datetime.now(IST).year
        key = f"{code}/{SEQ_CODE[kind]}{year}"
        with self.lock:
            self.seq[key] = self.seq.get(key, 0) + 1
            return f"{key}/{self.seq[key]:04d}"

    def add_audit(self, role: str, action: str, app_id: str | None = None, records: list[str] | None = None,
                  note: str | None = None, actor: str | None = None, extra: dict | None = None) -> dict:
        entry = {"ts": datetime.now(IST).isoformat(timespec="seconds"), "actor_role": role,
                 "actor": actor or DEFAULT_ACTOR.get(role, role), "action": action,
                 "records_accessed": records or []}
        if app_id:
            entry["app_id"] = app_id
        if note:
            entry["note"] = note
        if extra:
            entry.update(extra)
        with self.lock:
            self.audit.append(entry)
            self.save()
        return entry


MISROUTED_ID = "SS/2026/KDG/08915"
MISROUTED_BASE = "SS/2026/KDG/08758"


def seed_round4(entries: dict, order: list) -> None:
    """Round 4 data fixes, applied on every reset (the synthetic generator's output is left untouched):
    - Hindi village labels from the digit-safe, de-duplicated LGD table (no two villages share a label);
    - registry rows minimised (ration card -> last 4 digits; no khasra number / area);
    - one PERMANENT caste application that landed on the Tehsildar desk (wrong-authority routing demo)."""
    for e in entries.values():
        engine.fix_village_hi(e["application"])
        e["evidence_rows"] = engine.minimise_rows(e.get("evidence_rows", []))
    if MISROUTED_ID not in entries and MISROUTED_BASE in entries:
        e = copy.deepcopy(entries[MISROUTED_BASE])
        a = e["application"]
        a["app_id"] = MISROUTED_ID
        a["routed_to"] = "tehsildar"
        a["certificate_kind"] = "permanent"
        a["status"] = "pending"
        a["sendback_count"] = 0
        a["applicant_name"] = {"en": "Nisha Yadav", "hi": "निशा यादव"}
        a["submitted_at"] = "2026-09-25T11:05:00+05:30"
        a["sla_due"] = "2026-10-16"
        a["persona_note"] = {"en": "Wrong-authority routing: a permanent caste application landed on the Tehsildar desk.",
                             "hi": "गलत प्राधिकारी: स्थायी जाति आवेदन तहसीलदार डेस्क पर आ गया।"}
        e["meta"] = {**e["meta"], "applicant_raw": "Nisha Yadav"}
        entries[MISROUTED_ID] = e
        order.append(MISROUTED_ID)
    # Round 7: the native (maiden) village search demo file
    if seed_round7.NATIVE_DEMO_ID not in entries:
        seed_round7.seed(entries, order)
        e = entries[seed_round7.NATIVE_DEMO_ID]
        engine.fix_village_hi(e["application"])
        e["evidence_rows"] = engine.minimise_rows(e.get("evidence_rows", []))


STATE = State()


def records_of(analysis: dict) -> list[str]:
    recs = [lm["certificate"]["cert_no"] for lm in analysis["lineage_matches"]]
    recs += sorted({ev["source"]["en"] for ev in analysis["evidence_rows"]})
    return recs


# ------------------------------------------------------------------ app
app = FastAPI(title="Praman Setu demo API", version="1.0",
              description="Lineage-evidence copilot for Sewa Setu caste/domicile certificates. SYNTHETIC citizen data.")
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
                   allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(HTTPException)
async def http_error(_, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": str(exc.detail)})


@lru_cache(maxsize=1)
def _population_count() -> int:
    with open(geo.SYN / "population.csv", encoding="utf-8") as f:
        return sum(1 for _ in f) - 1


@app.get("/api/health")
def health():
    return {"ok": True, "model_version": engine.matcher().model.version, "synthetic_population": _population_count(),
            "archive_certificates": len(engine.archive()), "reset_id": STATE.reset_id}


# Round 6 (P2): an SDO (Revenue) desk sees only its own sub-division's files. The demo officer is SDO Kondagaon;
# ?desk=Keskal shows the other desk, ?desk=all every sub-division (district view / fixtures).
DEFAULT_SDO_DESK = "Kondagaon"
SDO_DESKS = ["Kondagaon", "Keskal"]


def sdo_desk(desk: Optional[str]) -> Optional[str]:
    if desk == "all":
        return None
    if desk and desk not in SDO_DESKS:
        raise HTTPException(400, f"unknown SDO desk {desk}; one of {SDO_DESKS} or 'all'")
    return desk or DEFAULT_SDO_DESK


def wrong_desk(a: dict, desk: Optional[str]) -> Optional[dict]:
    """The sub-division a file belongs to, when it is not the acting SDO desk's (else None)."""
    if a["routed_to"] != "sdo" or desk is None:
        return None
    sd = engine.subdivision_of(a)
    return sd if sd["en"] != desk else None


def _wrong_desk_409(a: dict, desk: Optional[str], what: str):
    sd = wrong_desk(a, desk)
    if sd:
        raise HTTPException(409, f"{a['app_id']} belongs to {sd['office']['en']} (tehsil {a['tehsil']['en']}), not the SDO {desk} desk — "
                                 f"forward it; {what}")


@app.get("/api/desks")
def desks(role: str = Query("sdo")):
    if role != "sdo":
        return []
    out = []
    for d in SDO_DESKS:
        n = sum(1 for i in STATE.order if STATE.entries[i]["application"]["routed_to"] == "sdo"
                and STATE.entries[i]["application"]["status"] == "pending"
                and engine.subdivision_of(STATE.entries[i]["application"])["en"] == d)
        hi = next(v["hi"] for v in engine.SUBDIVISION.values() if v["en"] == d)
        out.append({"code": d, "label": {"en": f"SDO (Revenue), {d}", "hi": f"अनुविभागीय अधिकारी (राजस्व), {hi}"},
                    "short": {"en": f"SDO {d}", "hi": f"एसडीओ {hi}"}, "pending": n, "default": d == DEFAULT_SDO_DESK})
    return out


@app.get("/api/queue")
def queue(role: str = Query("sdo"), desk: Optional[str] = None):
    if role not in ROLES:
        raise HTTPException(400, f"unknown role {role}")
    dk = sdo_desk(desk) if role == "sdo" else None
    items = []
    for app_id in STATE.order:
        e = STATE.entries[app_id]
        a = e["application"]
        if role not in ("collector",) and a["routed_to"] != role:
            continue
        if dk and engine.subdivision_of(a)["en"] != dk:
            continue
        an = STATE.analysis(app_id)
        top = max((lm["match_probability"] for lm in an["lineage_matches"]), default=None)
        days = sla_days_left(a["sla_due"])
        items.append({"application": a, "lane": an["lane"], "suggested_action": an["suggested_action"],
                      "top_match_probability": top, "evidence_summary": an["evidence_summary"],
                      "evidence_rank": an["evidence_rank"], "next_step": an.get("next_step"), "sla_days_left": days, "sla_urgent": days <= URGENT_DAYS,
                      "stage": stage_of(app_id), "in_tray": any(t["app_id"] == app_id for t in STATE.tray),
                      "competent": an["competence"]["ok"],
                      # Round 6: the case page's own gate (single source of truth) and the file's sub-division desk
                      "ready_to_sign": an["ready_to_sign"], "subdivision": an["subdivision"]})
    items.sort(key=queue_key)
    return items


URGENT_DAYS = 3


def stage_of(app_id: str) -> dict | None:
    """Where a file waits outside the officer's desk (Round 4: Patwari field report, show-cause reply)."""
    d = STATE.decisions.get(app_id)
    if d and d.get("status") == "awaiting_patwari":
        p = d.get("patwari") or {}
        sent = datetime.fromisoformat(d["ts"])
        day = max(0, (datetime.now(IST).date() - sent.date()).days)
        return {"kind": "patwari", "day": day, "of": p.get("days", engine.PATWARI_DAYS), "halka": p.get("halka"),
                "report_by": p.get("report_by"), "overdue": day > p.get("days", engine.PATWARI_DAYS),
                "sla_clock": engine.sla_clock()}
    sc = STATE.show_cause.get(app_id)
    if sc and not sc.get("reply"):
        return {"kind": "show_cause", "reply_due": sc["reply_due"], "sla_clock": engine.sla_clock()}
    return None


def sla_days_left(due: str) -> int:
    return (datetime.fromisoformat(due[:10]).date() - datetime.now(IST).date()).days


def queue_key(q: dict):
    """Pending first; SLA-urgent (<= 3 days) floats to the top whatever the lane, so the no-record lane is never
    starved; then evidence state (records complete -> found, awaiting confirmation -> standard -> needs attention);
    then SLA due date."""
    a = q["application"]
    return (a["status"] != "pending", not q["sla_urgent"], q["evidence_rank"], a["sla_due"], a["submitted_at"])


@app.get("/api/applications/{app_id:path}")
def get_application(app_id: str, role: Optional[str] = None):
    if app_id.endswith("/issued"):  # the greedy {app_id:path} converter catches .../issued first
        return issued(app_id[: -len("/issued")])
    e = STATE.entry(app_id)
    an = STATE.analysis(app_id)
    who = role or e["application"]["routed_to"]
    with STATE.lock:  # check-and-append atomically: concurrent duplicate fetches must not both log
        last = STATE.audit[-1] if STATE.audit else None
        now = datetime.now(IST)
        duplicate = (last is not None and last["action"] == "case_opened" and last.get("app_id") == app_id
                     and last["actor_role"] == who and (now - datetime.fromisoformat(last["ts"])).total_seconds() < 3)
        if not duplicate:  # one open = one entry (React StrictMode / quick reloads fetch twice)
            STATE.add_audit(who, "case_opened", app_id, records_of(an),
                            note="Records shown to the officer (lineage matches and registry rows)")
    return {"application": e["application"], "analysis": an}


class ConfirmBody(BaseModel):
    cert_no: str
    officer_name: Optional[str] = None
    grounds: Optional[list[str]] = None   # Round 2: engine.SAME_GROUNDS codes (the officer's reasons)
    note: Optional[str] = None


class RejectMatchBody(BaseModel):
    cert_no: str
    officer_name: Optional[str] = None
    grounds: list[str] = Field(default_factory=list)  # engine.NOT_GROUNDS codes
    note: Optional[str] = None


class ClearMatchBody(BaseModel):
    cert_no: str
    officer_name: Optional[str] = None


def _match_or_400(an: dict, cert_no: str) -> dict:
    lm = next((m for m in an["lineage_matches"] if m["certificate"]["cert_no"] == cert_no), None)
    if lm is None:
        raise HTTPException(400, f"certificate {cert_no} is not among this case's lineage matches")
    return lm


def _pending_or_409(a: dict):
    if a["status"] != "pending":
        raise HTTPException(409, f"application {a['app_id']} is not pending ({a['status']}); the record can no longer be changed")


def _dispose(app_id: str, cert_no: str, decision: str, grounds: list[str], note: str | None, actor: str | None) -> dict:
    e = STATE.entry(app_id)
    _pending_or_409(e["application"])
    an = STATE.analysis(app_id)
    lm = _match_or_400(an, cert_no)
    allowed = engine.SAME_GROUNDS if decision == "same" else engine.NOT_GROUNDS
    bad = [g for g in grounds if g not in allowed]
    if bad:
        raise HTTPException(422, f"unknown grounds {bad}; allowed: {allowed}")
    note = (note or "").strip()
    if decision == "not" and not grounds and len(note) < 10:
        raise HTTPException(422, "'not this family' needs at least one ground or a note of 10+ characters")
    with STATE.lock:
        STATE.dispositions.setdefault(app_id, {})[cert_no] = {
            "decision": decision, "grounds": grounds, "note": note,
            "ts": datetime.now(IST).isoformat(timespec="seconds")}
        STATE.invalidate(app_id)
    an = STATE.analysis(app_id)
    labels = ", ".join(engine.GROUND_LABEL[g]["en"] for g in grounds) or "—"
    if decision == "same":
        STATE.add_audit(e["application"]["routed_to"], "relationship_confirmed", app_id, [cert_no],
                        note=f"Officer confirmed the family relationship with certificate {cert_no} "
                             f"({lm['match_level']} link). Grounds: {labels}" + (f". Note: {note}" if note else "")
                             + f". Lane now {an['lane']}.", actor=actor)
    else:
        STATE.add_audit(e["application"]["routed_to"], "match_rejected", app_id, [cert_no],
                        note=f"Officer found certificate {cert_no} is NOT the applicant's family. Grounds: {labels}"
                             + (f". Note: {note}" if note else "") + f". Removed from evidence; lane now {an['lane']}.", actor=actor)
    return {"application": e["application"], "analysis": an}


@app.post("/api/applications/{app_id:path}/confirm-relationship")
def confirm_relationship(app_id: str, body: ConfirmBody):
    an = STATE.analysis(app_id)
    lm = _match_or_400(an, body.cert_no)
    grounds = body.grounds if body.grounds is not None else lm.get("default_grounds", [])
    return _dispose(app_id, body.cert_no, "same", grounds, body.note, body.officer_name)


@app.post("/api/applications/{app_id:path}/reject-match")
def reject_match(app_id: str, body: RejectMatchBody):
    return _dispose(app_id, body.cert_no, "not", body.grounds, body.note, body.officer_name)


@app.post("/api/applications/{app_id:path}/clear-match")
def clear_match(app_id: str, body: ClearMatchBody):
    """Undo a 'same family' / 'not this family' act — allowed until the decision is signed."""
    e = STATE.entry(app_id)
    _pending_or_409(e["application"])
    an = STATE.analysis(app_id)
    _match_or_400(an, body.cert_no)
    with STATE.lock:
        prev = STATE.dispositions.get(app_id, {}).pop(body.cert_no, None)
        STATE.invalidate(app_id)
    if prev is None:
        raise HTTPException(400, f"no confirmation or dismissal recorded for {body.cert_no}")
    an = STATE.analysis(app_id)
    STATE.add_audit(e["application"]["routed_to"],
                    "relationship_unconfirmed" if prev["decision"] == "same" else "match_rejection_undone",
                    app_id, [body.cert_no], note=f"Officer withdrew the earlier '{'same family' if prev['decision'] == 'same' else 'not this family'}' "
                                                 f"record for certificate {body.cert_no} before signing; lane now {an['lane']}.",
                    actor=body.officer_name)
    return {"application": e["application"], "analysis": an}


class NativeVillageBody(BaseModel):
    village_lgd: Optional[int] = None   # null clears the native-village search
    officer_name: Optional[str] = None


@app.post("/api/applications/{app_id:path}/search-native-village")
def search_native_village(app_id: str, body: NativeVillageBody):
    """Round 7: re-run lineage matching with the applicant's native (maiden) village as well (married women's family
    records sit in the parental village). Records found this way need the officer's confirmation like any found record."""
    e = STATE.entry(app_id)
    a = e["application"]
    _pending_or_409(a)
    if body.village_lgd is not None and body.village_lgd not in geo.villages():
        raise HTTPException(422, f"unknown village LGD code {body.village_lgd}")
    if body.village_lgd is not None and body.village_lgd == a["village_lgd"]:
        raise HTTPException(422, "the native village is the applicant's current village — it is already searched")
    an = STATE.analysis(app_id)
    # a record found only through the earlier native search and already marked by the officer must be undone first
    acted = [lm["certificate"]["cert_no"] for lm in an["lineage_matches"]
             if lm.get("found_via") == "native_village" and lm.get("disposition")]
    prev = STATE.native.get(app_id)
    if acted and body.village_lgd != prev:
        raise HTTPException(409, f"you already marked record {', '.join(acted)} found in the earlier native-village search — undo that first")
    with STATE.lock:
        if body.village_lgd is None:
            STATE.native.pop(app_id, None)
        else:
            STATE.native[app_id] = body.village_lgd
        STATE.invalidate(app_id)
    an = STATE.analysis(app_id)
    role = a["routed_to"]
    if body.village_lgd is None:
        STATE.add_audit(role, "native_village_search_cleared", app_id, [],
                        note="Officer removed the native (maiden) village search", actor=body.officer_name)
    else:
        v = geo.villages()[body.village_lgd]
        found = an["native_village"]["found_cert_nos"]
        STATE.add_audit(role, "native_village_searched", app_id, found,
                        note=(f"Officer searched the applicant's native (maiden) village {v['name_en']} (LGD {v['lgd']}, "
                              f"tehsil {v['tehsil_en']}, district {geo.districts()[v['district_lgd']]['name_en']}): "
                              f"{len(found)} record(s) found" + (f" ({', '.join(found)})" if found else "")
                              + f". Found records still need the officer's confirmation; lane now {an['lane']}."),
                        actor=body.officer_name, extra={"native_village_lgd": v["lgd"]})
    return {"application": a, "analysis": an}


@app.delete("/api/applications/{app_id:path}/confirm-relationship")
def unconfirm_relationship(app_id: str, cert_no: str = Query(...)):
    return clear_match(app_id, ClearMatchBody(cert_no=cert_no))


class I18n(BaseModel):
    en: str = ""
    hi: str = ""


class EvidenceBasis(BaseModel):
    caste: Optional[str] = None
    residence: Optional[str] = None


class DecisionBody(BaseModel):
    action: Literal["approve", "send_back", "refer", "reject", "show_cause"]
    officer_name: str = Field(min_length=1)
    order_text: I18n
    deficiency_codes: Optional[list[str]] = None
    findings: Optional[str] = None
    refer_to: Optional[str] = None           # Round 1: destination of a reference (see analysis.refer_options)
    custom_deficiency: Optional[str] = None  # Round 1: officer's own send-back reason, in addition to the library
    # Round 2
    evidence_basis: Optional[EvidenceBasis] = None  # standard review: which document shows the claim
    system_text: Optional[I18n] = None              # the system draft the officer started from (to record edits)
    time_on_screen_s: Optional[float] = None
    read_confirmed: Optional[bool] = None           # "I have read the order" tick in the signing dialog
    # Round 4
    channel: Literal["praman", "sewasetu_native"] = "praman"  # decided in the Praman view, or with Sewa Setu's own buttons
    tool_visible: Optional[bool] = None             # was the Praman panel visible when deciding (not shadow / not down)
    shadow: Optional[bool] = None                   # shadow mode (pilot phase 1): tool check hidden until the decision
    # Round 6
    desk: Optional[str] = None                      # the acting SDO desk (sub-division); a file of another desk is refused
    creamy_layer: Optional["CreamyLayer"] = None    # OBC approvals: the officer's creamy-layer finding + documents relied on


class CreamyLayer(BaseModel):
    non_creamy: bool
    docs: list[str] = Field(default_factory=list)


DecisionBody.model_rebuild()


MIN_FINDING_CHARS = 15
# An order must never be signed with an unfilled slot: "[ ....... ]", "[Officer …]", "Date: ______".
PLACEHOLDER_RE = re.compile(r"\[\s*(\.{3,}|…)|\[\s*(Officer|अधिकारी|written findings|लिखित|specify|आवश्यक दस्तावेज़)|_{4,}")


def snapshot_of(an: dict, body: DecisionBody, final: dict, edited: bool) -> dict:
    """What the officer saw and did, stored with the decision (for vigilance / appeal)."""
    return {
        "model_version": an["model_version"], "rules_version": an["rules_version"],
        "lane": an["lane"], "suggested_action": an["suggested_action"],
        "agreed_with_suggestion": body.action == an["suggested_action"],
        "matches_shown": [{"cert_no": lm["certificate"]["cert_no"], "relation": lm["relation"],
                           "level": lm["match_level"], "probability": lm["match_probability"],
                           "usable": lm["usable_as_evidence"],
                           "validity_headline": (lm.get("validity_headline") or {}).get("en"),
                           "validity_failed": [v["code"] for v in lm["validity"] if not v["ok"]],
                           "disposition": lm.get("disposition")} for lm in an["lineage_matches"]],
        "flags_open": [{"code": f["code"], "severity": f["severity"], "cert_nos": f.get("cert_nos", [])} for f in an["flags"]],
        "checklist": [{"code": i["code"], "present": i["present"], "required": i["required"], "state": i.get("state")}
                      for i in an["checklist"]],
        "accepted_cert_nos": an["accepted_cert_nos"],
        "evidence_basis": body.evidence_basis.model_dump() if body.evidence_basis else None,
        "creamy_layer": body.creamy_layer.model_dump() if body.creamy_layer else None,
        "show_cause": an.get("show_cause"),
        "system_draft_sha": engine.sha(body.system_text.model_dump()) if body.system_text else None,
        "signed_sha": engine.sha(final),
        "edited": edited,
        "read_confirmed": bool(body.read_confirmed),
        "time_on_screen_s": round(body.time_on_screen_s, 1) if body.time_on_screen_s is not None else None,
        "authoritative_lang": "hi",
        # Round 4: where the decision was taken and what the officer could see before deciding
        "channel": body.channel,
        "shadow_mode": bool(body.shadow),
        "tool_shown_before_decision": bool(body.tool_visible if body.tool_visible is not None else (body.channel == "praman" and not body.shadow)),
        "hidden_before_decision": (["lane", "suggestion", "link_probability", "pre_ticked_reasons"] + (["evidence_panel"] if body.channel == "sewasetu_native" else []))
                                  if body.shadow else [],
    }


@app.post("/api/applications/{app_id:path}/decision")
def decision(app_id: str, body: DecisionBody):
    return _decide(app_id, body)


def check_creamy(an: dict, body: DecisionBody) -> Optional[list[str]]:
    """Round 6 (P1): an OBC approval records the officer's creamy-layer finding and the documents relied on, in the
    order (HI + EN). Sewa Setu's own native order (Praman not used) is left as today."""
    cl = an.get("creamy_layer")
    if body.action != "approve" or not cl:
        return None
    texts = body.order_text.model_dump()
    has_mark = all(engine.CREAMY_MARK[lang] in (texts.get(lang) or "") for lang in ("en", "hi"))
    if body.channel == "sewasetu_native" and body.creamy_layer is None and not any(
            engine.CREAMY_MARK[lang] in (texts.get(lang) or "") for lang in ("en", "hi")):
        return None
    if not body.creamy_layer or not body.creamy_layer.non_creamy:
        raise HTTPException(422, "an OBC approval needs your creamy-layer finding: tick 'not in the creamy layer (non-creamy layer)' "
                                 "and the documents relied on — if the applicant is in the creamy layer, do not approve")
    opts = {o["code"] for o in cl["options"]}
    docs = body.creamy_layer.docs
    if not docs or any(d not in opts for d in docs):
        raise HTTPException(422, f"name the documents relied on for the creamy-layer finding (from analysis.creamy_layer.options: {sorted(opts)})")
    if not has_mark:
        raise HTTPException(422, "the order must record the creamy-layer finding (Hindi and English)")
    return docs


def _decide(app_id: str, body: DecisionBody, esign_txn: str | None = None) -> dict:
    e = STATE.entry(app_id)
    a = e["application"]
    if a["status"] != "pending":
        raise HTTPException(409, f"application {app_id} is already decided ({a['status']})")
    an = STATE.analysis(app_id)
    if not an["competence"]["ok"]:
        raise HTTPException(409, "not your competence: this permanent caste application must be forwarded to the "
                                 f"{an['competence']['forward_label']['en']} (POST …/forward)")
    if body.desk:
        _wrong_desk_409(a, sdo_desk(body.desk), "it cannot be decided here")
    creamy_docs = check_creamy(an, body)
    native = body.channel == "sewasetu_native"
    findings = (body.findings or "").strip()
    why = an["finding_required"].get(body.action)
    if native:
        # Sewa Setu's own buttons: the tool's picker / disposition steps do not apply. If the panel was visible and a
        # point was open, approving over it still needs the officer's written reasons (remarks).
        attention_open = any(f["severity"] == "attention" for f in an["flags"])
        why = an["finding_required"].get(body.action) if body.action in ("reject", "show_cause") else None
        if body.action == "approve" and body.tool_visible and attention_open:
            why = {"en": "An attention point was open in the Praman panel.", "hi": "प्रमाण पैनल में एक ध्यान-बिंदु खुला था।"}
    if body.action == "reject" and not findings:
        raise HTTPException(422, "reject requires written findings")
    if why and len(findings) < MIN_FINDING_CHARS:
        raise HTTPException(422, f"{body.action} requires your written finding (at least {MIN_FINDING_CHARS} characters): {why['en']}")
    if body.action == "reject" and not (an.get("show_cause") and an["show_cause"].get("reply")):
        raise HTTPException(422, "a rejection needs a show-cause notice first: issue it (action 'show_cause') and record the "
                                 "reply or its absence before the final order")
    if body.action == "approve" and an["disposition_required"] and not native:
        raise HTTPException(422, "every possible family record shown must be disposed of first ('same family' or "
                                 f"'not this family'): {an['disposition_required']}")
    eb = None
    if body.action == "approve" and an["evidence_required"] and not native:
        eb = body.evidence_basis
        opts = an["evidence_options"]
        ok_c = (not opts["caste"]) or (eb and eb.caste in {o["code"] for o in opts["caste"]})
        ok_r = eb and eb.residence in {o["code"] for o in opts["residence"]}
        if not (ok_c and ok_r):
            raise HTTPException(422, "approval on standard review needs the document that shows the claim "
                                     "(evidence_basis.caste / evidence_basis.residence from analysis.evidence_options)")
    for lang in ("en", "hi"):
        if PLACEHOLDER_RE.search(getattr(body.order_text, lang) or ""):
            raise HTTPException(422, f"the order text ({lang}) still contains an unfilled placeholder")
    refer_to = None
    if body.action == "refer":
        opts = [o["code"] for o in an["refer_options"]]
        refer_to = body.refer_to or an["refer_to"]
        if refer_to not in opts:
            raise HTTPException(422, f"refer_to must be one of {opts}")
    defs = an["deficiencies"]
    if body.deficiency_codes is not None:
        known = {d["code"]: d for d in defs}
        from rules import DEFICIENCY_TEXT
        defs = [known.get(c) or {"code": c, "text": DEFICIENCY_TEXT[c]} for c in body.deficiency_codes
                if c in known or c in DEFICIENCY_TEXT]
    if body.action == "send_back" and (body.custom_deficiency or "").strip():
        txt = body.custom_deficiency.strip()
        defs = defs + [{"code": "custom", "text": {"en": txt, "hi": txt}}]
    if body.action == "send_back" and not defs:
        raise HTTPException(422, "send_back needs at least one deficiency (deficiency_codes)")

    info = an["office_info"]
    kind = KIND_FOR[body.action]
    now = datetime.now(IST)
    number = STATE.next_no(info["code"], kind)
    final = engine.finalise(body.order_text.model_dump(), kind, number, info, now)
    edited = bool(body.system_text) and body.system_text.model_dump() != body.order_text.model_dump()
    snap = snapshot_of(an, body, final, edited)
    records = records_of(an)
    actor = body.officer_name
    if body.action == "show_cause":
        with STATE.lock:
            a["status"] = STATUS_FOR["show_cause"]
            STATE.show_cause[app_id] = {
                "no": number, "date": now.strftime("%d-%m-%Y"), "issued_ts": now.isoformat(timespec="seconds"),
                "reply_due": (now + timedelta(days=rules.SHOW_CAUSE_DAYS)).strftime("%d-%m-%Y"),
                "grounds": findings, "adverse_cert_nos": an["adverse_cert_nos"], "reply": None,
                "text": final, "snapshot": snap, "officer_name": actor}
            STATE.invalidate(app_id)
        msg = citizen_message("show_cause", a, info["office"], defs, None)
        STATE.show_cause[app_id]["citizen_message"] = msg
        audit = STATE.add_audit(a["routed_to"], "show_cause_issued", app_id, records,
                                note=f"Pre-rejection hearing notice {number} issued; reply due {STATE.show_cause[app_id]['reply_due']}. Grounds: {findings}",
                                actor=actor, extra={"snapshot": snap, "document_no": number})
        return {"application": a, "citizen_message": msg, "audit": audit, "document_kind": "show_cause",
                "document_no": number, "issued_text": final}
    status = STATUS_FOR[body.action]
    patwari = None
    if body.action == "refer" and refer_to == "patwari":
        status = "awaiting_patwari"
        pf = an["patwari_form"]
        patwari = {"halka": pf["halka"]["label"], "days": pf["days"], "report_by": pf["report_by"], "form": pf,
                   "sent_ts": now.isoformat(timespec="seconds")}
    if esign_txn:
        snap["esign_txn"] = esign_txn
    with STATE.lock:
        a["status"] = status
        if body.action == "send_back":
            a["sendback_count"] = a.get("sendback_count", 0) + 1
        STATE.decisions[app_id] = {"action": body.action, "status": status, "officer_name": actor, "document_no": number,
                                   "document_kind": kind, "order_text": final, "submitted_text": body.order_text.model_dump(),
                                   "deficiency_codes": [d["code"] for d in defs], "findings": findings or None,
                                   "refer_to": refer_to, "evidence_basis": eb.model_dump() if eb else None,
                                   "suggested_action": an["suggested_action"],
                                   "agreed_with_suggestion": body.action == an["suggested_action"],
                                   "patwari": patwari, "esign_txn": esign_txn, "channel": body.channel,
                                   "creamy_layer": {"non_creamy": True, "docs": creamy_docs} if creamy_docs else None,
                                   "snapshot": snap, "ts": now.isoformat(timespec="seconds")}
    used = records_used(an["accepted_cert_nos"] if body.action == "approve" else
                        [lm["certificate"]["cert_no"] for lm in an["lineage_matches"] if (lm.get("disposition") or {}).get("decision") != "not"],
                        [ev["source"]["en"] for ev in an["evidence_rows"]])
    msg = citizen_message(body.action, a, info["office"], defs, None, used)
    with STATE.lock:
        STATE.decisions[app_id]["citizen_message"] = msg
    note = (f"{kind.capitalize()} {number} issued"
            + (f" (to {refer_to})" if refer_to else "")
            + (f"; relied on: {', '.join(an['accepted_cert_nos'])}" if an["accepted_cert_nos"] else "")
            + (f"; evidence: {eb.caste or '—'} / {eb.residence}" if eb else "")
            + (f"; creamy-layer finding: non-creamy layer, relied on {', '.join(creamy_docs)}" if creamy_docs else "")
            + f"; system text {'EDITED by the officer' if edited else 'unedited'}"
            + (f"; findings: {findings}" if findings else "")
            + ("; decided with Sewa Setu's own buttons" if native else "")
            + ("; shadow mode: the tool's check was shown after the decision" if body.shadow else "")
            + (f"; DSC token transaction {esign_txn} (sign tray)" if esign_txn else ""))
    audit = STATE.add_audit(a["routed_to"], f"decision_{body.action}", app_id, records, note=note, actor=actor,
                            extra={"snapshot": snap, "document_no": number, **({"esign_txn": esign_txn} if esign_txn else {})})
    return {"application": a, "citizen_message": msg, "audit": audit, "document_kind": kind,
            "document_no": number, "issued_text": final, "patwari": patwari,
            "tool_check": {"suggested_action": an["suggested_action"], "lane": an["lane"],
                           "agrees": body.action == an["suggested_action"],
                           "reason": an["suggested_action_reason"]}}


class ShowCauseReplyBody(BaseModel):
    outcome: Literal["reply_received", "no_reply"]
    summary: Optional[str] = None
    officer_name: Optional[str] = None


@app.post("/api/applications/{app_id:path}/show-cause-reply")
def show_cause_reply(app_id: str, body: ShowCauseReplyBody):
    """Demo simulation: the applicant's reply arrives (or the 15 days lapse). The case returns to the officer."""
    e = STATE.entry(app_id)
    a = e["application"]
    sc = STATE.show_cause.get(app_id)
    if not sc or a["status"] != "show_cause_issued":
        raise HTTPException(409, "no show-cause notice is awaiting a reply for this application")
    now = datetime.now(IST)
    with STATE.lock:
        sc["reply"] = {"outcome": body.outcome, "date": now.strftime("%d-%m-%Y"),
                       "summary": (body.summary or "").strip() or None, "simulated": True}
        a["status"] = "pending"
        STATE.invalidate(app_id)
    an = STATE.analysis(app_id)
    STATE.add_audit(a["routed_to"], "show_cause_reply" if body.outcome == "reply_received" else "show_cause_no_reply",
                    app_id, [], note=(f"Reply to hearing notice {sc['no']} received (simulated)" + (f": {sc['reply']['summary']}" if sc["reply"]["summary"] else "")
                                      if body.outcome == "reply_received" else
                                      f"No reply to hearing notice {sc['no']} by {sc['reply_due']} (simulated)"),
                    actor=body.officer_name)
    return {"application": a, "analysis": an}


class CallbackBody(BaseModel):
    reason: str = Field(min_length=1)
    officer_name: Optional[str] = None


MIN_CALLBACK_REASON = 10


@app.post("/api/applications/{app_id:path}/callback")
def callback(app_id: str, body: CallbackBody):
    """Call back a decision within 10 minutes, with a mandatory reason (as in NIC ServicePlus)."""
    e = STATE.entry(app_id)
    a = e["application"]
    reason = body.reason.strip()
    if len(reason) < MIN_CALLBACK_REASON:
        raise HTTPException(422, f"a call-back needs a reason of at least {MIN_CALLBACK_REASON} characters")
    now = datetime.now(IST)
    with STATE.lock:
        d = STATE.decisions.get(app_id)
        sc = STATE.show_cause.get(app_id)
        if d is not None:
            age = (now - datetime.fromisoformat(d["ts"])).total_seconds() / 60
            if age > rules.CALLBACK_MINUTES:
                raise HTTPException(409, f"the call-back window ({rules.CALLBACK_MINUTES} minutes) has passed; use review / appeal")
            STATE.history.append({**d, "app_id": app_id, "called_back_ts": now.isoformat(timespec="seconds"), "callback_reason": reason})
            del STATE.decisions[app_id]
            if d["action"] == "send_back":
                a["sendback_count"] = max(0, a.get("sendback_count", 0) - 1)
            what, no = d["action"], d.get("document_no")
        elif sc is not None and a["status"] == "show_cause_issued":
            age = (now - datetime.fromisoformat(sc["issued_ts"])).total_seconds() / 60
            if age > rules.CALLBACK_MINUTES:
                raise HTTPException(409, f"the call-back window ({rules.CALLBACK_MINUTES} minutes) has passed")
            STATE.history.append({**sc, "app_id": app_id, "action": "show_cause", "called_back_ts": now.isoformat(timespec="seconds"),
                                  "callback_reason": reason})
            del STATE.show_cause[app_id]
            what, no = "show_cause", sc["no"]
        else:
            raise HTTPException(409, "nothing to call back: the application has no recent decision")
        a["status"] = "pending"
        STATE.invalidate(app_id)
    an = STATE.analysis(app_id)
    audit = STATE.add_audit(a["routed_to"], "decision_called_back", app_id, [],
                            note=f"{what} {no} called back within {rules.CALLBACK_MINUTES} minutes. Reason: {reason}",
                            actor=body.officer_name)
    return {"application": a, "analysis": an, "audit": audit}


@app.get("/api/applications/{app_id:path}/issued")
def issued(app_id: str):
    """The issued (finalised) document of the latest decision or show-cause notice."""
    STATE.entry(app_id)
    d = STATE.decisions.get(app_id)
    if d:
        return {"document_no": d["document_no"], "document_kind": d["document_kind"], "text": d["order_text"],
                "ts": d["ts"], "snapshot": d["snapshot"], "citizen_message": d.get("citizen_message")}
    sc = STATE.show_cause.get(app_id)
    if sc:
        return {"document_no": sc["no"], "document_kind": "show_cause", "text": sc["text"], "ts": sc["issued_ts"],
                "snapshot": sc["snapshot"], "citizen_message": sc.get("citizen_message")}
    raise HTTPException(404, "no issued document")


class PrecheckBody(BaseModel):
    service: Literal["caste_st", "caste_sc", "caste_obc", "domicile"]
    applicant_name: str = ""
    father_name: str = Field(min_length=1)
    village_lgd: Optional[int] = None
    village_name: Optional[str] = None
    district_lgd: Optional[int] = None
    birth_year: Optional[int] = None
    claimed_category: Optional[str] = None
    relative_cert_no: Optional[str] = None
    consent: Optional[bool] = None   # Round 2: the operator ticked the applicant's consent
    native_village_lgd: Optional[int] = None   # Round 7: native / maiden village (married women), searched as well


@app.post("/api/precheck")
def precheck(body: PrecheckBody):
    if body.consent is False:  # Round 5: no archive lookup without the applicant's consent
        raise HTTPException(400, "the applicant's consent is required before the archive is searched")
    if body.native_village_lgd is not None and body.native_village_lgd not in geo.villages():
        raise HTTPException(422, f"unknown native village LGD code {body.native_village_lgd}")
    res = engine.precheck(body.model_dump())
    native = ""
    if body.native_village_lgd:
        v = geo.villages()[body.native_village_lgd]
        found = [m["certificate"]["cert_no"] for m in res["matches"] if m.get("found_via") == "native_village"]
        native = (f"; native (maiden) village {v['name_en']} (LGD {v['lgd']}) searched as well"
                  f" — {len(found)} record(s) found there" + (f" ({', '.join(found)})" if found else ""))
    STATE.add_audit("kendra_operator", "precheck", None, [m["certificate"]["cert_no"] for m in res["matches"]],
                    note=(f"Archive lookup {'with the applicant' + chr(39) + 's consent (ticked by the operator)' if body.consent else 'WITHOUT a recorded consent tick'}: "
                          f"{body.applicant_name or '—'} / {body.father_name}{native}"))
    return res


@app.get("/api/villages")
def villages(district_lgd: Optional[int] = None, q: str = ""):
    ql = q.strip().lower()
    out = []
    for v in geo.villages().values():
        if district_lgd and v["district_lgd"] != district_lgd:
            continue
        if ql and not (v["name_en"].lower().startswith(ql) or v["name_hi"].startswith(q.strip())):
            continue
        out.append(v)
    if ql and len(out) < 20:  # then substring matches
        seen = {v["lgd"] for v in out}
        for v in geo.villages().values():
            if (not district_lgd or v["district_lgd"] == district_lgd) and v["lgd"] not in seen and ql in v["name_en"].lower():
                out.append(v)
    out.sort(key=lambda v: v["name_en"])
    dist = geo.districts()
    return [{"village_lgd": v["lgd"], "name": {"en": v["name_en"], "hi": v["name_hi"]},
             "tehsil": {"en": v["tehsil_en"], "hi": v["tehsil_hi"]}, "district_lgd": v["district_lgd"],
             # Round 7: the district name (the native-village picker searches the whole state)
             "district": {"en": dist[v["district_lgd"]]["name_en"], "hi": dist[v["district_lgd"]]["name_hi"]}} for v in out[:20]]


@app.get("/api/mis/summary")
def mis_summary():
    return mis.summary()


@app.get("/api/geo/districts")
def geo_districts():
    return mis.districts_geojson()


PILOT_TARGETS = [
    {"metric": {"en": "Lineage link precision (random review of 'same family' files)", "hi": "वंश-कड़ी की परिशुद्धता ('वही परिवार' फ़ाइलों की यादृच्छिक समीक्षा)"},
     "target": {"en": "≥ 98%", "hi": "≥ 98%"}, "stop_rule": {"en": "Pause if < 95% in any fortnight", "hi": "किसी पखवाड़े में < 95% हो तो रोकें"}},
    {"metric": {"en": "Exclusion guard: rejection rate, pilot minus control (ST women, SC, OBC, no-record, migrants)", "hi": "बहिष्करण सुरक्षा: अस्वीकृति दर, पायलट घटा नियंत्रण (अ.ज.जा. महिलाएँ, अ.जा., अ.पि.व., बिना अभिलेख, प्रवासी)"},
     "target": {"en": "Δ ≤ +1 pp in every group", "hi": "हर समूह में Δ ≤ +1 प्रतिशत बिंदु"}, "stop_rule": {"en": "Pause at +2 pp in any group", "hi": "किसी समूह में +2 प्रतिशत बिंदु पर रोकें"}},
    {"metric": {"en": "Send-backs cured on the same application", "hi": "उसी आवेदन में पूर्ण हुई वापसियाँ"},
     "target": {"en": "≥ 50%", "hi": "≥ 50%"}, "stop_rule": {"en": "Review the reason library if < 35%", "hi": "< 35% हो तो कारण-सूची की समीक्षा"}},
    {"metric": {"en": "Officers who find the check useful (one-tap feedback, anonymous)", "hi": "जांच को उपयोगी मानने वाले अधिकारी (एक-टैप प्रतिक्रिया, अनाम)"},
     "target": {"en": "≥ 60%", "hi": "≥ 60%"}, "stop_rule": {"en": "Redesign if < 40% after 30 days", "hi": "30 दिन बाद < 40% हो तो पुनः डिज़ाइन"}},
    {"metric": {"en": "Median time to issue, records-complete files", "hi": "अभिलेख-पूर्ण फ़ाइलों में जारी होने का माध्य समय"},
     "target": {"en": "Same day at the SDO desk", "hi": "एसडीओ डेस्क पर उसी दिन"}, "stop_rule": {"en": "Investigate if slower than control", "hi": "नियंत्रण से धीमा हो तो जांच"}},
    {"metric": {"en": "Wrong-family confirmations found on appeal / scrutiny", "hi": "अपील / छानबीन में मिली गलत-परिवार पुष्टियाँ"},
     "target": {"en": "0", "hi": "0"}, "stop_rule": {"en": "Stop on the first confirmed case; root-cause review", "hi": "पहले पुष्ट मामले पर रोकें; मूल-कारण समीक्षा"}},
]


@app.get("/api/pilot/stats")
def pilot_stats():
    """Round 4: pilot TARGETS and stop rules (not results). The lane mix is computed from the demo queue.
    No officer-level field is returned: agreement with the tool is never an officer metric."""
    lanes = {"records_complete": 0, "standard_review": 0, "needs_attention": 0}
    for app_id in STATE.order:
        lanes[STATE.analysis(app_id)["lane"]] += 1
    n = sum(lanes.values()) or 1
    return {
        "synthetic": False,
        "kind": "targets",
        "note": {"en": "Pilot targets and stop rules for a proposed 90-day shadow pilot in 2 tehsils — measured in the pilot, not results.",
                 "hi": "प्रस्तावित 90-दिवसीय शैडो पायलट (2 तहसील) हेतु लक्ष्य व रोक-नियम — पायलट में मापा जाएगा, ये परिणाम नहीं हैं।"},
        "lane_mix": {k: round(v / n, 3) for k, v in lanes.items()},
        "lane_mix_source": {"en": "demo queue (synthetic applications)", "hi": "डेमो कतार (सिंथेटिक आवेदन)"},
        "targets": PILOT_TARGETS,
    }


@app.get("/api/collector/tiles")
def collector_tiles():
    """Round 4: support tiles for the Collector — files and tehsils, never officers."""
    pat, sc, disagree, fb = [], [], [], {"yes": 0, "no": 0, "wrong_family": 0}
    for app_id in STATE.order:
        a = STATE.entries[app_id]["application"]
        st = stage_of(app_id)
        if st and st["kind"] == "patwari":
            pat.append({"app_id": app_id, "tehsil": a["tehsil"], "day": st["day"], "of": st["of"], "overdue": st["overdue"]})
        if st and st["kind"] == "show_cause":
            sc.append({"app_id": app_id, "tehsil": a["tehsil"], "reply_due": st["reply_due"]})
        d = STATE.decisions.get(app_id)
        if d and not d.get("agreed_with_suggestion"):
            disagree.append(app_id)
        if d and d.get("tool_feedback"):
            fb[d["tool_feedback"]["useful"]] = fb.get(d["tool_feedback"]["useful"], 0) + 1
    svc = {x["key"]: x for x in mis.summary()["services"]}
    # Round 5 (P1-5): like with like — SC/ST certificates at camps vs the regular SC/ST service, both over decided
    camp = [svc[k] for k in ("camp_caste_scst",) if k in svc]
    camp_dec = sum(x["approved"] + x["rejected"] for x in camp) or 1
    camp_pct = round(100 * sum(x["rejected"] for x in camp) / camp_dec, 1)
    reg = svc.get("caste_scst", {})
    return {
        "awaiting_patwari": {"count": len(pat), "over_7_days": sum(p["overdue"] for p in pat), "files": pat},
        "show_cause_pending": {"count": len(sc), "files": sc},
        "camp": {"camp_rejection_pct": camp_pct, "regular_rejection_pct": reg.get("rejection_pct_decided"),
                 "basis": {"en": "SC/ST certificates · rejected ÷ decided", "hi": "अ.जा./अ.ज.जा. प्रमाण पत्र · अस्वीकृत ÷ निर्णीत"},
                 "camp_applications": sum(x["total"] for x in camp), "source": {"en": "Sewa Setu public MIS, 27-09-2026", "hi": "सेवा सेतु सार्वजनिक MIS, 27-09-2026"},
                 "roadmap": {"en": "Camp mode (pre-check list the day before a camp; cached evidence cards) is on the roadmap, not in this demo.",
                             "hi": "कैंप मोड (कैंप से एक दिन पहले पूर्व-जांच सूची; संचित साक्ष्य कार्ड) रोडमैप में है, इस डेमो में नहीं।"}},
        "tool_disagreements": {"count": len(disagree), "reviewed": 0, "files": disagree},
        "tool_feedback": fb,
    }


# ------------------------------------------------------------------ Round 4: policy settings (Collector / CHiPS admin)
class PolicyBody(BaseModel):
    tehsildar_issued_permanent: Optional[Literal["valid_with_note", "verify"]] = None
    sla_pause: Optional[Literal["running", "paused_proposed"]] = None  # Round 6: PROPOSED policy, display only
    actor: Optional[str] = None


@app.get("/api/policy")
def get_policy():
    return {"policy": STATE.policy, "options": rules.POLICY_OPTIONS, "defaults": rules.POLICY_DEFAULTS}


@app.post("/api/policy")
def set_policy(body: PolicyBody):
    if body.tehsildar_issued_permanent is None and body.sla_pause is None:
        raise HTTPException(422, "nothing to change")
    notes = []
    with STATE.lock:
        if body.tehsildar_issued_permanent is not None:
            old = STATE.policy.get("tehsildar_issued_permanent")
            STATE.policy["tehsildar_issued_permanent"] = body.tehsildar_issued_permanent
            notes.append(f"Policy 'Tehsildar-issued earlier permanent certificates' changed from {old} to {body.tehsildar_issued_permanent}")
        if body.sla_pause is not None:
            old = STATE.policy.get("sla_pause")
            STATE.policy["sla_pause"] = body.sla_pause
            notes.append(f"PROPOSED policy 'pause the SLA clock during hearing / Patwari referral' (needs a Revenue order; display only) "
                         f"changed from {old} to {body.sla_pause}")
        rules.POLICY.clear()
        rules.POLICY.update(STATE.policy)
        STATE._cache.clear()
    for n in notes:
        STATE.add_audit("collector", "policy_changed", None, [], note=n, actor=body.actor)
    return get_policy()


# ------------------------------------------------------------------ Round 4: wrong-authority routing
class ForwardBody(BaseModel):
    officer_name: Optional[str] = None


@app.post("/api/applications/{app_id:path}/forward")
def forward(app_id: str, body: ForwardBody):
    e = STATE.entry(app_id)
    a = e["application"]
    an = STATE.analysis(app_id)
    if an["competence"]["ok"]:
        raise HTTPException(409, "this application is within your competence; nothing to forward")
    if a["status"] != "pending":
        raise HTTPException(409, f"application {app_id} is not pending")
    frm = engine.office_info(a)["office"]
    with STATE.lock:
        a["routed_to"] = an["competence"]["forward_to"]
        STATE.forwarded[app_id] = {"from": frm, "to": a["routed_to"], "ts": datetime.now(IST).isoformat(timespec="seconds")}
        STATE.invalidate(app_id)
    an2 = STATE.analysis(app_id)
    STATE.add_audit("tehsildar", "forwarded_wrong_authority", app_id, [],
                    note=f"Forwarded from {frm['en']} to {an2['office']['en']}: not the competent authority for a permanent caste certificate "
                         f"(अक्षम प्राधिकारी से अग्रेषित)", actor=body.officer_name)
    return {"application": a, "analysis": an2}


class RouteDeskBody(BaseModel):
    desk: str                       # the desk the file was opened on (e.g. Kondagaon)
    officer_name: Optional[str] = None


@app.post("/api/applications/{app_id:path}/route-desk")
def route_desk(app_id: str, body: RouteDeskBody):
    """Round 6 (P2): a file of another sub-division opened on this SDO desk is forwarded to its own desk (logged)."""
    e = STATE.entry(app_id)
    a = e["application"]
    sd = wrong_desk(a, sdo_desk(body.desk))
    if not sd:
        raise HTTPException(409, f"{app_id} belongs to this desk; nothing to forward")
    with STATE.lock:
        STATE.tray = [t for t in STATE.tray if t["app_id"] != app_id]
    STATE.add_audit("sdo", "forwarded_other_subdivision", app_id, [],
                    note=f"Opened on the SDO {body.desk} desk; belongs to {sd['office']['en']} (tehsil {a['tehsil']['en']}) — "
                         f"forwarded to that desk, no decision taken here", actor=body.officer_name)
    return {"application": a, "analysis": STATE.analysis(app_id)}


# ------------------------------------------------------------------ Round 4: sign tray (≤ 5 files, one DSC token passcode)
TRAY_MAX = 5


class TrayAddBody(BaseModel):
    app_id: str
    decision: DecisionBody
    desk: Optional[str] = None  # Round 6: the tray belongs to one SDO desk (default: SDO Kondagaon)


def _tray_view() -> dict:
    return {"max": TRAY_MAX, "items": [{k: v for k, v in t.items() if k != "decision"} for t in STATE.tray]}


@app.get("/api/tray")
def tray():
    return _tray_view()


@app.post("/api/tray/add")
def tray_add(body: TrayAddBody):
    app_id = body.app_id
    e = STATE.entry(app_id)
    a = e["application"]
    an = STATE.analysis(app_id)
    d = body.decision
    if a["status"] != "pending":
        raise HTTPException(409, f"application {app_id} is not pending")
    if any(t["app_id"] == app_id for t in STATE.tray):
        raise HTTPException(409, "already in the sign tray")
    if len(STATE.tray) >= TRAY_MAX:
        raise HTTPException(409, f"the sign tray holds at most {TRAY_MAX} files — sign them first")
    if not an["competence"]["ok"]:
        raise HTTPException(409, "not your competence — forward it instead")
    # Round 6 (P2): the tray belongs to one SDO desk; a file of another sub-division is refused
    desk = sdo_desk(body.desk or d.desk) if a["routed_to"] == "sdo" else None
    _wrong_desk_409(a, desk, "the sign tray refuses it")
    if d.action != "approve" or not an["ready_to_sign"] or any(f["severity"] == "attention" for f in an["flags"]) \
            or an["disposition_required"] or an["deficiencies"] or an["finding_required"].get("approve"):
        raise HTTPException(422, "only records-complete approvals with no open point can go into the sign tray")
    if STATE.tray and STATE.entries[STATE.tray[0]["app_id"]]["application"]["routed_to"] != a["routed_to"]:
        raise HTTPException(409, "the sign tray belongs to one desk; sign the other desk's files first")
    if STATE.tray and STATE.tray[0]["office"]["en"] != an["office"]["en"]:
        raise HTTPException(409, f"the sign tray holds {STATE.tray[0]['office']['en']} files; {app_id} belongs to {an['office']['en']}")
    check_creamy(an, d)
    if not d.read_confirmed:
        raise HTTPException(422, "open the order and tick 'I have read the order' before adding it to the tray")
    if not any(x["action"] == "case_opened" and x.get("app_id") == app_id for x in STATE.audit):
        raise HTTPException(422, "a file that was never opened cannot enter the sign tray")
    for lang in ("en", "hi"):
        if PLACEHOLDER_RE.search(getattr(d.order_text, lang) or ""):
            raise HTTPException(422, f"the order text ({lang}) still contains an unfilled placeholder")
    with STATE.lock:
        STATE.tray.append({"app_id": app_id, "name": a["applicant_name"], "service": a["service_label"],
                           "office": an["office"], "added_ts": datetime.now(IST).isoformat(timespec="seconds"),
                           "decision": {**d.model_dump(), "desk": d.desk or desk}})
    STATE.add_audit(a["routed_to"], "tray_added", app_id, records_of(an),
                    note=f"Order read and added to the sign tray ({len(STATE.tray)}/{TRAY_MAX}); not yet signed", actor=d.officer_name)
    return _tray_view()


class TrayRemoveBody(BaseModel):
    app_id: str


@app.post("/api/tray/remove")
def tray_remove(body: TrayRemoveBody):
    with STATE.lock:
        STATE.tray = [t for t in STATE.tray if t["app_id"] != body.app_id]
        STATE.save()
    return _tray_view()


class TraySignBody(BaseModel):
    otp: str
    officer_name: Optional[str] = None


@app.post("/api/tray/sign")
def tray_sign(body: TraySignBody):
    """One (mock) DSC-token passcode for the whole tray; each order is still generated, numbered and snapshotted on its own."""
    if not re.fullmatch(r"\d{6}", body.otp or ""):
        raise HTTPException(422, "enter the 6-digit DSC token passcode")
    if not STATE.tray:
        raise HTTPException(409, "the sign tray is empty")
    txn = "DSC-" + datetime.now(IST).strftime("%Y%m%d%H%M%S")
    results, errors = [], []
    items = list(STATE.tray)
    for t in items:
        try:
            r = _decide(t["app_id"], DecisionBody(**t["decision"]), esign_txn=txn)
            results.append({"app_id": t["app_id"], "document_no": r["document_no"], "status": r["application"]["status"],
                            "citizen_message": r["citizen_message"], "name": t["name"]})
        except HTTPException as ex:
            errors.append({"app_id": t["app_id"], "detail": str(ex.detail)})
    with STATE.lock:
        STATE.tray = []
        STATE.save()
    STATE.add_audit(STATE.entries[items[0]["app_id"]]["application"]["routed_to"], "tray_signed", None, [r["app_id"] for r in results],
                    note=f"Sign tray: {len(results)} orders signed with one DSC token passcode (transaction {txn}): "
                         + ", ".join(r["document_no"] for r in results), actor=body.officer_name, extra={"esign_txn": txn})
    return {"esign_txn": txn, "signed": results, "errors": errors}


# ------------------------------------------------------------------ Round 4: shadow mode — tool feedback (never an officer metric)
class FeedbackBody(BaseModel):
    useful: Literal["yes", "no", "wrong_family"]
    note: Optional[str] = None


@app.post("/api/applications/{app_id:path}/tool-feedback")
def tool_feedback(app_id: str, body: FeedbackBody):
    STATE.entry(app_id)
    d = STATE.decisions.get(app_id)
    if not d:
        raise HTTPException(409, "feedback is recorded after the decision")
    with STATE.lock:
        d["tool_feedback"] = {"useful": body.useful, "note": (body.note or "").strip() or None,
                              "ts": datetime.now(IST).isoformat(timespec="seconds")}
        d["snapshot"]["tool_feedback"] = d["tool_feedback"]
    STATE.add_audit(STATE.entries[app_id]["application"]["routed_to"], "tool_feedback", app_id, [],
                    note=f"Tool feedback (for improving the tool, not an officer metric): {body.useful}"
                         + (f" — {body.note.strip()}" if (body.note or "").strip() else ""))
    return {"ok": True, "tool_feedback": d["tool_feedback"]}


@app.get("/api/eval")
def eval_():
    p = HERE / "model" / "eval.json"
    if not p.exists():
        raise HTTPException(503, "model/eval.json missing — run evaluate.py")
    return json.loads(p.read_text(encoding="utf-8"))


@app.get("/api/audit")
def audit(q: str = ""):
    """Round 4: `q` answers "who accessed this certificate / application?" (DPDP s.11) — every entry whose
    records, application number or document number contains it."""
    rows = list(reversed(STATE.audit))
    ql = q.strip().lower()
    if not ql:
        return rows
    def hit(e: dict) -> bool:
        hay = [e.get("app_id") or "", e.get("document_no") or ""] + list(e.get("records_accessed") or [])
        return any(ql in h.lower() for h in hay)
    return [e for e in rows if hit(e)]


# ------------------------------------------------------------------ Round 8b: income-certificate renewal (SYNTHETIC)
@app.get("/api/renewals")
def renewals(district_lgd: int = 643, window: int = Query(60, ge=1, le=90)):
    """Income certificates expiring in the next `window` days (30/60), with evidence strength. Nothing is issued here."""
    if district_lgd not in geo.districts():
        raise HTTPException(422, f"unknown district_lgd {district_lgd}")
    return renewal.listing(district_lgd, window)


@app.post("/api/renewals/{cert_no:path}/prefill")
def renewal_prefill(cert_no: str):
    """Creates (idempotently) a PRE-FILLED renewal application from last year's record + evidence. The citizen must
    still confirm "income unchanged" at the Kendra and the Tehsildar still decides; never auto-issued."""
    try:
        rec, created = renewal.prefill(cert_no)
    except KeyError:
        raise HTTPException(404, f"income certificate {cert_no} not found")
    if created:
        STATE.add_audit("kendra_operator", "renewal_prefilled", records=renewal.records_accessed(rec),
                        note=f"{rec['renewal_id']}: income-certificate renewal pre-filled from last year's record "
                             f"(citizen confirmation and officer decision pending; nudge preview only)")
    return rec


@app.post("/api/reset")
def reset():
    STATE.reset(persist=True)
    renewal.reset()
    insights_api.learning.reset()  # Round 8a: officer-answered learning labels + proposed calibration
    return {"ok": True}


import reader_api; app.include_router(reader_api.router)  # noqa: E402,E702 — Round 8c: Praman Reader archive lookup
import insights_api; app.include_router(insights_api.router)  # noqa: E402,E702 — Round 8a: family graph + learning
