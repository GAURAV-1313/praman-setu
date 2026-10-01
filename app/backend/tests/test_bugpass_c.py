"""Round 9 QA (insights / offline bug pass): regressions for fixes in insights_api.py."""
from urllib.parse import quote

import pytest
from fastapi.testclient import TestClient

from api import app

client = TestClient(app)
HERO = "SS/2026/KDG/08812"


@pytest.fixture(autouse=True)
def fresh():
    assert client.post("/api/reset").json() == {"ok": True}
    yield


def _views(app_id):
    return [a for a in client.get("/api/audit").json() if a["action"] == "family_graph_viewed" and a.get("app_id") == app_id]


def test_family_graph_double_fetch_logs_one_view():
    # React StrictMode (and a quick reload) fetches the graph twice: one view must be one audit entry
    for _ in range(3):
        assert client.get(f"/api/graph/family/{quote(HERO, safe='')}").status_code == 200
    assert len(_views(HERO)) == 1


def test_family_graph_views_of_different_files_or_roles_are_each_logged():
    other = "SS/2026/KDG/08841"
    client.get(f"/api/graph/family/{quote(HERO, safe='')}")
    client.get(f"/api/graph/family/{quote(other, safe='')}")
    client.get(f"/api/graph/family/{quote(HERO, safe='')}?role=collector")
    assert len(_views(other)) == 1
    assert {a["actor_role"] for a in _views(HERO)} == {"sdo", "collector"}


def test_family_graph_unknown_application_is_404_and_not_logged():
    r = client.get("/api/graph/family/NOPE")
    assert r.status_code == 404
    assert _views("NOPE") == []
