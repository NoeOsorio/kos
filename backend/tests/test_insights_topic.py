from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_save_topic_returns_201():
    response = client.post("/api/insights/topic", json={
        "title": "Stoicism",
        "description": "Philosophy of virtue and control"
    })
    assert response.status_code == 201


def test_save_topic_returns_saved_data():
    response = client.post("/api/insights/topic", json={
        "title": "Stoicism",
        "description": "Philosophy of virtue and control"
    })
    data = response.json()
    assert data["title"] == "Stoicism"
    assert data["description"] == "Philosophy of virtue and control"
    assert "id" in data


def test_save_topic_requires_title():
    response = client.post("/api/insights/topic", json={
        "description": "Missing title"
    })
    assert response.status_code == 422


def test_save_topic_requires_description():
    response = client.post("/api/insights/topic", json={
        "title": "Missing description"
    })
    assert response.status_code == 422
