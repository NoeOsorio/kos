from unittest.mock import MagicMock, patch


def test_save_topic_returns_201(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "ins-topic-1", "type": "idea", "title": "Stoicism",
         "created_at": "2026-03-30T00:00:00+00:00"}
    ]

    with patch("app.api.routes.insights.get_supabase", return_value=mock_sb), \
         patch("app.api.routes.insights.embed", return_value=[0.1] * 1536), \
         patch("app.api.routes.insights.find_and_save_connections"):
        response = client.post("/api/insights/topic", json={
            "title": "Stoicism",
            "description": "Philosophy of virtue and control"
        })

    assert response.status_code == 201


def test_save_topic_returns_saved_data(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "ins-topic-2", "type": "idea", "title": "Stoicism",
         "created_at": "2026-03-30T00:00:00+00:00"}
    ]

    with patch("app.api.routes.insights.get_supabase", return_value=mock_sb), \
         patch("app.api.routes.insights.embed", return_value=[0.1] * 1536), \
         patch("app.api.routes.insights.find_and_save_connections"):
        response = client.post("/api/insights/topic", json={
            "title": "Stoicism",
            "description": "Philosophy of virtue and control"
        })

    data = response.json()
    assert data["title"] == "Stoicism"
    assert data["description"] == "Philosophy of virtue and control"
    assert "id" in data


def test_save_topic_requires_title(client):
    response = client.post("/api/insights/topic", json={
        "description": "Missing title"
    })
    assert response.status_code == 422


def test_save_topic_requires_description(client):
    response = client.post("/api/insights/topic", json={
        "title": "Missing description"
    })
    assert response.status_code == 422
