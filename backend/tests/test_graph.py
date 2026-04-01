from unittest.mock import MagicMock, patch


def test_graph_returns_nodes_from_db(client):
    mock_sb = MagicMock()

    # insights query result
    insights_data = [{
        "id": "ins-1",
        "content": "Deep work produces rare and valuable output",
        "area": "productivity",
        "created_at": "2026-03-01T00:00:00+00:00",
        "logs": {"title": "Deep Work"},
    }]
    # connections query result
    connections_data = []

    # Two sequential table() calls — first for insights, second for connections
    mock_sb.table.return_value.select.return_value.execute.side_effect = [
        MagicMock(data=insights_data),
        MagicMock(data=connections_data),
    ]

    with patch("app.api.routes.graph.get_supabase", return_value=mock_sb):
        resp = client.get("/api/graph")

    assert resp.status_code == 200
    body = resp.json()
    assert "nodes" in body and "edges" in body
    assert len(body["nodes"]) == 1
    assert body["nodes"][0]["label"] == "Deep Work"
    assert body["nodes"][0]["area"] == "productivity"


def test_graph_falls_back_to_mock_when_empty(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.execute.return_value.data = []

    with patch("app.api.routes.graph.get_supabase", return_value=mock_sb):
        resp = client.get("/api/graph")

    assert resp.status_code == 200
    body = resp.json()
    assert len(body["nodes"]) > 0  # mock fallback kicks in
