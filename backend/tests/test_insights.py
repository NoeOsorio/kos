from unittest.mock import MagicMock, patch


def test_create_insight_saves_to_db(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "ins-456",
        "log_id": "log-123",
        "content": "Systems thinking reveals hidden feedback loops",
        "area": None,
        "created_at": "2026-03-30T00:00:00+00:00",
    }]

    with patch("app.api.routes.insights.get_supabase", return_value=mock_sb), \
         patch("app.api.routes.insights.embed", return_value=[0.1] * 1536), \
         patch("app.api.routes.insights.find_and_save_connections"):
        resp = client.post("/api/insights", json={
            "log_id": "log-123",
            "content": "Systems thinking reveals hidden feedback loops",
        })

    assert resp.status_code == 200
    assert resp.json()["id"] == "ins-456"


def test_save_topic_insight_creates_log_and_insight(client):
    mock_sb = MagicMock()
    # First call: logs insert
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "log-topic-1", "type": "idea", "title": "Systems Thinking",
         "created_at": "2026-03-30T00:00:00+00:00"}
    ]

    with patch("app.api.routes.insights.get_supabase", return_value=mock_sb), \
         patch("app.api.routes.insights.embed", return_value=[0.1] * 1536), \
         patch("app.api.routes.insights.find_and_save_connections"):
        resp = client.post("/api/insights/topic", json={
            "title": "Systems Thinking",
            "description": "Reveals hidden feedback loops in complex systems",
        })

    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["title"] == "Systems Thinking"
