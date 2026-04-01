from fastapi import APIRouter
from pydantic import BaseModel

from app.core.supabase import get_supabase

router = APIRouter()

_AREA_CLUSTER_MAP: dict[str, int] = {}
_CLUSTER_COUNT = 0


def _cluster_for_area(area: str | None) -> int:
    global _CLUSTER_COUNT
    key = (area or "general").lower()
    if key not in _AREA_CLUSTER_MAP:
        _AREA_CLUSTER_MAP[key] = _CLUSTER_COUNT % 5
        _CLUSTER_COUNT += 1
    return _AREA_CLUSTER_MAP[key]


class GraphNode(BaseModel):
    id: str
    label: str
    cluster: int
    area: str | None
    connections: list[str]
    insight: str
    date: str


class GraphEdge(BaseModel):
    source: str
    target: str
    weight: float


class GraphResponse(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]


@router.get("", response_model=GraphResponse)
async def get_graph() -> GraphResponse:
    sb = get_supabase()

    ins_result = sb.table("insights").select(
        "id, content, area, created_at, logs(title)"
    ).execute()
    insights = ins_result.data or []

    conn_result = sb.table("connections").select(
        "source_id, target_id, strength"
    ).execute()
    connections = conn_result.data or []

    # Build adjacency so each node knows its connected ids
    adjacency: dict[str, list[str]] = {}
    for c in connections:
        adjacency.setdefault(c["source_id"], []).append(c["target_id"])
        adjacency.setdefault(c["target_id"], []).append(c["source_id"])

    nodes: list[GraphNode] = []
    for ins in insights:
        log_data = ins.get("logs") or {}
        area = ins.get("area")
        label = log_data.get("title") or ins["content"][:35]
        date = ins["created_at"][:10] if ins.get("created_at") else ""
        nodes.append(GraphNode(
            id=ins["id"],
            label=label,
            cluster=_cluster_for_area(area),
            area=area,
            connections=adjacency.get(ins["id"], []),
            insight=ins["content"],
            date=date,
        ))

    edges: list[GraphEdge] = [
        GraphEdge(source=c["source_id"], target=c["target_id"], weight=c.get("strength", 0.5))
        for c in connections
    ]

    # Dev convenience: return mock data when DB is empty
    if not nodes:
        nodes, edges = _mock_data()

    return GraphResponse(nodes=nodes, edges=edges)


def _mock_data() -> tuple[list[GraphNode], list[GraphEdge]]:
    mock_nodes = [
        GraphNode(id="node-dw", label="Deep Work",    cluster=0, area="productivity",
                  connections=["node-fs", "node-sb"],
                  insight="Concentrated work produces rare and valuable output.", date="2024-01-15"),
        GraphNode(id="node-fs", label="Flow State",   cluster=0, area="productivity",
                  connections=["node-dw"],
                  insight="Peak performance when challenge meets skill.", date="2024-02-03"),
        GraphNode(id="node-sb", label="Second Brain", cluster=1, area="systems",
                  connections=["node-dw", "node-zk"],
                  insight="Externalizing ideas frees mental RAM.", date="2024-04-05"),
        GraphNode(id="node-zk", label="Zettelkasten", cluster=1, area="systems",
                  connections=["node-sb"],
                  insight="Notes by idea relationships form an emergent knowledge graph.", date="2024-04-22"),
    ]
    mock_edges = [
        GraphEdge(source="node-dw", target="node-fs", weight=1.0),
        GraphEdge(source="node-dw", target="node-sb", weight=0.8),
        GraphEdge(source="node-sb", target="node-zk", weight=1.0),
    ]
    return mock_nodes, mock_edges
