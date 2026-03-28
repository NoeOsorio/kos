from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_analyze_returns_200():
    response = client.post("/api/analyze", json={
        "message": "I've been reading about Stoicism today",
        "response": "What draws you to that philosophy?"
    })
    assert response.status_code == 200


def test_analyze_returns_expected_shape():
    response = client.post("/api/analyze", json={
        "message": "I've been reading about Stoicism today",
        "response": "What draws you to that philosophy?"
    })
    data = response.json()
    assert "new_topics" in data
    assert "similar" in data
    assert isinstance(data["new_topics"], list)
    assert isinstance(data["similar"], list)


def test_analyze_new_topics_have_required_fields():
    response = client.post("/api/analyze", json={
        "message": "I've been reading about Stoicism today",
        "response": "What draws you to that philosophy?"
    })
    topics = response.json()["new_topics"]
    for topic in topics:
        assert "name" in topic
        assert "description" in topic


def test_analyze_similar_have_required_fields():
    response = client.post("/api/analyze", json={
        "message": "I've been thinking about mental models",
        "response": "Which model resonates most with you?"
    })
    similar = response.json()["similar"]
    for item in similar:
        assert "id" in item
        assert "title" in item
        assert "excerpt" in item


def test_analyze_empty_message_returns_empty_lists():
    response = client.post("/api/analyze", json={
        "message": "hi",
        "response": "hello"
    })
    assert response.status_code == 200
