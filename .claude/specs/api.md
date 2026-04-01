# Backend API Spec

Base: `http://localhost:8000`
Entry: `backend/app/main.py`
Config: `backend/app/core/config.py` (reads `.env`)

---

## Routes

### POST /api/chat
**File:** `backend/app/api/routes/chat.py`
**Input:** `{ messages: [{role, content}] }`
**Output:** SSE stream — `data: {token}\n\n`, ends with `data: [DONE]\n\n`
**Status:** DONE. Socratic system prompt, streaming via `StreamingResponse`.

### POST /api/talk
**File:** `backend/app/api/routes/talk.py`
**Input:** `{ message: string }`
**Output:** `{ response: string }`
**Status:** DONE but superseded by `/api/chat`. Remove after Week 2.

### GET /api/logs
**File:** `backend/app/api/routes/logs.py`
**Output:** `LogResponse[]`
**Status:** TODO — returns placeholder. Needs Supabase wire (Task 2 in plan).

### POST /api/logs
**Input:** `{ type, title, author?, chapter?, area? }`
**Output:** `LogResponse { id, type, title, ..., created_at }`
**Status:** TODO — returns placeholder.

### GET /api/insights
**File:** `backend/app/api/routes/insights.py`
**Output:** `InsightResponse[]`
**Status:** TODO.

### POST /api/insights
**Input:** `{ log_id, content }`
**Output:** `InsightResponse { id, log_id, content, area?, created_at }`
**Status:** TODO. Should generate embedding + save to Supabase.

### POST /api/insights/topic
**Input:** `{ title, description }`
**Output:** `{ id, title, description }` — status 201
**Status:** TODO — returns placeholder id. Should create log + insight + embedding.

### GET /api/graph
**File:** `backend/app/api/routes/graph.py`
**Output:** `{ nodes: GraphNode[], edges: GraphEdge[] }`
**GraphNode:** `{ id, label, cluster, area, connections, insight, date }`
**GraphEdge:** `{ source, target, weight }`
**Status:** PARTIAL — returns hardcoded mock data. Needs Supabase query (Task 6 in plan).

### POST /api/analyze
**File:** `backend/app/api/routes/analyze.py`
**Input:** `{ message, response }`
**Output:** `{ type, new_topics: [{name, description}], similar: [{id, title, excerpt}] }`
**Status:** PARTIAL — extracts topics via Haiku, but `similar` uses hardcoded keyword match (not pgvector). `type` field missing (Task 4 in plan).

---

## Services (to be created)
- `backend/app/services/embeddings.py` — `embed(text) -> list[float]` via OpenAI text-embedding-3-small
- `backend/app/services/connections.py` — `find_and_save_connections(id, content, embedding)` background task

## Supabase client
- `backend/app/core/supabase.py` — `get_supabase() -> Client` singleton — **TO BE CREATED**
