from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


def test_create_log_returns_saved_entry(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "abc-123",
        "type": "book",
        "title": "Thinking Fast and Slow",
        "author": "Kahneman",
        "chapter": "3",
        "area": "psychology",
        "created_at": "2026-03-30T00:00:00+00:00",
    }]

    with patch("app.api.routes.logs.get_supabase", return_value=mock_sb):
        resp = client.post("/api/logs", json={
            "type": "book",
            "title": "Thinking Fast and Slow",
            "author": "Kahneman",
            "chapter": "3",
            "area": "psychology",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "abc-123"
    assert data["title"] == "Thinking Fast and Slow"


def test_list_logs_returns_array(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.order.return_value.execute.return_value.data = []

    with patch("app.api.routes.logs.get_supabase", return_value=mock_sb):
        resp = client.get("/api/logs")

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
