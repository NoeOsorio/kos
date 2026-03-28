from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_graph_returns_200():
    response = client.get("/api/graph")
    assert response.status_code == 200


def test_get_graph_has_nodes_and_edges():
    data = client.get("/api/graph").json()
    assert "nodes" in data
    assert "edges" in data


def test_graph_has_at_least_one_node():
    data = client.get("/api/graph").json()
    assert len(data["nodes"]) >= 1


def test_graph_node_has_required_fields():
    node = client.get("/api/graph").json()["nodes"][0]
    for field in ("id", "label", "cluster", "connections", "insight", "date"):
        assert field in node, f"Missing field: {field}"


def test_graph_node_connections_is_list():
    node = client.get("/api/graph").json()["nodes"][0]
    assert isinstance(node["connections"], list)


def test_graph_edge_has_required_fields():
    edges = client.get("/api/graph").json()["edges"]
    if edges:
        for field in ("source", "target", "weight"):
            assert field in edges[0], f"Missing field: {field}"


def test_edge_endpoints_reference_existing_nodes():
    data = client.get("/api/graph").json()
    node_ids = {n["id"] for n in data["nodes"]}
    for edge in data["edges"]:
        assert edge["source"] in node_ids, f"Unknown source: {edge['source']}"
        assert edge["target"] in node_ids, f"Unknown target: {edge['target']}"
