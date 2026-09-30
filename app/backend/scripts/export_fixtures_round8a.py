"""Round 8a: offline fixtures for the family graph + learning endpoints (frontend runs without the backend).

Writes to app/frontend/src/mock/fixtures/:
  graph_family.json        {app_id: GET /api/graph/family/{app_id}} for the demo files (+ the hero after confirming)
  graph_integrity.json     GET /api/graph/integrity
  learning_status.json     GET /api/learning/status (fresh: simulated labels only)
  learning_recalibrated.json  POST /api/learning/recalibrate on the same labels
Run:  uv run python scripts/export_fixtures_round8a.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from urllib.parse import quote

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
os.environ["PRAMAN_STATE_DIR"] = tempfile.mkdtemp(prefix="praman-export8a-")

from fastapi.testclient import TestClient  # noqa: E402

from api import app  # noqa: E402

OUT = HERE.parent / "frontend" / "src" / "mock" / "fixtures"
APPS = [f"SS/2026/KDG/{n}" for n in ("08812", "08841", "08856", "08863", "08790", "08925", "08835", "08870", "08902")]


def dump(name: str, obj) -> None:
    p = OUT / f"{name}.json"
    p.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    print(f"  {p.name:28} {p.stat().st_size / 1024:8.1f} KB")


def main():
    c = TestClient(app)
    assert c.post("/api/reset").json()["ok"]
    fam = {a: c.get(f"/api/graph/family/{quote(a, safe='')}").json() for a in APPS}
    c.post(f"/api/applications/{quote(APPS[0], safe='')}/confirm-relationship", json={"cert_no": "CG/KDG/SDO/2019/004512"})
    fam[APPS[0] + "#confirmed"] = c.get(f"/api/graph/family/{quote(APPS[0], safe='')}").json()
    assert c.post("/api/reset").json()["ok"]
    dump("graph_family", fam)
    dump("graph_integrity", c.get("/api/graph/integrity").json())
    dump("learning_status", c.get("/api/learning/status").json())
    dump("learning_recalibrated", c.post("/api/learning/recalibrate", json={}).json())
    assert c.post("/api/reset").json()["ok"]


if __name__ == "__main__":
    main()
