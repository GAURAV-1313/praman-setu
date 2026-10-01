"""Round 8a endpoints: family knowledge graph + integrity analytics, and human-in-the-loop learning. SYNTHETIC data.

  GET  /api/graph/family/{app_id}      3-generation family subgraph around an application + which record was used
  GET  /api/graph/integrity            statewide / district counts of the four integrity signals (+ example families)
  GET  /api/learning/status            labels (real vs simulated), current calibration, 5 most uncertain pairs
  POST /api/learning/recalibrate       refit the calibration on all labels; before/after precision & recall (held out)
  POST /api/learning/label             {pair_id, decision: same|not} — the officer answers an "ask the officer" pair

Mounted by api.py (`app.include_router(insights_api.router)`); api.STATE is imported lazily to avoid a cycle.
"""
from __future__ import annotations

import threading
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import graph
import learning

router = APIRouter()


def _warm():
    try:
        learning.universe()
        graph.overlay()
    except Exception:  # warm-up only; the endpoints compute on demand
        pass


threading.Thread(target=_warm, daemon=True).start()  # ~3 s of scoring off the request path


IST = timezone(timedelta(hours=5, minutes=30))


def _state():
    import api  # noqa: WPS433 — lazy: api imports this module at its end
    return api.STATE


def _case_labels() -> list[dict]:
    S = _state()
    with S.lock:
        disp = {k: dict(v) for k, v in S.dispositions.items() if v}
    return learning.disposition_labels(disp, {a: S.analysis(a) for a in disp if a in S.entries})


@router.get("/api/graph/family/{app_id:path}")
def graph_family(app_id: str, role: Optional[str] = None):
    S = _state()
    e = S.entry(app_id)
    an = S.analysis(app_id)
    out = graph.family(e, an)
    recs = sorted({n["cert_no"] for n in out["nodes"] if n["kind"] == "cert"})
    who = role if role in ("sdo", "tehsildar", "collector", "kendra_operator") else e["application"]["routed_to"]
    with S.lock:  # one view = one entry: React StrictMode / quick reloads fetch twice (same rule as case_opened)
        last = S.audit[-1] if S.audit else None
        duplicate = (last is not None and last["action"] == "family_graph_viewed" and last.get("app_id") == app_id
                     and last["actor_role"] == who
                     and (datetime.now(IST) - datetime.fromisoformat(last["ts"])).total_seconds() < 3)
        if not duplicate:
            S.add_audit(who, "family_graph_viewed", app_id, recs,
                        note=f"Family network opened for {app_id} ({out['family_id']}): {len(recs)} certificate(s) in the 3-generation tree.")
    return out


@router.get("/api/graph/integrity")
def graph_integrity():
    return graph.integrity(_state().entries)


@router.get("/api/learning/status")
def learning_status():
    return learning.status(_case_labels())


class RecalibrateBody(BaseModel):
    actor: Optional[str] = None


@router.post("/api/learning/recalibrate")
def learning_recalibrate(body: Optional[RecalibrateBody] = None):
    case = _case_labels()
    r = learning.recalibrate(case)
    cal = r["models"]["calibration"]
    _state().add_audit("collector", "model_recalibrated", None, [],
                       note=f"Matcher calibration refitted on {r['n_labels']} labels ({r['n_real']} real, {r['n_simulated']} simulated). "
                            f"Held-out precision {r['before']['precision']} → {cal['after']['precision']}, recall {r['before']['recall']} → "
                            f"{cal['after']['recall']}. PROPOSAL only — not applied to live matching.",
                       actor=(body.actor if body else None) or "Model owner (demo)")
    return learning.status(case)


class LabelBody(BaseModel):
    pair_id: str
    decision: Literal["same", "not"]
    officer_name: Optional[str] = None


@router.post("/api/learning/label")
def learning_label(body: LabelBody):
    try:
        lb = learning.add_label(body.pair_id, body.decision, body.officer_name)
    except KeyError:
        raise HTTPException(404, f"unknown pair {body.pair_id}")
    _state().add_audit("sdo", "learning_label", None, [],
                       note=f"Officer answered an 'ask the officer' pair ({body.pair_id}): "
                            f"{'same family' if body.decision == 'same' else 'not this family'}. Used only as a model label.",
                       actor=body.officer_name)
    return {"ok": True, "label": {k: lb[k] for k in ("pair_id", "y", "source", "ts")}, "status": learning.status(_case_labels())}
