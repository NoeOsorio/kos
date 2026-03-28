from fastapi.testclient import TestClient
from app.main import app
from app.api.routes.analyze import _find_similar

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


def test_find_similar_returns_matching_items():
    results = _find_similar(["stoicism", "virtue"])
    assert len(results) > 0
    for item in results:
        assert "id" in item.model_dump()
        assert "title" in item.model_dump()
        assert "excerpt" in item.model_dump()


def test_find_similar_returns_at_most_3():
    results = _find_similar(["work", "brain", "model", "flow", "note"])
    assert len(results) <= 3


def test_find_similar_empty_keywords_returns_empty():
    assert _find_similar([]) == []


def test_analyze_new_topics_shape_when_api_unavailable():
    # When API key is missing, endpoint returns empty lists — verify shape is valid
    response = client.post("/api/analyze", json={
        "message": "I've been reading about Stoicism today",
        "response": "What draws you to that philosophy?"
    })
    data = response.json()
    # Shape must be valid regardless of content
    assert isinstance(data["new_topics"], list)
    assert isinstance(data["similar"], list)


def test_analyze_empty_message_returns_empty_lists():
    response = client.post("/api/analyze", json={
        "message": "hi",
        "response": "hello"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["new_topics"] == []
    assert data["similar"] == []
