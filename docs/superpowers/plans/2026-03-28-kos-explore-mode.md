# Explore Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Explore tab as a full-screen knowledge graph canvas with pan/zoom, node selection, and a detail panel that bridges to Talk mode.

**Architecture:** An HTML Canvas draws nodes (insights) and edges (connections) in a logical 1400×900 coordinate space mapped to screen space via a pan/zoom transform stored in refs. Nodes are positioned deterministically by cluster using a hash of their ID. A React Query hook fetches graph data from `/api/graph`. Clicking a node opens a `NodeDetailPanel`; from there the user can jump to Talk mode with the node pre-loaded as context.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion (none needed here), `@tanstack/react-query` v5, Lucide React, FastAPI, Pydantic v2, `pytest`, `fastapi.testclient`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `backend/app/api/routes/graph.py` | Pydantic models + seed data (8 nodes, 3 clusters, 9 edges) |
| Create | `backend/tests/__init__.py` | Makes tests a package |
| Create | `backend/tests/test_graph.py` | pytest tests for `/api/graph` |
| Modify | `frontend/src/types/kos.ts` | Add `GraphEdge` and `RawNode` types |
| Create | `frontend/src/utils/graph-layout.ts` | Deterministic layout: assigns x, y, r, floatPhase |
| Create | `frontend/src/__tests__/graph-layout.test.ts` | Unit tests for layout utility |
| Create | `frontend/src/hooks/useGraph.ts` | React Query hook: fetch + layout |
| Create | `frontend/src/__tests__/useGraph.test.tsx` | Tests for useGraph hook |
| Create | `frontend/src/components/explore/GraphCanvas.tsx` | Canvas: RAF loop, pan/zoom, hit-test, draw |
| Create | `frontend/src/__tests__/GraphCanvas.test.tsx` | Canvas render + interaction tests |
| Create | `frontend/src/components/explore/NodeDetailPanel.tsx` | Side panel: label, insight, connections, Talk CTA |
| Create | `frontend/src/__tests__/NodeDetailPanel.test.tsx` | Panel render + button tests |
| Modify | `frontend/src/pages/ExplorePage.tsx` | Wire everything: graph + panel + KOSContext |
| Create | `frontend/src/__tests__/ExplorePage.test.tsx` | Integration tests for full page |

---

### Task 1: Backend — `/api/graph` with seed data

**Files:**
- Modify: `backend/app/api/routes/graph.py`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_graph.py`

- [ ] **Step 1: Write failing backend tests**

```python
# backend/tests/test_graph.py
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
```

Also create the empty init:
```python
# backend/tests/__init__.py
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && pip install pytest && pytest tests/test_graph.py -v
```

Expected: FAIL on `test_graph_has_at_least_one_node` (empty nodes list returned).

- [ ] **Step 3: Implement graph endpoint with seed data**

Replace `backend/app/api/routes/graph.py` entirely:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && pytest tests/test_graph.py -v
```

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
cd backend && git add app/api/routes/graph.py tests/__init__.py tests/test_graph.py
git commit -m "feat: wire /api/graph with seed data (8 nodes, 3 clusters, 9 edges)"
```

---

### Task 2: Types + graph-layout utility

**Files:**
- Modify: `frontend/src/types/kos.ts`
- Create: `frontend/src/utils/graph-layout.ts`
- Create: `frontend/src/__tests__/graph-layout.test.ts`

- [ ] **Step 1: Write failing layout tests**

```typescript
// frontend/src/__tests__/graph-layout.test.ts
import { layoutNodes, CLUSTERS, LOGICAL_W, LOGICAL_H } from '../utils/graph-layout'
import type { RawNode } from '../types/kos'

const raw = (overrides: Partial<RawNode> = {}): RawNode => ({
  id: 'n1', label: 'Test', cluster: 0,
  connections: [], insight: 'insight', date: '2024-01-01',
  ...overrides,
})

describe('layoutNodes', () => {
  it('returns one node per input', () => {
    expect(layoutNodes([raw(), raw({ id: 'n2' })])).toHaveLength(2)
  })

  it('places node within its cluster x-range', () => {
    const result = layoutNodes([raw({ id: 'abc', cluster: 0 })])
    const { cx, spread } = CLUSTERS[0]
    expect(result[0].x).toBeGreaterThanOrEqual(cx - spread)
    expect(result[0].x).toBeLessThanOrEqual(cx + spread)
  })

  it('places node within its cluster y-range', () => {
    const result = layoutNodes([raw({ id: 'abc', cluster: 1 })])
    const { cy, spread } = CLUSTERS[1]
    expect(result[0].y).toBeGreaterThanOrEqual(cy - spread)
    expect(result[0].y).toBeLessThanOrEqual(cy + spread)
  })

  it('radius grows with connection count', () => {
    const lone = layoutNodes([raw({ id: 'a', connections: [] })])[0]
    const conn = layoutNodes([raw({ id: 'b', connections: ['x', 'y', 'z'] })])[0]
    expect(conn.r).toBeGreaterThan(lone.r)
  })

  it('is deterministic — same id produces same position', () => {
    const a = layoutNodes([raw({ id: 'myid' })])[0]
    const b = layoutNodes([raw({ id: 'myid' })])[0]
    expect(a.x).toBe(b.x)
    expect(a.y).toBe(b.y)
    expect(a.floatPhase).toBe(b.floatPhase)
  })

  it('falls back to cluster 0 for unknown cluster index', () => {
    const result = layoutNodes([raw({ id: 'x', cluster: 99 })])
    const { cx, spread } = CLUSTERS[0]
    expect(result[0].x).toBeGreaterThanOrEqual(cx - spread)
    expect(result[0].x).toBeLessThanOrEqual(cx + spread)
  })

  it('exports LOGICAL_W and LOGICAL_H as positive numbers', () => {
    expect(LOGICAL_W).toBeGreaterThan(0)
    expect(LOGICAL_H).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/graph-layout.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Add RawNode and GraphEdge to kos.ts**

Append to `frontend/src/types/kos.ts` (after line 21, before `AppType`):

```typescript
export interface RawNode {
  id: string
  label: string
  cluster: number
  connections: string[]
  insight: string
  date: string
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}
```

- [ ] **Step 4: Create graph-layout.ts**

```typescript
// frontend/src/utils/graph-layout.ts
import type { KOSNode, KOSCluster, RawNode } from '../types/kos'

export const LOGICAL_W = 1400
export const LOGICAL_H = 900

export const CLUSTERS: KOSCluster[] = [
  { name: 'Productivity', color: [139, 92,  246], cx: 350,  cy: 350, spread: 220 },
  { name: 'Philosophy',   color: [96,  165, 250], cx: 1050, cy: 350, spread: 220 },
  { name: 'Systems',      color: [52,  211, 153], cx: 700,  cy: 680, spread: 220 },
]

/** Deterministic pseudo-random in [0, 1) based on a string seed. */
function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  }
  return (h >>> 0) / 0x100000000
}

export function layoutNodes(
  raw: RawNode[],
  clusters: KOSCluster[] = CLUSTERS,
): KOSNode[] {
  return raw.map(n => {
    const cluster = clusters[n.cluster] ?? clusters[0]
    const angle = hash(n.id + '_angle') * Math.PI * 2
    const dist  = hash(n.id + '_dist')  * 0.4 + 0.6   // [0.6, 1.0]
    return {
      ...n,
      x:          cluster.cx + Math.cos(angle) * cluster.spread * dist,
      y:          cluster.cy + Math.sin(angle) * cluster.spread * dist,
      r:          8 + n.connections.length * 2,
      floatPhase: hash(n.id + '_phase') * Math.PI * 2,
    }
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/graph-layout.test.ts
```

Expected: All 7 tests PASS.

- [ ] **Step 6: Commit**

```bash
cd frontend && git add src/types/kos.ts src/utils/graph-layout.ts src/__tests__/graph-layout.test.ts
git commit -m "feat: add RawNode/GraphEdge types and deterministic graph layout utility"
```

---

### Task 3: useGraph hook

**Files:**
- Create: `frontend/src/hooks/useGraph.ts`
- Create: `frontend/src/__tests__/useGraph.test.tsx`

- [ ] **Step 1: Write failing hook tests**

```tsx
// frontend/src/__tests__/useGraph.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGraph } from '../hooks/useGraph'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const mockData = {
  nodes: [
    { id: '1', label: 'Deep Work', cluster: 0, connections: ['2'], insight: 'Focus deeply.', date: '2024-01-01' },
    { id: '2', label: 'Flow State', cluster: 0, connections: ['1'], insight: 'Enter the zone.', date: '2024-01-02' },
  ],
  edges: [{ source: '1', target: '2', weight: 1.0 }],
}

describe('useGraph', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response)
  })

  it('starts in loading state', () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })

  it('calls /api/graph', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(global.fetch).toHaveBeenCalledWith('/api/graph')
  })

  it('returns laid-out nodes with x, y, r, floatPhase', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.nodes).toHaveLength(2)
    const n = result.current.nodes[0]
    expect(typeof n.x).toBe('number')
    expect(typeof n.y).toBe('number')
    expect(typeof n.r).toBe('number')
    expect(typeof n.floatPhase).toBe('number')
  })

  it('returns edges from API', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.edges).toHaveLength(1)
    expect(result.current.edges[0].source).toBe('1')
  })

  it('returns empty arrays before data arrives', () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('sets isError when fetch returns non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/useGraph.test.tsx
```

Expected: FAIL — module `../hooks/useGraph` not found.

- [ ] **Step 3: Implement useGraph**

```typescript
// frontend/src/hooks/useGraph.ts
import { useQuery } from '@tanstack/react-query'
import { layoutNodes, CLUSTERS } from '../utils/graph-layout'
import type { KOSNode, GraphEdge, RawNode } from '../types/kos'

interface GraphResponse {
  nodes: RawNode[]
  edges: GraphEdge[]
}

export function useGraph() {
  const query = useQuery<GraphResponse>({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph')
      if (!res.ok) throw new Error('Failed to fetch graph')
      return res.json() as Promise<GraphResponse>
    },
  })

  const nodes: KOSNode[] = query.data ? layoutNodes(query.data.nodes, CLUSTERS) : []
  const edges: GraphEdge[] = query.data?.edges ?? []

  return {
    nodes,
    edges,
    isLoading: query.isLoading,
    isError:   query.isError,
    isSuccess: query.isSuccess,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useGraph.test.tsx
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useGraph.ts frontend/src/__tests__/useGraph.test.tsx
git commit -m "feat: add useGraph hook with React Query and layout integration"
```

---

### Task 4: GraphCanvas component

**Files:**
- Create: `frontend/src/components/explore/GraphCanvas.tsx`
- Create: `frontend/src/__tests__/GraphCanvas.test.tsx`

- [ ] **Step 1: Write failing canvas tests**

```tsx
// frontend/src/__tests__/GraphCanvas.test.tsx
import { render, fireEvent } from '@testing-library/react'
import GraphCanvas from '../components/explore/GraphCanvas'
import type { KOSNode, GraphEdge } from '../types/kos'

const mockCtx = {
  clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(),
  fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  fillText: vi.fn(), save: vi.fn(), restore: vi.fn(),
  scale: vi.fn(), translate: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockCtx as unknown as CanvasRenderingContext2D,
  )
})

const node = (id: string, x = 100, y = 100): KOSNode => ({
  id, label: id, cluster: 0, connections: [],
  insight: 'test', date: '2024-01-01',
  x, y, r: 10, floatPhase: 0,
})

const nodes: KOSNode[] = [node('a', 100, 100), node('b', 200, 200)]
const edges: GraphEdge[] = [{ source: 'a', target: 'b', weight: 1.0 }]

describe('GraphCanvas', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <GraphCanvas nodes={nodes} edges={edges} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('canvas has aria-label "Knowledge graph"', () => {
    const { container } = render(
      <GraphCanvas nodes={nodes} edges={edges} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toBe('Knowledge graph')
  })

  it('calls onSelect(null) when clicking empty area', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <GraphCanvas nodes={[]} edges={[]} selectedId={null} onSelect={onSelect} />,
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.mouseDown(canvas, { clientX: 500, clientY: 500 })
    fireEvent.mouseUp(canvas, { clientX: 500, clientY: 500 })
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('does not call onSelect when drag ends', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <GraphCanvas nodes={[]} edges={[]} selectedId={null} onSelect={onSelect} />,
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 120, clientY: 120 })  // drag 20px
    fireEvent.mouseUp(window, { clientX: 120, clientY: 120 })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/GraphCanvas.test.tsx
```

Expected: FAIL — module `../components/explore/GraphCanvas` not found.

- [ ] **Step 3: Implement GraphCanvas**

```tsx
// frontend/src/components/explore/GraphCanvas.tsx
import { useRef, useEffect } from 'react'
import type { KOSNode, GraphEdge } from '../../types/kos'
import { CLUSTERS, LOGICAL_W, LOGICAL_H } from '../../utils/graph-layout'

interface Props {
  nodes: KOSNode[]
  edges: GraphEdge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

interface Transform { x: number; y: number; scale: number }
interface DragState  { active: boolean; moved: boolean; mx: number; my: number; tx: number; ty: number }

export default function GraphCanvas({ nodes, edges, selectedId, onSelect }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const rafRef       = useRef<number>(0)
  const t0Ref        = useRef<number>(performance.now())
  const dragRef      = useRef<DragState>({ active: false, moved: false, mx: 0, my: 0, tx: 0, ty: 0 })
  const hoveredRef   = useRef<string | null>(null)
  const initialized  = useRef(false)

  // Refs so RAF loop always reads current props without re-registering
  const nodesRef    = useRef(nodes)
  const edgesRef    = useRef(edges)
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  nodesRef.current    = nodes
  edgesRef.current    = edges
  selectedRef.current = selectedId
  onSelectRef.current = onSelect

  function fy(node: KOSNode, t: number) {
    return Math.sin(t * 0.001 + node.floatPhase) * 3
  }

  function hitTest(mx: number, my: number, t: number): string | null {
    const { x: tx, y: ty, scale } = transformRef.current
    for (const n of nodesRef.current) {
      const sx = n.x * scale + tx
      const sy = (n.y + fy(n, t)) * scale + ty
      if (Math.hypot(mx - sx, my - sy) <= n.r * scale + 6) return n.id
    }
    return null
  }

  // RAF drawing loop — runs for lifetime of component
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function loop() {
      const t   = performance.now() - t0Ref.current
      const ctx = canvas!.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }

      const dpr = window.devicePixelRatio || 1
      const cw  = canvas!.clientWidth
      const ch  = canvas!.clientHeight
      if (canvas!.width !== cw * dpr || canvas!.height !== ch * dpr) {
        canvas!.width  = cw * dpr
        canvas!.height = ch * dpr
      }
      if (!initialized.current && cw > 0) {
        transformRef.current.x = (cw - LOGICAL_W) / 2
        transformRef.current.y = (ch - LOGICAL_H) / 2
        initialized.current = true
      }

      const { x: tx, y: ty, scale } = transformRef.current
      const ns    = nodesRef.current
      const es    = edgesRef.current
      const selId = selectedRef.current
      const hovId = hoveredRef.current

      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)

      // Edges
      for (const edge of es) {
        const src = ns.find(n => n.id === edge.source)
        const tgt = ns.find(n => n.id === edge.target)
        if (!src || !tgt) continue
        const active = selId === src.id || selId === tgt.id || hovId === src.id || hovId === tgt.id
        ctx.beginPath()
        ctx.moveTo(src.x, src.y + fy(src, t))
        ctx.lineTo(tgt.x, tgt.y + fy(tgt, t))
        ctx.strokeStyle = active ? 'rgba(167,139,250,0.35)' : 'rgba(139,92,246,0.12)'
        ctx.lineWidth   = active ? 1.5 : 0.8
        ctx.stroke()
      }

      // Nodes
      for (const n of ns) {
        const ny   = n.y + fy(n, t)
        const isSel = selId === n.id
        const isHov = hovId === n.id
        const [r, g, b] = (CLUSTERS[n.cluster] ?? CLUSTERS[0]).color

        // Glow
        const glowR = n.r * (isSel ? 3.5 : isHov ? 2.5 : 2)
        const grad  = ctx.createRadialGradient(n.x, ny, 0, n.x, ny, glowR)
        grad.addColorStop(0, `rgba(${r},${g},${b},${isSel ? 0.55 : isHov ? 0.35 : 0.18})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(n.x, ny, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(n.x, ny, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${isSel ? 1 : isHov ? 0.85 : 0.65})`
        ctx.fill()

        // Label
        ctx.font      = `${isSel ? 'bold' : 'normal'} 11px "Fira Code", monospace`
        ctx.fillStyle = isSel ? '#f0eeff' : 'rgba(196,181,253,0.75)'
        ctx.textAlign = 'center'
        ctx.fillText(n.label, n.x, ny + n.r + 14)
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Mouse / wheel interaction — stable, reads from refs
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => {
      const tr = transformRef.current
      dragRef.current = { active: true, moved: false, mx: e.clientX, my: e.clientY, tx: tr.x, ty: tr.y }
    }

    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (d.active) {
        const dx = e.clientX - d.mx
        const dy = e.clientY - d.my
        if (Math.hypot(dx, dy) > 3) d.moved = true
        transformRef.current.x = d.tx + dx
        transformRef.current.y = d.ty + dy
      } else {
        const t = performance.now() - t0Ref.current
        hoveredRef.current    = hitTest(e.clientX, e.clientY, t)
        canvas.style.cursor   = hoveredRef.current ? 'pointer' : 'grab'
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d.moved) {
        const t = performance.now() - t0Ref.current
        onSelectRef.current(hitTest(e.clientX, e.clientY, t))
      }
      dragRef.current.active = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor   = e.deltaY < 0 ? 1.1 : 0.9
      const tr       = transformRef.current
      const newScale = Math.max(0.3, Math.min(4, tr.scale * factor))
      const sf       = newScale / tr.scale
      transformRef.current = {
        x:     e.clientX - (e.clientX - tr.x) * sf,
        y:     e.clientY - (e.clientY - tr.y) * sf,
        scale: newScale,
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    canvas.addEventListener('wheel',     onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      canvas.removeEventListener('wheel',     onWheel)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-grab"
      aria-label="Knowledge graph"
    />
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/GraphCanvas.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/explore/GraphCanvas.tsx frontend/src/__tests__/GraphCanvas.test.tsx
git commit -m "feat: add GraphCanvas with RAF loop, pan/zoom, and hit-testing"
```

---

### Task 5: NodeDetailPanel component

**Files:**
- Create: `frontend/src/components/explore/NodeDetailPanel.tsx`
- Create: `frontend/src/__tests__/NodeDetailPanel.test.tsx`

- [ ] **Step 1: Write failing panel tests**

```tsx
// frontend/src/__tests__/NodeDetailPanel.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import NodeDetailPanel from '../components/explore/NodeDetailPanel'
import type { KOSNode } from '../types/kos'

const node: KOSNode = {
  id: '1', label: 'Deep Work', cluster: 0,
  connections: ['2', '3'],
  insight: 'Concentrated work produces rare results.',
  date: '2024-01-15', x: 100, y: 100, r: 12, floatPhase: 0,
}

describe('NodeDetailPanel', () => {
  it('renders node label', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Deep Work')).toBeInTheDocument()
  })

  it('renders node insight', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Concentrated work produces rare results.')).toBeInTheDocument()
  })

  it('renders cluster name', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Productivity')).toBeInTheDocument()
  })

  it('renders plural "connections" for count > 1', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('2 connections')).toBeInTheDocument()
  })

  it('renders singular "connection" for count === 1', () => {
    const single = { ...node, connections: ['x'] }
    render(<NodeDetailPanel node={single} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('1 connection')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<NodeDetailPanel node={node} onClose={onClose} onTalk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onTalk with the node when discuss button clicked', () => {
    const onTalk = vi.fn()
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={onTalk} />)
    fireEvent.click(screen.getByRole('button', { name: /discuss/i }))
    expect(onTalk).toHaveBeenCalledWith(node)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/NodeDetailPanel.test.tsx
```

Expected: FAIL — module `../components/explore/NodeDetailPanel` not found.

- [ ] **Step 3: Implement NodeDetailPanel**

```tsx
// frontend/src/components/explore/NodeDetailPanel.tsx
import { X, MessageCircle } from 'lucide-react'
import type { KOSNode } from '../../types/kos'
import { CLUSTERS } from '../../utils/graph-layout'

interface Props {
  node: KOSNode
  onClose: () => void
  onTalk: (node: KOSNode) => void
}

export default function NodeDetailPanel({ node, onClose, onTalk }: Props) {
  const cluster = CLUSTERS[node.cluster] ?? CLUSTERS[0]
  const [r, g, b] = cluster.color
  const count = node.connections.length

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-bg-card border-l border-purple-primary/20 flex flex-col p-6 z-10">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-purple-soft opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close panel"
      >
        <X size={16} />
      </button>

      <span
        className="font-mono text-xs tracking-widest uppercase mb-4 self-start"
        style={{ color: `rgb(${r},${g},${b})` }}
      >
        {cluster.name}
      </span>

      <h2 className="font-mono text-lg text-text-primary font-bold mb-2 pr-6">
        {node.label}
      </h2>

      <p className="font-mono text-xs text-purple-soft opacity-50 mb-4">{node.date}</p>

      <p className="text-sm text-text-primary/80 leading-relaxed flex-1 mb-6">
        {node.insight}
      </p>

      <p className="font-mono text-xs text-purple-soft opacity-60 mb-4">
        {count} {count === 1 ? 'connection' : 'connections'}
      </p>

      <button
        onClick={() => onTalk(node)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-primary/20 border border-purple-primary/40 rounded text-purple-bright font-mono text-xs tracking-widest uppercase hover:bg-purple-primary/30 transition-colors"
        aria-label="Discuss in Talk"
      >
        <MessageCircle size={14} />
        Discuss in Talk
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/NodeDetailPanel.test.tsx
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/explore/NodeDetailPanel.tsx frontend/src/__tests__/NodeDetailPanel.test.tsx
git commit -m "feat: add NodeDetailPanel with cluster badge, insight text, and Talk CTA"
```

---

### Task 6: ExplorePage wiring

**Files:**
- Modify: `frontend/src/pages/ExplorePage.tsx`
- Create: `frontend/src/__tests__/ExplorePage.test.tsx`

- [ ] **Step 1: Write failing page tests**

```tsx
// frontend/src/__tests__/ExplorePage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KOSProvider } from '../context/KOSContext'
import ExplorePage from '../pages/ExplorePage'

const mockCtx = {
  clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(),
  fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  fillText: vi.fn(), save: vi.fn(), restore: vi.fn(),
  scale: vi.fn(), translate: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockCtx as unknown as CanvasRenderingContext2D,
  )
})

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <KOSProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </KOSProvider>
    </QueryClientProvider>
  )
}

describe('ExplorePage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodes: [
          { id: '1', label: 'Deep Work', cluster: 0, connections: [], insight: 'Focus.', date: '2024-01-01' },
        ],
        edges: [],
      }),
    } as Response)
  })

  it('shows loading state while fetching', () => {
    render(<Wrapper><ExplorePage /></Wrapper>)
    expect(screen.getByText(/loading graph/i)).toBeInTheDocument()
  })

  it('renders canvas after data loads', async () => {
    const { container } = render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument())
  })

  it('does not show NodeDetailPanel when no node selected', async () => {
    render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(/connections/)).not.toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/ExplorePage.test.tsx
```

Expected: FAIL — ExplorePage renders "coming soon", not loading state.

- [ ] **Step 3: Implement ExplorePage**

Replace `frontend/src/pages/ExplorePage.tsx` entirely:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '../hooks/useGraph'
import { useKOS } from '../context/KOSContext'
import GraphCanvas from '../components/explore/GraphCanvas'
import NodeDetailPanel from '../components/explore/NodeDetailPanel'
import type { KOSNode } from '../types/kos'

export default function ExplorePage() {
  const { nodes, edges, isLoading, isError } = useGraph()
  const { setSelectedNodeId, setTalkContext, setMode } = useKOS()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const navigate = useNavigate()

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  function handleSelect(id: string | null) {
    setSelectedId(id)
    setSelectedNodeId(id)
  }

  function handleTalk(node: KOSNode) {
    setTalkContext({ nodeId: node.id, nodeLabel: node.label, nodeInsight: node.insight })
    setMode('talk')
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40 animate-pulse">
          LOADING GRAPH...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
          ERROR — could not load graph
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => handleSelect(null)}
          onTalk={handleTalk}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/ExplorePage.test.tsx
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Run all tests to confirm nothing broke**

```bash
cd frontend && npx vitest run
```

Expected: All tests PASS. Zero failures.

- [ ] **Step 6: Smoke-test in browser**

```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173`, click EXPLORE in the nav bar. You should see:
- Loading pulse → then the graph canvas with 8 floating nodes in 3 color groups
- Pan by dragging, zoom with scroll wheel
- Click a node → NodeDetailPanel slides in from right
- Panel shows label, cluster name, date, insight text, connection count
- "Discuss in Talk" button navigates to / with the node pre-loaded in KOSContext

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/ExplorePage.tsx frontend/src/__tests__/ExplorePage.test.tsx
git commit -m "feat: implement ExplorePage with graph canvas, node detail panel, and Talk handoff"
```

---

## Self-Review

### Spec Coverage

| Requirement | Task |
|-------------|------|
| Seed graph data from backend | Task 1 |
| `RawNode` / `GraphEdge` types | Task 2 |
| Deterministic layout (cluster positions) | Task 2 |
| React Query hook for graph data | Task 3 |
| Full-screen canvas with nodes + edges | Task 4 |
| Pan by drag | Task 4 |
| Zoom by scroll | Task 4 |
| Node hover highlight | Task 4 |
| Node click selection | Task 4 |
| NodeDetailPanel: label, cluster, date, insight | Task 5 |
| NodeDetailPanel: connection count | Task 5 |
| NodeDetailPanel: Discuss in Talk CTA | Task 5 |
| Loading + error states | Task 6 |
| KOSContext integration (selectedNodeId, talkContext) | Task 6 |
| Navigate to Talk with node context | Task 6 |

### Placeholder Scan

No TBD, TODO, or placeholder steps found.

### Type Consistency

- `RawNode` defined in Task 2, used in `useGraph.ts` (Task 3) ✓
- `GraphEdge` defined in Task 2, used in `useGraph.ts` (Task 3) and `GraphCanvas.tsx` (Task 4) ✓
- `KOSNode` from `kos.ts` used in `GraphCanvas`, `NodeDetailPanel`, `ExplorePage` ✓
- `CLUSTERS` exported from `graph-layout.ts` (Task 2), imported in `GraphCanvas` (Task 4) and `NodeDetailPanel` (Task 5) ✓
- `layoutNodes` called with `RawNode[]` in Task 3 — matches signature in Task 2 ✓
- `onSelect: (id: string | null) => void` in `GraphCanvas` — called with `hitTest()` result which returns `string | null` ✓
- `onTalk: (node: KOSNode) => void` in `NodeDetailPanel` — called with `node` arg of type `KOSNode` ✓
