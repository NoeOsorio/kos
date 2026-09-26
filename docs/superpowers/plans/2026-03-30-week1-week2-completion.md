# KOS Week 1 & 2 Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Week 1 (Supabase persistence, intent detection, streaming chat, auto-save) and Week 2 (dynamic graph, Claude connection detection, area filter) of the KOS app.

**Architecture:** Supabase (Postgres + pgvector) is the single source of truth. Backend routes are wired to the real DB. Frontend streams chat via SSE with conversation history. Insights are auto-saved after each exchange. The knowledge graph is built from real DB data. Claude Haiku detects connections between new insights and existing ones in the background.

**Tech Stack:** Python 3.12, FastAPI, supabase-py v2.10, openai (text-embedding-3-small), anthropic (Claude Haiku + Sonnet), Vite + React 18 + TypeScript + Tailwind, Vitest

---

## File Map

### New files
- `backend/app/core/supabase.py` — Supabase sync client singleton
- `backend/app/services/__init__.py` — empty
- `backend/app/services/embeddings.py` — OpenAI embedding helper
- `backend/app/services/connections.py` — Claude connection detection logic
- `backend/tests/__init__.py` — empty
- `backend/tests/conftest.py` — shared TestClient fixture
- `backend/tests/test_logs.py`
- `backend/tests/test_insights.py`
- `backend/tests/test_graph.py`
- `backend/requirements-dev.txt`

### Modified files
- `backend/app/api/routes/logs.py` — wire to Supabase
- `backend/app/api/routes/insights.py` — wire to Supabase + embeddings + background connection task
- `backend/app/api/routes/graph.py` — query real DB, add area field, mock fallback
- `backend/app/api/routes/analyze.py` — add `type` intent field to response
- `frontend/src/types/kos.ts` — add `area` to `RawNode` + `KOSNode`
- `frontend/src/utils/graph-layout.ts` — pass `area` through `layoutNodes`
- `frontend/src/pages/TalkPage.tsx` — streaming SSE + conversation history + auto-save
- `frontend/src/pages/ExplorePage.tsx` — area filter bar

---

## Task 1: Supabase DB schema + client

**Files:**
- SQL migration (run in Supabase SQL editor — not a file in repo)
- Create: `backend/app/core/supabase.py`
- Create: `backend/requirements-dev.txt`

- [ ] **Step 1: Run this SQL in the Supabase SQL editor**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- logs table
CREATE TABLE IF NOT EXISTS logs (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  type       text    CHECK (type IN ('book','idea','class','connection','article')) NOT NULL,
  title      text    NOT NULL,
  author     text,
  chapter    text,
  area       text,
  created_at timestamptz DEFAULT now()
);

-- insights table
CREATE TABLE IF NOT EXISTS insights (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  log_id      uuid    REFERENCES logs(id) ON DELETE CASCADE,
  content     text    NOT NULL,
  area        text,
  embedding   vector(1536),
  next_review timestamptz,
  ease_factor float   DEFAULT 2.5,
  created_at  timestamptz DEFAULT now()
);

-- connections table
CREATE TABLE IF NOT EXISTS connections (
  id         uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id  uuid    REFERENCES insights(id) ON DELETE CASCADE,
  target_id  uuid    REFERENCES insights(id) ON DELETE CASCADE,
  label      text,
  strength   float   DEFAULT 0.5,
  confirmed  bool    DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(source_id, target_id)
);

-- Index for pgvector cosine similarity
CREATE INDEX IF NOT EXISTS insights_embedding_idx
  ON insights USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
```

- [ ] **Step 2: Create `backend/app/core/supabase.py`**

```python
from supabase import create_client, Client
from app.core.config import settings

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_role_key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env"
            )
        _client = create_client(settings.supabase_url, settings.supabase_service_role_key)
    return _client
```

- [ ] **Step 3: Create `backend/requirements-dev.txt`**

```
pytest==8.3.3
pytest-asyncio==0.24.0
httpx==0.27.2
```

- [ ] **Step 4: Verify `.env` exists with the Supabase keys**

Ensure `backend/.env` contains:
```
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
ANTHROPIC_API_KEY=<your-key>
OPENAI_API_KEY=<your-key>
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/core/supabase.py backend/requirements-dev.txt
git commit -m "feat: add Supabase client and DB schema migration"
```

---

## Task 2: Wire /api/logs to Supabase

**Files:**
- Modify: `backend/app/api/routes/logs.py`
- Create: `backend/tests/__init__.py`, `backend/tests/conftest.py`, `backend/tests/test_logs.py`

- [ ] **Step 1: Create test infrastructure**

`backend/tests/__init__.py` — empty file (just create it).

`backend/tests/conftest.py`:
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)
```

- [ ] **Step 2: Write failing test**

`backend/tests/test_logs.py`:
```python
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


def test_create_log_returns_saved_entry(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.insert.return_value.execute.return_value.data = [{
        "id": "abc-123",
        "type": "book",
        "title": "Thinking Fast and Slow",
        "author": "Kahneman",
        "chapter": "3",
        "area": "psychology",
        "created_at": "2026-03-30T00:00:00+00:00",
    }]

    with patch("app.api.routes.logs.get_supabase", return_value=mock_sb):
        resp = client.post("/api/logs", json={
            "type": "book",
            "title": "Thinking Fast and Slow",
            "author": "Kahneman",
            "chapter": "3",
            "area": "psychology",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "abc-123"
    assert data["title"] == "Thinking Fast and Slow"


def test_list_logs_returns_array(client):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.order.return_value.execute.return_value.data = []

    with patch("app.api.routes.logs.get_supabase", return_value=mock_sb):
        resp = client.get("/api/logs")

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

- [ ] **Step 3: Run tests — expect failure**

```bash
cd backend && pip install -r requirements-dev.txt && pytest tests/test_logs.py -v
```
Expected: `FAILED` — logs.py still returns placeholder.

- [ ] **Step 4: Implement logs.py**

Replace `backend/app/api/routes/logs.py` entirely:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Literal

from app.core.supabase import get_supabase

router = APIRouter()


class LogEntry(BaseModel):
    type: Literal["book", "idea", "class", "connection", "article"]
    title: str
    author: str | None = None
    chapter: str | None = None
    area: str | None = None


class LogResponse(LogEntry):
    id: str
    created_at: datetime


@router.get("")
async def list_logs() -> list[LogResponse]:
    sb = get_supabase()
    result = sb.table("logs").select("*").order("created_at", desc=True).execute()
    return result.data or []


@router.post("", response_model=LogResponse)
async def create_log(entry: LogEntry) -> LogResponse:
    sb = get_supabase()
    result = sb.table("logs").insert(entry.model_dump(exclude_none=True)).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create log")
    return result.data[0]
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd backend && pytest tests/test_logs.py -v
```
Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/logs.py backend/tests/
git commit -m "feat: wire /api/logs to Supabase"
```

---

## Task 3: Wire /api/insights to Supabase with OpenAI embeddings

**Files:**
- Create: `backend/app/services/__init__.py`, `backend/app/services/embeddings.py`
- Modify: `backend/app/api/routes/insights.py`
- Create: `backend/tests/test_insights.py`

- [ ] **Step 1: Create embeddings service**

`backend/app/services/__init__.py` — empty file.

`backend/app/services/embeddings.py`:
```python
from openai import OpenAI
from app.core.config import settings

_client: OpenAI | None = None


def get_openai() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.openai_api_key)
    return _client


def embed(text: str) -> list[float]:
    """Return a 1536-dim embedding using text-embedding-3-small."""
    response = get_openai().embeddings.create(
        model="text-embedding-3-small",
        input=text.replace("\n", " "),
    )
    return response.data[0].embedding
```

- [ ] **Step 2: Write failing tests**

`backend/tests/test_insights.py`:
```python
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
```

- [ ] **Step 3: Run tests — expect failure**

```bash
cd backend && pytest tests/test_insights.py -v
```
Expected: FAILED — insights.py still uses placeholders and doesn't import `find_and_save_connections`.

- [ ] **Step 4: Create stub connections service (needed for import)**

`backend/app/services/connections.py` — stub for now, full implementation in Task 8:
```python
def find_and_save_connections(insight_id: str, content: str, embedding: list[float]) -> None:
    """Detect and persist connections to similar insights. Implemented in Task 8."""
    pass
```

- [ ] **Step 5: Implement insights.py**

Replace `backend/app/api/routes/insights.py` entirely:

```python
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from datetime import datetime

from app.core.supabase import get_supabase
from app.services.embeddings import embed
from app.services.connections import find_and_save_connections

router = APIRouter()


class InsightCreate(BaseModel):
    log_id: str
    content: str


class InsightResponse(BaseModel):
    id: str
    log_id: str | None
    content: str
    area: str | None = None
    created_at: datetime


@router.get("")
async def list_insights() -> list[InsightResponse]:
    sb = get_supabase()
    result = (
        sb.table("insights")
        .select("id,log_id,content,area,created_at")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


@router.post("", response_model=InsightResponse)
async def create_insight(insight: InsightCreate, background_tasks: BackgroundTasks) -> InsightResponse:
    sb = get_supabase()
    embedding = embed(insight.content)
    result = sb.table("insights").insert({
        "log_id": insight.log_id,
        "content": insight.content,
        "embedding": embedding,
    }).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create insight")
    saved = result.data[0]
    background_tasks.add_task(find_and_save_connections, saved["id"], insight.content, embedding)
    return saved


class TopicInsightCreate(BaseModel):
    title: str
    description: str


class TopicInsightResponse(BaseModel):
    id: str
    title: str
    description: str


@router.post("/topic", response_model=TopicInsightResponse, status_code=201)
async def save_topic_insight(
    insight: TopicInsightCreate, background_tasks: BackgroundTasks
) -> TopicInsightResponse:
    sb = get_supabase()

    log_result = sb.table("logs").insert({
        "type": "idea",
        "title": insight.title,
    }).execute()
    if not log_result.data:
        raise HTTPException(status_code=500, detail="Failed to create log")
    log_id = log_result.data[0]["id"]

    content = f"{insight.title}: {insight.description}"
    embedding = embed(content)
    ins_result = sb.table("insights").insert({
        "log_id": log_id,
        "content": content,
        "embedding": embedding,
    }).execute()
    if not ins_result.data:
        raise HTTPException(status_code=500, detail="Failed to create insight")
    saved = ins_result.data[0]

    background_tasks.add_task(find_and_save_connections, saved["id"], content, embedding)
    return TopicInsightResponse(id=saved["id"], title=insight.title, description=insight.description)
```

- [ ] **Step 6: Run tests — expect pass**

```bash
cd backend && pytest tests/test_insights.py -v
```
Expected: 2 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/ backend/app/api/routes/insights.py backend/tests/test_insights.py
git commit -m "feat: wire /api/insights to Supabase with OpenAI embeddings"
```

---

## Task 4: Add intent type to /api/analyze

**Files:**
- Modify: `backend/app/api/routes/analyze.py`

Add a `type` field (`book|idea|class|connection|article`) to `AnalyzeResponse` so the frontend knows what kind of knowledge was exchanged.

- [ ] **Step 1: Add `Literal` import and `type` field to `AnalyzeResponse`**

In `backend/app/api/routes/analyze.py`, add `Literal` to the imports at the top:
```python
from typing import Literal
```

Replace the `AnalyzeResponse` class:
```python
class AnalyzeResponse(BaseModel):
    type: Literal["book", "idea", "class", "connection", "article"] = "idea"
    new_topics: list[TopicItem]
    similar: list[SimilarItem]
```

- [ ] **Step 2: Update `_EXTRACTION_PROMPT` to request a `type` field**

Replace `_EXTRACTION_PROMPT`:
```python
_EXTRACTION_PROMPT = """Extract the main knowledge topics from this conversation exchange and classify the content type.

User message: {message}
AI response: {response}

Return a JSON object with this exact shape:
{{
  "type": "idea",
  "new_topics": [
    {{"name": "Topic Name", "description": "One sentence description"}}
  ],
  "similar_keywords": ["keyword1", "keyword2"]
}}

Rules for "type" — pick ONE:
- "book": user explicitly mentions a book or author
- "class": user mentions a class, course, lecture, or university subject
- "article": user mentions an article, paper, or blog post
- "connection": user describes a relationship between two concepts
- "idea": everything else (default)

Rules for topics:
- Only concrete knowledge topics (concepts, frameworks, skills). Skip small talk.
- Maximum 2 new_topics. Empty list if no clear topic.
- similar_keywords: 2-4 single words for matching existing knowledge. Empty list if none.
- Return only valid JSON, nothing else."""
```

- [ ] **Step 3: Update the parse block in `analyze()` to extract `type`**

In the `analyze` function, replace the `try` block that parses the response:
```python
    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0].strip()
        raw = json.loads(text)
        intent_type = raw.get("type", "idea")
        if intent_type not in ("book", "idea", "class", "connection", "article"):
            intent_type = "idea"
        new_topics = [TopicItem(**t) for t in raw.get("new_topics", [])]
        similar = _find_similar(raw.get("similar_keywords", []))
    except (json.JSONDecodeError, KeyError, TypeError, ValidationError):
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])

    return AnalyzeResponse(type=intent_type, new_topics=new_topics, similar=similar)
```

Also update the two early-return stubs:
```python
    if len(request.message.strip()) < 10:
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])

    if not settings.anthropic_api_key:
        return AnalyzeResponse(type="idea", new_topics=[], similar=[])
```

- [ ] **Step 4: Smoke test the endpoint**

```bash
cd backend && uvicorn app.main:app --reload &
curl -s -X POST http://localhost:8000/api/analyze \
  -H 'Content-Type: application/json' \
  -d '{"message":"I read chapter 3 of Thinking Fast and Slow about cognitive biases","response":"How does that connect to decisions you make at work?"}' \
  | python3 -m json.tool
```
Expected: JSON with `type`, `new_topics`, and `similar` fields.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/analyze.py
git commit -m "feat: add intent type detection to /api/analyze"
```

---

## Task 5: Stream /api/chat in TalkPage + auto-save topics

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`

Two changes: (1) replace non-streaming `/api/talk` with SSE `/api/chat`, maintaining conversation history; (2) auto-save all detected topics to the brain after each exchange (no manual click required).

- [ ] **Step 1: Add `messages` state to TalkPage**

In `TalkPage.tsx`, after the existing `useState` hooks near the top of the component, add:
```typescript
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
```

- [ ] **Step 2: Replace the entire `handleSend` function**

Find `async function handleSend(text: string)` and replace it entirely with:

```typescript
  async function handleSend(text: string) {
    if (!text.trim()) return
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    send()
    clearTranscript()
    clearAll()

    const newMessages = [...messages, { role: 'user' as const, content: text }]
    setMessages(newMessages)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        streamComplete()
        return
      }

      firstTokenReceived()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const token = part.slice(6)
          if (token === '[DONE]') break
          fullResponse += token
          setTranscript(fullResponse)
        }
      }

      streamComplete()
      setMessages(prev => [...prev, { role: 'assistant' as const, content: fullResponse }])

      // Analyze exchange and auto-save all detected topics
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, response: fullResponse }),
      })
        .then(r => r.json())
        .then(d => {
          addCards(d.new_topics ?? [], d.similar ?? [])
          ;(d.new_topics ?? []).forEach((topic: { name: string; description: string }) => {
            fetch('/api/insights/topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: topic.name, description: topic.description }),
            }).catch(() => {})
          })
        })
        .catch(() => {})
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        streamComplete()
      }
    }
  }
```

- [ ] **Step 3: Update `handleSaveCard` — topics are already saved, just dismiss**

Replace `handleSaveCard`:
```typescript
  function handleSaveCard(card: NewTopicCard) {
    dismiss(card.id)
  }
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && npm run type-check
```
Expected: no errors.

- [ ] **Step 5: Manual test — verify streaming works**

```bash
cd frontend && npm run dev
```
Open http://localhost:5173, type a message and click send (or hold nebula). Verify the transcript fills token by token instead of appearing all at once.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx
git commit -m "feat: streaming /api/chat with conversation history and auto-save topics"
```

---

## Task 6: Dynamic /api/graph from Supabase

**Files:**
- Modify: `backend/app/api/routes/graph.py`
- Modify: `frontend/src/types/kos.ts`
- Modify: `frontend/src/utils/graph-layout.ts`
- Create: `backend/tests/test_graph.py`

Replace hardcoded mock data with real Supabase queries. Add `area` to nodes. Keep mock fallback for when DB is empty.

- [ ] **Step 1: Write failing backend test**

`backend/tests/test_graph.py`:
```python
from unittest.mock import MagicMock, patch, call


def test_graph_returns_nodes_from_db(client):
    mock_sb = MagicMock()
    mock_supabase = mock_sb

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
```

- [ ] **Step 2: Run — expect failure**

```bash
cd backend && pytest tests/test_graph.py -v
```
Expected: FAILED — currently returns hardcoded data, mock isn't used.

- [ ] **Step 3: Implement dynamic graph.py**

Replace `backend/app/api/routes/graph.py` entirely:

```python
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
                  connections=["node-fs","node-sb"],
                  insight="Concentrated work produces rare and valuable output.", date="2024-01-15"),
        GraphNode(id="node-fs", label="Flow State",   cluster=0, area="productivity",
                  connections=["node-dw"],
                  insight="Peak performance when challenge meets skill.", date="2024-02-03"),
        GraphNode(id="node-sb", label="Second Brain", cluster=1, area="systems",
                  connections=["node-dw","node-zk"],
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
```

- [ ] **Step 4: Run backend tests — expect pass**

```bash
cd backend && pytest tests/test_graph.py -v
```
Expected: 2 tests PASS.

- [ ] **Step 5: Add `area` to frontend types**

In `frontend/src/types/kos.ts`, add `area` to both `RawNode` and `KOSNode`:

```typescript
export interface RawNode {
  id: string
  label: string
  cluster: number
  area: string | null   // ← add this line
  connections: string[]
  insight: string
  date: string
}

export interface KOSNode {
  id: string
  label: string
  cluster: number
  area: string | null   // ← add this line
  connections: string[]
  insight: string
  date: string
  // Derived at render time:
  x: number
  y: number
  r: number
  floatPhase: number
}
```

- [ ] **Step 6: Pass `area` through `layoutNodes`**

In `frontend/src/utils/graph-layout.ts`, the `layoutNodes` function spreads `...n` onto the returned object, which already includes all `RawNode` fields. Since we added `area` to `RawNode`, it will be spread through automatically — no code change needed. Verify the spread is there:

```typescript
    return {
      ...n,   // ← area comes through here automatically
      x: ...,
      y: ...,
      r: ...,
      floatPhase: ...,
    }
```

- [ ] **Step 7: TypeScript check**

```bash
cd frontend && npm run type-check
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add backend/app/api/routes/graph.py backend/tests/test_graph.py \
        frontend/src/types/kos.ts
git commit -m "feat: dynamic /api/graph from Supabase, area field on nodes"
```

---

## Task 7: Claude connection detection (background task)

**Files:**
- Modify: `backend/app/services/connections.py` (replace stub with full implementation)

After saving an insight, find similar insights via pgvector cosine similarity. For each match above threshold, ask Claude Haiku to label the connection. Persist to the `connections` table.

- [ ] **Step 1: Run this SQL in the Supabase SQL editor (pgvector RPC function)**

```sql
CREATE OR REPLACE FUNCTION match_insights(
  query_embedding vector(1536),
  match_threshold  float,
  match_count      int,
  exclude_id       uuid
)
RETURNS TABLE (id uuid, content text, similarity float)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    content,
    1 - (embedding <=> query_embedding) AS similarity
  FROM insights
  WHERE id != exclude_id
    AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

- [ ] **Step 2: Replace the stub in `backend/app/services/connections.py`**

```python
import anthropic
from app.core.config import settings
from app.core.supabase import get_supabase


def find_and_save_connections(insight_id: str, content: str, embedding: list[float]) -> None:
    """
    Background task: find similar insights via pgvector, ask Claude Haiku to label
    the connection, and upsert into the connections table.
    """
    sb = get_supabase()

    try:
        result = sb.rpc("match_insights", {
            "query_embedding": embedding,
            "match_threshold": 0.75,
            "match_count": 5,
            "exclude_id": insight_id,
        }).execute()
        similar = result.data or []
    except Exception:
        return

    if not similar:
        return

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    for item in similar:
        target_id = item["id"]
        target_content = item["content"]

        try:
            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=60,
                messages=[{
                    "role": "user",
                    "content": (
                        f'Insight A: "{content}"\n'
                        f'Insight B: "{target_content}"\n\n'
                        "In 5 words or fewer, describe HOW these two ideas connect. "
                        "If they are not meaningfully connected, reply exactly: null"
                    ),
                }],
            )
            label_raw = msg.content[0].text.strip()
            if label_raw.lower() == "null":
                continue
            label = label_raw[:80]
        except Exception:
            label = "related"

        try:
            sb.table("connections").upsert({
                "source_id": insight_id,
                "target_id": target_id,
                "label": label,
                "strength": round(float(item.get("similarity", 0.8)), 3),
            }, on_conflict="source_id,target_id").execute()
        except Exception:
            pass
```

- [ ] **Step 3: Verify existing insight tests still pass**

```bash
cd backend && pytest tests/test_insights.py -v
```
Expected: still PASS (tests mock `find_and_save_connections`).

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/connections.py
git commit -m "feat: Claude Haiku connection detection via pgvector similarity"
```

---

## Task 8: Area filter bar in ExplorePage

**Files:**
- Modify: `frontend/src/pages/ExplorePage.tsx`

Add a row of filter buttons at the top of the explore page. Selecting an area shows only nodes from that area and edges between them.

- [ ] **Step 1: Replace `frontend/src/pages/ExplorePage.tsx`**

```typescript
import { useState, useMemo } from 'react'
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
  const [activeArea, setActiveArea] = useState<string | null>(null)
  const navigate = useNavigate()

  const areas = useMemo(() => {
    const set = new Set(nodes.map(n => n.area ?? 'general'))
    return Array.from(set).sort()
  }, [nodes])

  const filteredNodes = useMemo(
    () => activeArea ? nodes.filter(n => (n.area ?? 'general') === activeArea) : nodes,
    [nodes, activeArea]
  )

  const visibleIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])
  const filteredEdges = useMemo(
    () => edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [edges, visibleIds]
  )

  const selectedNode = filteredNodes.find(n => n.id === selectedId) ?? null

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
      {areas.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 flex-wrap justify-center px-4">
          <button
            onClick={() => setActiveArea(null)}
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded border transition-colors"
            style={{
              background: !activeArea ? 'rgba(139,92,246,0.3)' : 'rgba(8,8,20,0.7)',
              borderColor: !activeArea ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
              color: !activeArea ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.45)',
            }}
          >
            All
          </button>
          {areas.map(area => (
            <button
              key={area}
              onClick={() => setActiveArea(area === activeArea ? null : area)}
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded border transition-colors"
              style={{
                background: activeArea === area ? 'rgba(139,92,246,0.3)' : 'rgba(8,8,20,0.7)',
                borderColor: activeArea === area ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
                color: activeArea === area ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.45)',
              }}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      <GraphCanvas
        nodes={filteredNodes}
        edges={filteredEdges}
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

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && npm run type-check
```
Expected: no errors.

- [ ] **Step 3: Visual test**

```bash
cd frontend && npm run dev
```
Go to /explore. Filter bar appears only when there are 2+ distinct areas (mock data has "productivity" + "systems" → 3 buttons: All, productivity, systems). Click each — graph filters accordingly.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ExplorePage.tsx
git commit -m "feat: area filter bar in ExplorePage"
```

---

## Self-Review

### Spec coverage
| Requirement | Task |
|---|---|
| Supabase + tables (logs, insights, connections) | Task 1 |
| /api/logs wired to Supabase | Task 2 |
| /api/insights with OpenAI embeddings | Task 3 |
| Intent auto-detection | Task 4 |
| Auto-save at end of each conversation | Task 5 |
| Chat with streaming + conversation history | Task 5 |
| /api/graph dynamic from DB | Task 6 |
| Claude auto-detects connections | Task 7 |
| Filter by area in ExplorePage | Task 8 |

### Known gaps (out of scope for this plan)
- `/api/talk` route is now superseded by `/api/chat` — remove it in a cleanup pass
- `/api/analyze` `similar` still uses hardcoded `_KNOWLEDGE_BASE` instead of vector search — that's Week 3 (RAG pipeline)
- `NodeDetailPanel` shows `cluster.name` from the hardcoded `CLUSTERS` array; with real data, cluster names won't match areas. Consider passing `area` directly to the panel instead of deriving from cluster index — low-priority visual issue

### Placeholder scan
No TBD/TODO in any code block above. All steps have complete code.

### Type consistency
- `GraphNode.area: str | None` added in Task 6 backend
- `RawNode.area: string | null` and `KOSNode.area: string | null` added in Task 6 frontend
- `AnalyzeResponse.type` added in Task 4, not yet consumed by frontend (available for future use)
- `BackgroundTasks` parameter added to `create_insight` and `save_topic_insight` in Task 3
- `find_and_save_connections` signature `(insight_id: str, content: str, embedding: list[float]) -> None` used consistently in Tasks 3 and 7
