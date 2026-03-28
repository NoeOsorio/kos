from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class GraphNode(BaseModel):
    id: str
    label: str
    cluster: int
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


_NODES: list[GraphNode] = [
    GraphNode(
        id="node-dw", label="Deep Work", cluster=0,
        connections=["node-fs", "node-sb", "node-fp"],
        insight="Concentrated, distraction-free work produces rare and valuable output that cannot be replicated by shallow alternatives.",
        date="2024-01-15",
    ),
    GraphNode(
        id="node-fs", label="Flow State", cluster=0,
        connections=["node-dw", "node-tb"],
        insight="Peak performance emerges when challenge and skill are perfectly balanced, making time disappear.",
        date="2024-02-03",
    ),
    GraphNode(
        id="node-tb", label="Time Blocking", cluster=0,
        connections=["node-fs", "node-sb"],
        insight="Scheduling dedicated time blocks for focused work turns vague intention into reliable output.",
        date="2024-02-20",
    ),
    GraphNode(
        id="node-st", label="Stoicism", cluster=1,
        connections=["node-mm"],
        insight="Focus only on what is within your control; accept everything else with equanimity.",
        date="2024-03-01",
    ),
    GraphNode(
        id="node-fp", label="First Principles", cluster=1,
        connections=["node-mm", "node-dw"],
        insight="Break problems down to their fundamental truths and reason up from there rather than by analogy.",
        date="2024-03-10",
    ),
    GraphNode(
        id="node-mm", label="Mental Models", cluster=1,
        connections=["node-st", "node-fp", "node-zk"],
        insight="A diverse toolkit of mental models allows you to see recurring patterns across disciplines.",
        date="2024-03-18",
    ),
    GraphNode(
        id="node-sb", label="Second Brain", cluster=2,
        connections=["node-dw", "node-zk", "node-tb"],
        insight="Externalizing ideas into a trusted system frees mental RAM for higher-order thinking.",
        date="2024-04-05",
    ),
    GraphNode(
        id="node-zk", label="Zettelkasten", cluster=2,
        connections=["node-sb", "node-mm"],
        insight="Notes connected by idea relationships rather than folders form an emergent knowledge graph.",
        date="2024-04-22",
    ),
]

_EDGES: list[GraphEdge] = [
    GraphEdge(source="node-dw", target="node-fs", weight=1.0),
    GraphEdge(source="node-dw", target="node-sb", weight=0.8),
    GraphEdge(source="node-dw", target="node-fp", weight=0.7),
    GraphEdge(source="node-fs", target="node-tb", weight=0.9),
    GraphEdge(source="node-st", target="node-mm", weight=0.8),
    GraphEdge(source="node-fp", target="node-mm", weight=0.9),
    GraphEdge(source="node-sb", target="node-zk", weight=1.0),
    GraphEdge(source="node-zk", target="node-mm", weight=0.7),
    GraphEdge(source="node-tb", target="node-sb", weight=0.6),
]


@router.get("", response_model=GraphResponse)
async def get_graph() -> GraphResponse:
    return GraphResponse(nodes=_NODES, edges=_EDGES)
