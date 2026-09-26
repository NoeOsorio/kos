# Week 3 — RAG / Brain / Metaphor Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the "chat with your brain" feature — a RAG pipeline that retrieves the user's stored insights as Claude context, with two modes: Brain (grounded answers with citations) and Metaphor (cross-domain creative connections).

**Architecture:** The last user message is embedded and matched against the `insights` table via pgvector. Top 5 results are injected into the Claude system prompt as a knowledge base block. The chat route streams the response as normal, then emits a special `[SOURCES]` SSE event with the retrieved insight IDs. The frontend parses this event and renders a source citation list below the response.

**Tech Stack:** FastAPI + Anthropic SDK (backend), pgvector RPC (Supabase), React + TypeScript (frontend), pytest + vitest (tests)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `backend/supabase/migrations/002_search_insights.sql` | Create | Postgres function for RAG similarity search (no exclude_id) |
| `backend/app/services/rag.py` | Create | `search_knowledge(query, limit)` — embed + RPC |
| `backend/app/api/routes/chat.py` | Modify | Add `mode` param, inject RAG context, emit `[SOURCES]` event |
| `backend/tests/test_rag.py` | Create | Unit tests for rag service |
| `backend/tests/test_chat_rag.py` | Create | Unit tests for chat route prompt building and mode routing |
| `frontend/src/components/talk/ModeSelector.tsx` | Create | TALK / BRAIN / METAPHOR pill toggle |
| `frontend/src/components/talk/SourceCitations.tsx` | Create | Renders retrieved insight citations after a response |
| `frontend/src/pages/TalkPage.tsx` | Modify | Add mode state, pass to API, parse `[SOURCES]` event, render components |
| `frontend/src/__tests__/ModeSelector.test.tsx` | Create | Component tests |
| `frontend/src/__tests__/SourceCitations.test.tsx` | Create | Component tests |
| `frontend/src/__tests__/TalkPage.test.tsx` | Modify | Update existing test that checks `/api/talk` (now `/api/chat`) + add mode/sources tests |

---

## Task 1: DB migration — `search_insights` Postgres function

The existing `match_insights` RPC (used by the connections service) requires an `exclude_id` parameter. We need a version without it for RAG queries. This is a new function in a new migration.

**Files:**
- Create: `backend/supabase/migrations/002_search_insights.sql`

- [ ] **Step 1: Write the migration**

```sql
-- backend/supabase/migrations/002_search_insights.sql
-- Semantic similarity search for RAG — no exclude_id, tuned for broader recall

CREATE OR REPLACE FUNCTION search_insights(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  area text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    id,
    content,
    area,
    1 - (embedding <=> query_embedding) AS similarity
  FROM insights
  WHERE embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;
```

- [ ] **Step 2: Apply the migration to Supabase**

Open the Supabase SQL editor (or run via MCP `mcp__supabase__apply_migration`) and execute the file above. Verify no errors.

- [ ] **Step 3: Commit**

```bash
git add backend/supabase/migrations/002_search_insights.sql
git commit -m "feat: add search_insights pgvector function for RAG"
```

---

## Task 2: RAG service

**Files:**
- Create: `backend/app/services/rag.py`
- Create: `backend/tests/test_rag.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_rag.py
from unittest.mock import patch, MagicMock
from app.services.rag import search_knowledge


def test_search_knowledge_returns_insights():
    mock_sb = MagicMock()
    mock_sb.rpc.return_value.execute.return_value.data = [
        {"id": "ins-1", "content": "Feedback loops drive complexity", "area": "systems", "similarity": 0.82},
        {"id": "ins-2", "content": "Decision fatigue reduces quality", "area": "psychology", "similarity": 0.71},
    ]

    with patch("app.services.rag.embed", return_value=[0.1] * 1536), \
         patch("app.services.rag.get_supabase", return_value=mock_sb):
        results = search_knowledge("systems thinking")

    assert len(results) == 2
    assert results[0]["id"] == "ins-1"
    assert results[0]["similarity"] == 0.82
    mock_sb.rpc.assert_called_once_with("search_insights", {
        "query_embedding": [0.1] * 1536,
        "match_threshold": 0.6,
        "match_count": 5,
    })


def test_search_knowledge_respects_limit():
    mock_sb = MagicMock()
    mock_sb.rpc.return_value.execute.return_value.data = []

    with patch("app.services.rag.embed", return_value=[0.0] * 1536), \
         patch("app.services.rag.get_supabase", return_value=mock_sb):
        search_knowledge("query", limit=3)

    call_args = mock_sb.rpc.call_args[0][1]
    assert call_args["match_count"] == 3


def test_search_knowledge_returns_empty_on_rpc_exception():
    with patch("app.services.rag.embed", return_value=[0.1] * 1536), \
         patch("app.services.rag.get_supabase", side_effect=Exception("DB error")):
        results = search_knowledge("anything")

    assert results == []


def test_search_knowledge_returns_empty_when_no_results():
    mock_sb = MagicMock()
    mock_sb.rpc.return_value.execute.return_value.data = None

    with patch("app.services.rag.embed", return_value=[0.1] * 1536), \
         patch("app.services.rag.get_supabase", return_value=mock_sb):
        results = search_knowledge("obscure query")

    assert results == []
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_rag.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.rag'`

- [ ] **Step 3: Write the implementation**

```python
# backend/app/services/rag.py
from app.core.supabase import get_supabase
from app.services.embeddings import embed


def search_knowledge(query: str, limit: int = 5) -> list[dict]:
    """
    Embed query and return top matching insights from the knowledge base.
    Each result contains: id, content, area, similarity.
    Returns empty list on any error — callers should treat no results gracefully.
    """
    embedding = embed(query)
    sb = get_supabase()
    try:
        result = sb.rpc("search_insights", {
            "query_embedding": embedding,
            "match_threshold": 0.6,
            "match_count": limit,
        }).execute()
        return result.data or []
    except Exception:
        return []
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_rag.py -v
```

Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/rag.py backend/tests/test_rag.py
git commit -m "feat: add RAG search_knowledge service"
```

---

## Task 3: Extend `/api/chat` with mode + RAG injection

**Files:**
- Modify: `backend/app/api/routes/chat.py`
- Create: `backend/tests/test_chat_rag.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_chat_rag.py
from unittest.mock import patch, MagicMock
from app.api.routes.chat import _build_system_prompt


def test_build_system_prompt_socratic_has_no_knowledge_base():
    prompt = _build_system_prompt("socratic", [])
    assert "Socratic" in prompt
    assert "KNOWLEDGE BASE" not in prompt


def test_build_system_prompt_brain_injects_insight_content():
    sources = [
        {"id": "ins-1", "content": "Feedback loops drive complexity", "area": "systems"},
    ]
    prompt = _build_system_prompt("brain", sources)
    assert "KNOWLEDGE BASE" in prompt
    assert "Feedback loops drive complexity" in prompt
    assert "systems" in prompt


def test_build_system_prompt_brain_numbers_insights():
    sources = [
        {"id": "ins-1", "content": "First insight", "area": "a"},
        {"id": "ins-2", "content": "Second insight", "area": "b"},
    ]
    prompt = _build_system_prompt("brain", sources)
    assert "[1]" in prompt
    assert "[2]" in prompt


def test_build_system_prompt_metaphor_uses_metaphor_header():
    sources = [{"id": "ins-1", "content": "Stoic resilience", "area": "philosophy"}]
    prompt = _build_system_prompt("metaphor", sources)
    assert "Metaphor" in prompt
    assert "Stoic resilience" in prompt


def test_build_system_prompt_brain_with_no_sources_falls_back_to_socratic():
    prompt = _build_system_prompt("brain", [])
    assert "Socratic" in prompt
    assert "KNOWLEDGE BASE" not in prompt


def test_build_system_prompt_metaphor_with_no_sources_falls_back_to_socratic():
    prompt = _build_system_prompt("metaphor", [])
    assert "Socratic" in prompt


def test_chat_endpoint_socratic_does_not_call_search_knowledge(client):
    mock_stream = MagicMock()
    mock_stream.__enter__ = lambda s: s
    mock_stream.__exit__ = MagicMock(return_value=False)
    mock_stream.text_stream = iter([])

    mock_anthropic_client = MagicMock()
    mock_anthropic_client.messages.stream.return_value = mock_stream

    with patch("app.api.routes.chat.anthropic.Anthropic", return_value=mock_anthropic_client), \
         patch("app.api.routes.chat.search_knowledge") as mock_rag:
        client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "hi"}],
            "mode": "socratic",
        })

    mock_rag.assert_not_called()


def test_chat_endpoint_brain_calls_search_knowledge(client):
    mock_stream = MagicMock()
    mock_stream.__enter__ = lambda s: s
    mock_stream.__exit__ = MagicMock(return_value=False)
    mock_stream.text_stream = iter([])

    mock_anthropic_client = MagicMock()
    mock_anthropic_client.messages.stream.return_value = mock_stream

    with patch("app.api.routes.chat.anthropic.Anthropic", return_value=mock_anthropic_client), \
         patch("app.api.routes.chat.search_knowledge", return_value=[]) as mock_rag:
        client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "What do I know about systems?"}],
            "mode": "brain",
        })

    mock_rag.assert_called_once_with("What do I know about systems?")


def test_chat_endpoint_defaults_to_socratic_mode(client):
    mock_stream = MagicMock()
    mock_stream.__enter__ = lambda s: s
    mock_stream.__exit__ = MagicMock(return_value=False)
    mock_stream.text_stream = iter([])

    mock_anthropic_client = MagicMock()
    mock_anthropic_client.messages.stream.return_value = mock_stream

    with patch("app.api.routes.chat.anthropic.Anthropic", return_value=mock_anthropic_client), \
         patch("app.api.routes.chat.search_knowledge") as mock_rag:
        resp = client.post("/api/chat", json={
            "messages": [{"role": "user", "content": "hello"}],
            # no mode field
        })

    assert resp.status_code == 200
    mock_rag.assert_not_called()
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && python -m pytest tests/test_chat_rag.py -v
```

Expected: failures because `_build_system_prompt` and `search_knowledge` import don't exist yet.

- [ ] **Step 3: Rewrite `backend/app/api/routes/chat.py`**

```python
import json
from typing import Literal

import anthropic
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings
from app.services.rag import search_knowledge

router = APIRouter()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    mode: Literal["socratic", "brain", "metaphor"] = "socratic"


SOCRATIC_SYSTEM_PROMPT = """You are KOS — a Knowledge Operating System and Socratic learning companion.

Your role is NOT to answer questions directly. Instead, you help the user generate their own knowledge through questions.

When the user shares something they learned:
1. Ask one focused question that connects it to something they already know
2. Probe for personal application: "How would this change how you...?"
3. Find unexpected connections: "How does this relate to...?"
4. Extract insights in their own words

Never summarize. Never lecture. Ask, listen, connect.
Respond in the same language the user uses."""


BRAIN_SYSTEM_PROMPT = """You are KOS in Brain mode. You have access to the user's personal knowledge base below.

Answer by synthesizing FROM THE PROVIDED INSIGHTS. Cite inline using the format: [from: "<first 5 words of insight>"].
Be concise and grounded in the user's own knowledge.
Respond in the same language the user uses.

--- KNOWLEDGE BASE ---
{insights}
--- END KNOWLEDGE BASE ---"""


METAPHOR_SYSTEM_PROMPT = """You are KOS in Metaphor mode. Find surprising cross-domain connections.

You have the user's knowledge base below. Surface the most unexpected, non-obvious connection between what the user is saying and their stored insights. One metaphor per response. Explain WHY it is a real conceptual connection, not just wordplay.

Respond in the same language the user uses.

--- KNOWLEDGE BASE ---
{insights}
--- END KNOWLEDGE BASE ---"""


def _build_system_prompt(mode: str, sources: list[dict]) -> str:
    """Build the Claude system prompt based on mode and retrieved sources."""
    if mode == "socratic" or not sources:
        return SOCRATIC_SYSTEM_PROMPT
    insights_text = "\n".join(
        f"[{i + 1}] ({item.get('area', 'general')}) {item['content']}"
        for i, item in enumerate(sources)
    )
    template = BRAIN_SYSTEM_PROMPT if mode == "brain" else METAPHOR_SYSTEM_PROMPT
    return template.format(insights=insights_text)


@router.post("")
async def chat(request: ChatRequest):
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    sources: list[dict] = []
    if request.mode in ("brain", "metaphor") and request.messages:
        last_user = next(
            (m.content for m in reversed(request.messages) if m.role == "user"),
            "",
        )
        if last_user:
            sources = search_knowledge(last_user)

    system_prompt = _build_system_prompt(request.mode, sources)

    def stream():
        with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=system_prompt,
            messages=[m.model_dump() for m in request.messages],
        ) as s:
            for text in s.text_stream:
                yield f"data: {text}\n\n"
        if sources:
            sources_payload = json.dumps({
                "sources": [
                    {"id": src["id"], "content": src["content"], "area": src.get("area")}
                    for src in sources
                ]
            })
            yield f"data: [SOURCES]{sources_payload}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd backend && python -m pytest tests/test_chat_rag.py tests/test_rag.py -v
```

Expected: all PASSED

- [ ] **Step 5: Run full backend test suite to check for regressions**

```bash
cd backend && python -m pytest -v
```

Expected: all PASSED (the existing chat/analyze/logs/insights/graph tests should still pass)

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/chat.py backend/tests/test_chat_rag.py
git commit -m "feat: extend /api/chat with brain/metaphor RAG modes"
```

---

## Task 4: ModeSelector component

**Files:**
- Create: `frontend/src/components/talk/ModeSelector.tsx`
- Create: `frontend/src/__tests__/ModeSelector.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// frontend/src/__tests__/ModeSelector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import ModeSelector from '../components/talk/ModeSelector'

describe('ModeSelector', () => {
  it('renders TALK, BRAIN and METAPHOR buttons', () => {
    render(<ModeSelector mode="socratic" onChange={() => {}} />)
    expect(screen.getByText('TALK')).toBeInTheDocument()
    expect(screen.getByText('BRAIN')).toBeInTheDocument()
    expect(screen.getByText('METAPHOR')).toBeInTheDocument()
  })

  it('calls onChange with "brain" when BRAIN is clicked', () => {
    const onChange = vi.fn()
    render(<ModeSelector mode="socratic" onChange={onChange} />)
    fireEvent.click(screen.getByText('BRAIN'))
    expect(onChange).toHaveBeenCalledWith('brain')
  })

  it('calls onChange with "metaphor" when METAPHOR is clicked', () => {
    const onChange = vi.fn()
    render(<ModeSelector mode="brain" onChange={onChange} />)
    fireEvent.click(screen.getByText('METAPHOR'))
    expect(onChange).toHaveBeenCalledWith('metaphor')
  })

  it('calls onChange with "socratic" when TALK is clicked', () => {
    const onChange = vi.fn()
    render(<ModeSelector mode="brain" onChange={onChange} />)
    fireEvent.click(screen.getByText('TALK'))
    expect(onChange).toHaveBeenCalledWith('socratic')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --run src/__tests__/ModeSelector.test.tsx
```

Expected: `Cannot find module '../components/talk/ModeSelector'`

- [ ] **Step 3: Write the component**

```tsx
// frontend/src/components/talk/ModeSelector.tsx
interface Props {
  mode: 'socratic' | 'brain' | 'metaphor'
  onChange: (mode: 'socratic' | 'brain' | 'metaphor') => void
}

const MODES: { key: 'socratic' | 'brain' | 'metaphor'; label: string }[] = [
  { key: 'socratic', label: 'TALK' },
  { key: 'brain', label: 'BRAIN' },
  { key: 'metaphor', label: 'METAPHOR' },
]

export default function ModeSelector({ mode, onChange }: Props) {
  return (
    <div className="flex gap-2 justify-center mb-4">
      {MODES.map(m => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded border transition-colors"
          style={{
            background: mode === m.key ? 'rgba(139,92,246,0.3)' : 'rgba(8,8,20,0.7)',
            borderColor: mode === m.key ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
            color: mode === m.key ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.45)',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --run src/__tests__/ModeSelector.test.tsx
```

Expected: 4 PASSED

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/talk/ModeSelector.tsx frontend/src/__tests__/ModeSelector.test.tsx
git commit -m "feat: add ModeSelector component (TALK/BRAIN/METAPHOR)"
```

---

## Task 5: SourceCitations component

**Files:**
- Create: `frontend/src/components/talk/SourceCitations.tsx`
- Create: `frontend/src/__tests__/SourceCitations.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// frontend/src/__tests__/SourceCitations.test.tsx
import { render, screen } from '@testing-library/react'
import SourceCitations from '../components/talk/SourceCitations'

describe('SourceCitations', () => {
  it('renders nothing when sources array is empty', () => {
    const { container } = render(<SourceCitations sources={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders source content', () => {
    render(<SourceCitations sources={[{ id: 'ins-1', content: 'Feedback loops drive complexity', area: 'systems' }]} />)
    expect(screen.getByText(/Feedback loops drive complexity/)).toBeInTheDocument()
  })

  it('renders area label when area is present', () => {
    render(<SourceCitations sources={[{ id: 'ins-1', content: 'Stoic resilience is key', area: 'philosophy' }]} />)
    expect(screen.getByText(/\[philosophy\]/)).toBeInTheDocument()
  })

  it('does not render area bracket when area is null', () => {
    render(<SourceCitations sources={[{ id: 'ins-1', content: 'Just content', area: null }]} />)
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
  })

  it('truncates content longer than 80 characters', () => {
    const long = 'A'.repeat(100)
    render(<SourceCitations sources={[{ id: '1', content: long, area: null }]} />)
    expect(screen.getByText('A'.repeat(80) + '…')).toBeInTheDocument()
  })

  it('does not truncate content of exactly 80 characters', () => {
    const exact = 'B'.repeat(80)
    render(<SourceCitations sources={[{ id: '1', content: exact, area: null }]} />)
    expect(screen.getByText(exact)).toBeInTheDocument()
  })

  it('renders the "From your knowledge base" header', () => {
    render(<SourceCitations sources={[{ id: '1', content: 'x', area: null }]} />)
    expect(screen.getByText(/From your knowledge base/i)).toBeInTheDocument()
  })

  it('renders multiple sources', () => {
    const sources = [
      { id: 'ins-1', content: 'First insight here', area: 'a' },
      { id: 'ins-2', content: 'Second insight here', area: 'b' },
    ]
    render(<SourceCitations sources={sources} />)
    expect(screen.getByText(/First insight here/)).toBeInTheDocument()
    expect(screen.getByText(/Second insight here/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npm test -- --run src/__tests__/SourceCitations.test.tsx
```

Expected: `Cannot find module '../components/talk/SourceCitations'`

- [ ] **Step 3: Write the component**

```tsx
// frontend/src/components/talk/SourceCitations.tsx
export interface Source {
  id: string
  content: string
  area: string | null
}

interface Props {
  sources: Source[]
}

export default function SourceCitations({ sources }: Props) {
  if (sources.length === 0) return null

  return (
    <div className="mt-3 px-4">
      <p className="font-mono text-[9px] tracking-widest uppercase text-purple-soft opacity-40 mb-2">
        From your knowledge base
      </p>
      <div className="flex flex-col gap-1">
        {sources.map(s => (
          <div
            key={s.id}
            className="font-mono text-[10px] text-purple-soft opacity-60 border border-purple-primary/15 rounded px-2 py-1 bg-bg-card/30"
          >
            {s.area && (
              <span className="text-purple-bright opacity-70 mr-2">[{s.area}]</span>
            )}
            {s.content.length > 80 ? s.content.slice(0, 80) + '…' : s.content}
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npm test -- --run src/__tests__/SourceCitations.test.tsx
```

Expected: 8 PASSED

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/talk/SourceCitations.tsx frontend/src/__tests__/SourceCitations.test.tsx
git commit -m "feat: add SourceCitations component"
```

---

## Task 6: Wire mode + sources into TalkPage

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`
- Modify: `frontend/src/__tests__/TalkPage.test.tsx`

- [ ] **Step 1: Update TalkPage tests**

Replace the full contents of `frontend/src/__tests__/TalkPage.test.tsx` with:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KOSProvider } from '../context/KOSContext'
import TalkPage from '../pages/TalkPage'

global.fetch = vi.fn()

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

function makeStreamFetch(tokens: string[], sources?: object) {
  return vi.fn().mockResolvedValue({
    ok: true,
    body: {
      getReader: () => {
        const parts = [
          ...tokens.map(t => `data: ${t}\n\n`),
          ...(sources ? [`data: [SOURCES]${JSON.stringify(sources)}\n\n`] : []),
          'data: [DONE]\n\n',
        ]
        let i = 0
        return {
          read: async () => {
            if (i >= parts.length) return { done: true, value: undefined }
            return { done: false, value: new TextEncoder().encode(parts[i++]) }
          },
        }
      },
    },
  })
}

describe('TalkPage', () => {
  it('renders the text input', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('renders the hold-to-talk hint', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText(/hold to talk/i)).toBeInTheDocument()
  })

  it('renders STANDBY status label', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText('STANDBY')).toBeInTheDocument()
  })

  it('renders mode selector with TALK, BRAIN, METAPHOR', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText('TALK')).toBeInTheDocument()
    expect(screen.getByText('BRAIN')).toBeInTheDocument()
    expect(screen.getByText('METAPHOR')).toBeInTheDocument()
  })

  it('sends POST /api/chat with mode on Enter', async () => {
    const mockFetch = makeStreamFetch(['Hello from KOS'])
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'What is this?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      const chatCall = (mockFetch.mock.calls as [string, { body: string }][])
        .find(c => c[0] === '/api/chat')
      expect(chatCall).toBeDefined()
      const body = JSON.parse(chatCall![1].body)
      expect(body.mode).toBe('socratic')
    })
  })

  it('sends brain mode when BRAIN is selected', async () => {
    const mockFetch = makeStreamFetch(['Answer from brain'])
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    fireEvent.click(screen.getByText('BRAIN'))
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'What do I know?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      const chatCall = (mockFetch.mock.calls as [string, { body: string }][])
        .find(c => c[0] === '/api/chat')
      const body = JSON.parse(chatCall![1].body)
      expect(body.mode).toBe('brain')
    })
  })

  it('handles API error gracefully (no crash)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('STANDBY')).toBeInTheDocument()
    })
  })

  it('calls /api/analyze after a successful /api/chat response', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        body: {
          getReader: () => {
            const parts = ['data: Tell me more\n\n', 'data: [DONE]\n\n']
            let i = 0
            return {
              read: async () =>
                i >= parts.length
                  ? { done: true, value: undefined }
                  : { done: false, value: new TextEncoder().encode(parts[i++]) },
            }
          },
        },
      })
      .mockResolvedValue({ ok: true, json: async () => ({ new_topics: [], similar: [] }) })
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'I read about Stoicism' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      const calls = (mockFetch.mock.calls as [string][]).map(c => c[0])
      expect(calls).toContain('/api/analyze')
    })
  })
})
```

- [ ] **Step 2: Run updated tests to verify they fail on the new ones**

```bash
cd frontend && npm test -- --run src/__tests__/TalkPage.test.tsx
```

Expected: "renders mode selector" and "sends brain mode" tests FAIL; existing tests PASS

- [ ] **Step 3: Update TalkPage.tsx**

Add these imports at the top of the existing imports:

```tsx
import ModeSelector from '../components/talk/ModeSelector'
import SourceCitations, { type Source } from '../components/talk/SourceCitations'
```

Add these two state variables inside `export default function TalkPage()`, after the existing `useState` declarations:

```tsx
const [mode, setMode] = useState<'socratic' | 'brain' | 'metaphor'>('socratic')
const [sources, setSources] = useState<Source[]>([])
```

In `handleSend`, find this block at the start:

```tsx
abortControllerRef.current?.abort()
const controller = new AbortController()
abortControllerRef.current = controller
send()
clearTranscript()
clearAll()
```

Add `setSources([])` after `clearAll()`:

```tsx
abortControllerRef.current?.abort()
const controller = new AbortController()
abortControllerRef.current = controller
send()
clearTranscript()
clearAll()
setSources([])
```

In `handleSend`, find the fetch call to `/api/chat`:

```tsx
body: JSON.stringify({ messages: newMessages }),
```

Replace with:

```tsx
body: JSON.stringify({ messages: newMessages, mode }),
```

In the SSE parsing loop, find:

```tsx
for (const part of parts) {
  if (!part.startsWith('data: ')) continue
  const token = part.slice(6)
  if (token === '[DONE]') break
  fullResponse += token
  setTranscript(fullResponse)
}
```

Replace with:

```tsx
for (const part of parts) {
  if (!part.startsWith('data: ')) continue
  const token = part.slice(6)
  if (token === '[DONE]') break
  if (token.startsWith('[SOURCES]')) {
    try {
      const payload = JSON.parse(token.slice(9))
      setSources(payload.sources ?? [])
    } catch {
      // ignore malformed sources payload
    }
    continue
  }
  fullResponse += token
  setTranscript(fullResponse)
}
```

In the JSX, find the `{/* State label */}` paragraph block and add `<ModeSelector>` above it:

```tsx
<ModeSelector mode={mode} onChange={m => { setMode(m); setSources([]) }} />

{/* State label */}
```

After the closing `</div>` of the `TalkInput` wrapper (`<div className="z-10 w-full">`), add:

```tsx
<SourceCitations sources={sources} />
```

- [ ] **Step 4: Run all frontend tests to verify everything passes**

```bash
cd frontend && npm test -- --run
```

Expected: all PASSED

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx frontend/src/__tests__/TalkPage.test.tsx
git commit -m "feat: wire mode selector and source citations into TalkPage"
```

---

## Spec Coverage Check

| Week 3 Requirement | Task |
|--------------------|------|
| Embeddings with pgvector in Supabase | Already done (Task 0 — pre-existing) |
| RAG pipeline — top 5 insights → Claude context | Tasks 1, 2, 3 |
| Metaphor mode for cross-domain insights | Task 3 (metaphor system prompt + mode routing) |
| Responses with source citation | Tasks 3, 5, 6 (SOURCES SSE event + SourceCitations component) |

All four requirements are covered.
