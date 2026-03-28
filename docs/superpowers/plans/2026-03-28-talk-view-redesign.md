# Talk View Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mic button with a walkie-talkie press-and-hold nebula, add floating knowledge cards that detect and surface topics from conversation, and keep the text input for silent use.

**Architecture:** Two parallel backend endpoints (`/api/analyze` for topic detection, `/api/insights/topic` for saving) are called from `TalkPage` after each AI response completes. The frontend manages cards in a new `useKnowledgeCards` hook and renders them in a new `KnowledgeCards` component that floats over the visualizer on desktop and slides up as a bottom sheet on mobile.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (frontend), FastAPI + Python 3.12 + Anthropic SDK `claude-haiku-4-5` (backend), Vitest + Testing Library (frontend tests), pytest + FastAPI TestClient (backend tests)

---

## File Map

**New files:**
- `backend/app/api/routes/analyze.py` — `/api/analyze` POST endpoint
- `frontend/src/hooks/useIsMobile.ts` — reactive mobile breakpoint hook
- `frontend/src/hooks/useKnowledgeCards.ts` — card list state, auto-dismiss, save
- `frontend/src/components/talk/KnowledgeCards.tsx` — card UI, desktop float + mobile sheet

**Modified files:**
- `backend/app/api/routes/insights.py` — add `POST /api/insights/topic` route
- `backend/app/main.py` — register `/api/analyze` router
- `frontend/src/components/talk/ParticleNebulaCanvas.tsx` — accept pointer event props
- `frontend/src/components/talk/TalkInput.tsx` — remove mic button, add hint label
- `frontend/src/pages/TalkPage.tsx` — wire pointer events, call `/api/analyze`, render `KnowledgeCards`
- `frontend/src/__tests__/TalkInput.test.tsx` — update tests for removed mic button
- `frontend/src/__tests__/TalkPage.test.tsx` — update tests, add analyze call test

---

## Task 1: Backend — `/api/analyze` endpoint

**Files:**
- Create: `backend/app/api/routes/analyze.py`
- Create: `backend/tests/test_analyze.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_analyze.py
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_analyze.py -v
```
Expected: `ERROR` — `404 Not Found` or import errors (endpoint not registered yet).

- [ ] **Step 3: Create the endpoint**

```python
# backend/app/api/routes/analyze.py
import json
from fastapi import APIRouter
from pydantic import BaseModel
import anthropic

from app.core.config import settings

router = APIRouter()

# Hardcoded knowledge base used for similarity until Supabase/pgvector is wired
_KNOWLEDGE_BASE = [
    {"id": "node-dw", "title": "Deep Work", "excerpt": "Concentrated, distraction-free work produces rare and valuable output."},
    {"id": "node-fs", "title": "Flow State", "excerpt": "Peak performance emerges when challenge and skill are perfectly balanced."},
    {"id": "node-tb", "title": "Time Blocking", "excerpt": "Scheduling dedicated time blocks turns vague intention into reliable output."},
    {"id": "node-st", "title": "Stoicism", "excerpt": "Focus only on what is within your control; accept everything else with equanimity."},
    {"id": "node-fp", "title": "First Principles", "excerpt": "Break problems to fundamental truths and reason up rather than by analogy."},
    {"id": "node-mm", "title": "Mental Models", "excerpt": "A diverse toolkit of mental models lets you see patterns across disciplines."},
    {"id": "node-sb", "title": "Second Brain", "excerpt": "Externalizing ideas into a trusted system frees mental RAM for higher-order thinking."},
    {"id": "node-zk", "title": "Zettelkasten", "excerpt": "Notes connected by idea relationships rather than folders form an emergent knowledge graph."},
]

_EXTRACTION_PROMPT = """Extract the main knowledge topics from this conversation exchange.

User message: {message}
AI response: {response}

Return a JSON object with this exact shape:
{{
  "new_topics": [
    {{"name": "Topic Name", "description": "One sentence description"}}
  ],
  "similar_keywords": ["keyword1", "keyword2"]
}}

Rules:
- Only include concrete knowledge topics (concepts, frameworks, philosophies, skills). Skip small talk.
- Maximum 2 new_topics. If no clear topic exists, return empty list.
- similar_keywords: 2-4 single words useful for matching existing knowledge. Empty list if no topics.
- Return only valid JSON, nothing else."""


class AnalyzeRequest(BaseModel):
    message: str
    response: str


class TopicItem(BaseModel):
    name: str
    description: str


class SimilarItem(BaseModel):
    id: str
    title: str
    excerpt: str


class AnalyzeResponse(BaseModel):
    new_topics: list[TopicItem]
    similar: list[SimilarItem]


def _find_similar(keywords: list[str]) -> list[SimilarItem]:
    """Keyword match against the knowledge base. Top 3 matches."""
    if not keywords:
        return []
    lower_keywords = [k.lower() for k in keywords]
    scored: list[tuple[int, dict]] = []
    for item in _KNOWLEDGE_BASE:
        searchable = (item["title"] + " " + item["excerpt"]).lower()
        score = sum(1 for kw in lower_keywords if kw in searchable)
        if score > 0:
            scored.append((score, item))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [SimilarItem(**item) for _, item in scored[:3]]


@router.post("", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    # Skip trivially short exchanges
    if len(request.message.strip()) < 10:
        return AnalyzeResponse(new_topics=[], similar=[])

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    prompt = _EXTRACTION_PROMPT.format(
        message=request.message,
        response=request.response,
    )

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        raw = json.loads(message.content[0].text)
        new_topics = [TopicItem(**t) for t in raw.get("new_topics", [])]
        similar = _find_similar(raw.get("similar_keywords", []))
    except (json.JSONDecodeError, KeyError, TypeError):
        return AnalyzeResponse(new_topics=[], similar=[])

    return AnalyzeResponse(new_topics=new_topics, similar=similar)
```

- [ ] **Step 4: Register the router in `main.py`**

In `backend/app/main.py`, add to the imports and include call:

```python
from app.api.routes import chat, logs, insights, graph, talk, analyze  # add analyze

# after existing include_router calls:
app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
```

- [ ] **Step 5: Run tests**

```bash
cd backend && python -m pytest tests/test_analyze.py -v
```
Expected: all 5 pass. The `test_analyze_new_topics_have_required_fields` and `test_analyze_similar_have_required_fields` tests make live Anthropic calls — if `ANTHROPIC_API_KEY` is not set in the shell, skip those two with `-k "not topics and not similar"` and verify the shape tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/routes/analyze.py backend/app/main.py backend/tests/test_analyze.py
git commit -m "feat: add /api/analyze endpoint for topic extraction and knowledge matching"
```

---

## Task 2: Backend — `POST /api/insights/topic`

**Files:**
- Modify: `backend/app/api/routes/insights.py`
- Create: `backend/tests/test_insights_topic.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_insights_topic.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_save_topic_returns_201():
    response = client.post("/api/insights/topic", json={
        "title": "Stoicism",
        "description": "Philosophy of virtue and control"
    })
    assert response.status_code == 201


def test_save_topic_returns_saved_data():
    response = client.post("/api/insights/topic", json={
        "title": "Stoicism",
        "description": "Philosophy of virtue and control"
    })
    data = response.json()
    assert data["title"] == "Stoicism"
    assert data["description"] == "Philosophy of virtue and control"
    assert "id" in data


def test_save_topic_requires_title():
    response = client.post("/api/insights/topic", json={
        "description": "Missing title"
    })
    assert response.status_code == 422


def test_save_topic_requires_description():
    response = client.post("/api/insights/topic", json={
        "title": "Missing description"
    })
    assert response.status_code == 422
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd backend && python -m pytest tests/test_insights_topic.py -v
```
Expected: `FAIL` — 404 on the new route.

- [ ] **Step 3: Add the route to `insights.py`**

Add after the existing routes in `backend/app/api/routes/insights.py`:

```python
class TopicInsightCreate(BaseModel):
    title: str
    description: str


class TopicInsightResponse(BaseModel):
    id: str
    title: str
    description: str


@router.post("/topic", response_model=TopicInsightResponse, status_code=201)
async def save_topic_insight(insight: TopicInsightCreate) -> TopicInsightResponse:
    # TODO: generate embedding + save to Supabase
    return TopicInsightResponse(
        id="placeholder-" + insight.title.lower().replace(" ", "-"),
        title=insight.title,
        description=insight.description,
    )
```

- [ ] **Step 4: Run tests**

```bash
cd backend && python -m pytest tests/test_insights_topic.py -v
```
Expected: all 4 pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/routes/insights.py backend/tests/test_insights_topic.py
git commit -m "feat: add POST /api/insights/topic for saving conversation-detected topics"
```

---

## Task 3: Frontend — `useIsMobile` hook

**Files:**
- Create: `frontend/src/hooks/useIsMobile.ts`
- Create: `frontend/src/__tests__/useIsMobile.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/src/__tests__/useIsMobile.test.ts
import { renderHook, act } from '@testing-library/react'
import { useIsMobile } from '../hooks/useIsMobile'

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true, configurable: true, value: originalInnerWidth,
    })
  })

  it('returns true when window width is below 768', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true, configurable: true, value: 375,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when window width is 768 or above', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true, configurable: true, value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when window is resized', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true, configurable: true, value: 1024,
    })
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true, configurable: true, value: 375,
      })
      window.dispatchEvent(new Event('resize'))
    })

    expect(result.current).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/useIsMobile.test.ts
```
Expected: `FAIL` — cannot find module `../hooks/useIsMobile`.

- [ ] **Step 3: Implement the hook**

```typescript
// frontend/src/hooks/useIsMobile.ts
import { useState, useEffect } from 'react'

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint)

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < breakpoint)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return isMobile
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/useIsMobile.test.ts
```
Expected: all 3 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useIsMobile.ts frontend/src/__tests__/useIsMobile.test.ts
git commit -m "feat: add useIsMobile hook with resize listener"
```

---

## Task 4: Frontend — `useKnowledgeCards` hook

**Files:**
- Create: `frontend/src/hooks/useKnowledgeCards.ts`
- Create: `frontend/src/__tests__/useKnowledgeCards.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/src/__tests__/useKnowledgeCards.test.ts
import { renderHook, act } from '@testing-library/react'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'

describe('useKnowledgeCards', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with no cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    expect(result.current.cards).toHaveLength(0)
  })

  it('addCards adds new topic and similar cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [{ id: 'node-mm', title: 'Mental Models', excerpt: 'Patterns across disciplines' }],
      )
    })
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0]).toMatchObject({ type: 'new', name: 'Stoicism' })
    expect(result.current.cards[1]).toMatchObject({ type: 'similar', title: 'Mental Models' })
  })

  it('dismiss removes a card by id', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [],
      )
    })
    const id = result.current.cards[0].id
    act(() => { result.current.dismiss(id) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('cards auto-dismiss after 8 seconds', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('caps visible cards at 3, dismissing oldest first', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [
          { name: 'Topic A', description: 'Desc A' },
          { name: 'Topic B', description: 'Desc B' },
          { name: 'Topic C', description: 'Desc C' },
          { name: 'Topic D', description: 'Desc D' },
        ],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(3)
    expect(result.current.cards[0].name).toBe('Topic B')
  })

  it('clearAll removes all cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'A', description: 'a' }, { name: 'B', description: 'b' }],
        [],
      )
    })
    act(() => { result.current.clearAll() })
    expect(result.current.cards).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/useKnowledgeCards.test.ts
```
Expected: `FAIL` — cannot find module.

- [ ] **Step 3: Implement the hook**

```typescript
// frontend/src/hooks/useKnowledgeCards.ts
import { useState, useCallback, useRef } from 'react'

export interface NewTopicCard {
  id: string
  type: 'new'
  name: string
  description: string
}

export interface SimilarCard {
  id: string
  type: 'similar'
  insightId: string
  title: string
  excerpt: string
}

export type KnowledgeCard = NewTopicCard | SimilarCard

interface TopicItem { name: string; description: string }
interface SimilarItem { id: string; title: string; excerpt: string }

const MAX_CARDS = 3
const AUTO_DISMISS_MS = 8000

export function useKnowledgeCards() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  const scheduleAutoDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    timersRef.current.set(id, timer)
  }, [dismiss])

  const addCards = useCallback((
    newTopics: TopicItem[],
    similar: SimilarItem[],
  ) => {
    const incoming: KnowledgeCard[] = [
      ...newTopics.map((t): NewTopicCard => ({
        id: `new-${t.name}-${Date.now()}`,
        type: 'new',
        name: t.name,
        description: t.description,
      })),
      ...similar.map((s): SimilarCard => ({
        id: `similar-${s.id}-${Date.now()}`,
        type: 'similar',
        insightId: s.id,
        title: s.title,
        excerpt: s.excerpt,
      })),
    ]

    if (incoming.length === 0) return

    setCards(prev => {
      const combined = [...prev, ...incoming]
      const capped = combined.slice(-MAX_CARDS)
      // Cancel timers for dropped cards
      const keptIds = new Set(capped.map(c => c.id))
      combined.forEach(c => {
        if (!keptIds.has(c.id)) {
          const t = timersRef.current.get(c.id)
          if (t) { clearTimeout(t); timersRef.current.delete(c.id) }
        }
      })
      return capped
    })

    incoming.slice(-MAX_CARDS).forEach(c => scheduleAutoDismiss(c.id))
  }, [scheduleAutoDismiss])

  const clearAll = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current.clear()
    setCards([])
  }, [])

  return { cards, addCards, dismiss, clearAll }
}
```

- [ ] **Step 4: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/useKnowledgeCards.test.ts
```
Expected: all 6 pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useKnowledgeCards.ts frontend/src/__tests__/useKnowledgeCards.test.ts
git commit -m "feat: add useKnowledgeCards hook with auto-dismiss and max-3 cap"
```

---

## Task 5: Frontend — `KnowledgeCards` component

**Files:**
- Create: `frontend/src/components/talk/KnowledgeCards.tsx`
- Create: `frontend/src/__tests__/KnowledgeCards.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// frontend/src/__tests__/KnowledgeCards.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { KnowledgeCard } from '../hooks/useKnowledgeCards'

const newCard: KnowledgeCard = {
  id: 'new-stoicism-1',
  type: 'new',
  name: 'Stoicism',
  description: 'Philosophy of virtue and control',
}

const similarCard: KnowledgeCard = {
  id: 'similar-node-mm-1',
  type: 'similar',
  insightId: 'node-mm',
  title: 'Mental Models',
  excerpt: 'Patterns across disciplines',
}

const noop = vi.fn()

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('KnowledgeCards', () => {
  it('renders nothing when cards array is empty', () => {
    const { container } = wrap(
      <KnowledgeCards cards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a new topic card with topic name', () => {
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Philosophy of virtue and control')).toBeInTheDocument()
  })

  it('renders "Save to brain" button on new topic card', () => {
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByRole('button', { name: /save to brain/i })).toBeInTheDocument()
  })

  it('calls onSave with card when save button clicked', () => {
    const onSave = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save to brain/i }))
    expect(onSave).toHaveBeenCalledWith(newCard)
  })

  it('calls onDismiss with card id when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={onDismiss} onSave={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledWith('new-stoicism-1')
  })

  it('renders a similar card with title and excerpt', () => {
    wrap(<KnowledgeCards cards={[similarCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
    expect(screen.getByText('Patterns across disciplines')).toBeInTheDocument()
  })

  it('renders multiple cards', () => {
    wrap(
      <KnowledgeCards cards={[newCard, similarCard]} onDismiss={noop} onSave={noop} />
    )
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeCards.test.tsx
```
Expected: `FAIL` — cannot find module.

- [ ] **Step 3: Implement the component**

```typescript
// frontend/src/components/talk/KnowledgeCards.tsx
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { KnowledgeCard, NewTopicCard, SimilarCard } from '../../hooks/useKnowledgeCards'

interface KnowledgeCardsProps {
  cards: KnowledgeCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}

function NewTopicCardView({
  card,
  onDismiss,
  onSave,
}: {
  card: NewTopicCard
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  return (
    <div
      className="animate-slide-in-right"
      style={{
        background: 'rgba(8,8,20,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139,92,246,0.55)',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: '0 6px 24px rgba(139,92,246,0.25)',
        width: '185px',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '8px', color: 'rgba(139,92,246,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          New topic
        </span>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(139,92,246,0.9)', boxShadow: '0 0 5px rgba(139,92,246,0.7)' }} />
      </div>
      <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(240,238,255,0.98)', marginBottom: '3px' }}>{card.name}</p>
      <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.55)', marginBottom: '10px', lineHeight: 1.4 }}>{card.description}</p>
      <div className="flex gap-1">
        <button
          aria-label="save to brain"
          onClick={() => onSave(card)}
          style={{
            flex: 1, padding: '5px 0',
            background: 'rgba(139,92,246,0.35)',
            border: '1px solid rgba(139,92,246,0.6)',
            borderRadius: '8px',
            fontSize: '10px', color: 'rgba(196,181,253,1.0)', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save to brain
        </button>
        <button
          aria-label="dismiss"
          onClick={() => onDismiss(card.id)}
          style={{
            width: '28px', height: '28px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontSize: '11px', color: 'rgba(196,181,253,0.35)',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function SimilarCardView({
  card,
  onDismiss,
}: {
  card: SimilarCard
  onDismiss: (id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div
      className="animate-slide-in-right"
      style={{
        background: 'rgba(8,8,20,0.87)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(109,40,217,0.38)',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: '0 4px 16px rgba(109,40,217,0.12)',
        width: '185px',
        cursor: 'pointer',
      }}
      onClick={() => navigate('/explore')}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '8px', color: 'rgba(109,40,217,0.85)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          In your brain
        </span>
        <button
          aria-label="dismiss"
          onClick={e => { e.stopPropagation(); onDismiss(card.id) }}
          style={{ background: 'none', border: 'none', fontSize: '10px', color: 'rgba(196,181,253,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,238,255,0.88)', marginBottom: '3px' }}>{card.title}</p>
      <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', fontStyle: 'italic', lineHeight: 1.4 }}>{card.excerpt}</p>
      <p style={{ marginTop: '6px', fontSize: '8px', color: 'rgba(109,40,217,0.6)' }}>Tap to explore →</p>
    </div>
  )
}

export default function KnowledgeCards({ cards, onDismiss, onSave }: KnowledgeCardsProps) {
  const isMobile = useIsMobile()

  if (cards.length === 0) return null

  const cardList = (
    <div className="flex flex-col gap-2">
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(8,8,20,0.97)',
          borderTop: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '12px 12px 0 0',
          padding: '12px 16px 20px',
        }}
      >
        <div style={{ width: '28px', height: '3px', borderRadius: '2px', background: 'rgba(139,92,246,0.3)', margin: '0 auto 12px' }} />
        {cardList}
      </div>
    )
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add slide-in animation to Tailwind config**

Check if `frontend/tailwind.config.js` (or `.ts`) exists. Open it. Add a `slide-in-right` keyframe:

```javascript
// In the extend.keyframes section:
'slide-in-right': {
  '0%': { transform: 'translateX(100%)', opacity: '0' },
  '100%': { transform: 'translateX(0)', opacity: '1' },
},
// In extend.animation:
'slide-in-right': 'slide-in-right 0.25s ease-out',
```

If no Tailwind config exists, create `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Run tests**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeCards.test.tsx
```
Expected: all 7 pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/talk/KnowledgeCards.tsx frontend/src/__tests__/KnowledgeCards.test.tsx
git commit -m "feat: add KnowledgeCards component with desktop float and mobile bottom sheet"
```

---

## Task 6: Frontend — Walkie-talkie nebula interaction

**Files:**
- Modify: `frontend/src/components/talk/ParticleNebulaCanvas.tsx`
- Modify: `frontend/src/pages/TalkPage.tsx`

- [ ] **Step 1: Write failing test for the pointer capture zone**

Add to `frontend/src/__tests__/TalkPage.test.tsx`:

```typescript
it('renders the press-to-talk zone', () => {
  render(<Wrapper><TalkPage /></Wrapper>)
  expect(screen.getByRole('button', { name: /hold to talk/i })).toBeInTheDocument()
})
```

Run to confirm it fails:
```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx -t "hold to talk"
```
Expected: `FAIL`.

- [ ] **Step 2: Add pointer event props to `ParticleNebulaCanvas`**

In `frontend/src/components/talk/ParticleNebulaCanvas.tsx`, update the props interface and canvas element:

```typescript
// Add to the interface:
interface ParticleNebulaCanvasProps {
  size: number
  onPointerDown?: React.PointerEventHandler<HTMLCanvasElement>
  onPointerUp?: React.PointerEventHandler<HTMLCanvasElement>
  onPointerCancel?: React.PointerEventHandler<HTMLCanvasElement>
}
```

Update the canvas return to remove `pointer-events-none` and pass through the handlers:

```typescript
// Replace the return statement:
return (
  <canvas
    ref={canvasRef}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerCancel={onPointerCancel}
    className="absolute inset-0"
    style={{ zIndex: 4, cursor: 'pointer', touchAction: 'none' }}
  />
)
```

Also destructure the new props in the function signature:

```typescript
function ParticleNebulaCanvas({ size, onPointerDown, onPointerUp, onPointerCancel }, ref) {
```

- [ ] **Step 3: Add the press capture zone and REC overlay in `TalkPage`**

In `frontend/src/pages/TalkPage.tsx`, update the visualizer container section to add the REC overlay and wire pointer events. Replace the visualizer `<div>` block:

```typescript
{/* Visualizer container */}
<div
  className="relative flex items-center justify-center shrink-0"
  style={{ width: vizSize, height: vizSize }}
>
  <WaveCanvas ref={waveRef} size={vizSize} />
  <ParticleNebulaCanvas
    ref={particleRef}
    size={vizSize}
    onPointerDown={handleNebulaPointerDown}
    onPointerUp={handleNebulaPointerUp}
    onPointerCancel={handleNebulaPointerUp}
  />
  <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
  <HUDRingsSVG ringSpeed={visualParams.ringSpeed} size={vizSize} />

  {/* REC indicator — visible only during LISTENING */}
  {talkState === 'LISTENING' && (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div className="flex items-center gap-1">
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }} />
        <span style={{ fontSize: '10px', color: 'rgba(196,181,253,0.85)', letterSpacing: '2px', fontFamily: 'monospace' }}>REC</span>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 4: Add the handler functions in `TalkPage`**

In `TalkPage.tsx`, add these two handler functions alongside `handleSend`:

```typescript
async function handleNebulaPointerDown() {
  const ok = await startMic()
  if (ok) {
    activateMic()
    if (speechSupported) startListening()
  }
}

async function handleNebulaPointerUp() {
  stopMic()
  stopListening()
  const text = (speechTranscript || inputText).trim()
  if (text) await handleSend(text)
}
```

Note: `speechTranscript` is what `useSpeechRecognition` returns as `transcript`. It is already destructured at the top of `TalkPage` as:
```typescript
const { isSupported: speechSupported, transcript: speechTranscript, ... } = useSpeechRecognition()
```

- [ ] **Step 5: Add hint label below the state label**

In `TalkPage.tsx`, replace the state label `<p>` with:

```typescript
{/* State label */}
<p
  className="font-mono text-[10px] tracking-[3px] uppercase mt-3 z-10"
  style={{ color: 'rgba(196,181,253,0.5)' }}
>
  {talkState}
</p>
<p
  className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10"
  style={{ color: 'rgba(196,181,253,0.2)' }}
>
  Hold to talk · Release to send
</p>
```

- [ ] **Step 6: Add PROCESSING dashed ring overlay**

In `TalkPage.tsx`, add a second overlay for the PROCESSING state, directly below the LISTENING overlay:

```typescript
{/* Dashed spinning ring — visible during PROCESSING */}
{talkState === 'PROCESSING' && (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    style={{ zIndex: 10 }}
  >
    <div
      style={{
        width: vizSize * 0.7,
        height: vizSize * 0.7,
        borderRadius: '50%',
        border: '2px dashed rgba(139,92,246,0.5)',
        borderTopColor: 'rgba(139,92,246,0.9)',
        animation: 'spin 1s linear infinite',
      }}
    />
  </div>
)}
```

Add the `spin` keyframe to `index.css` (or whatever global CSS file exists — check `frontend/src/`):

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

- [ ] **Step 7: Add on-press ripple overlay**

Add a third overlay that plays a one-shot ripple when the nebula is first pressed. Add a piece of state to track it:

```typescript
const [showRipple, setShowRipple] = useState(false)
```

Update `handleNebulaPointerDown` to trigger the ripple:

```typescript
async function handleNebulaPointerDown() {
  setShowRipple(true)
  setTimeout(() => setShowRipple(false), 400)
  const ok = await startMic()
  if (ok) {
    activateMic()
    if (speechSupported) startListening()
  }
}
```

Add the ripple overlay inside the visualizer container:

```typescript
{/* Ripple burst — one-shot on press */}
{showRipple && (
  <div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    style={{ zIndex: 9 }}
  >
    <div
      style={{
        width: vizSize * 0.6,
        height: vizSize * 0.6,
        borderRadius: '50%',
        border: '2px solid rgba(139,92,246,0.7)',
        animation: 'ripple-out 0.4s ease-out forwards',
      }}
    />
  </div>
)}
```

Add the `ripple-out` keyframe to the same global CSS file:

```css
@keyframes ripple-out {
  from { transform: scale(0.8); opacity: 1; }
  to   { transform: scale(1.4); opacity: 0; }
}
```

- [ ] **Step 9: Run the new TalkPage test**

```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx -t "hold to talk"
```

The `hold to talk` test checks `screen.getByRole('button', { name: /hold to talk/i })`. The REC overlay and hint label are not buttons — so this test won't work as written. Instead, verify the hint text is rendered. Update the test to:

```typescript
it('renders the hold-to-talk hint', () => {
  render(<Wrapper><TalkPage /></Wrapper>)
  expect(screen.getByText(/hold to talk/i)).toBeInTheDocument()
})
```

Run again:
```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx -t "hold to talk"
```
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/components/talk/ParticleNebulaCanvas.tsx frontend/src/pages/TalkPage.tsx
git commit -m "feat: walkie-talkie nebula — pointer events, REC/PROCESSING overlays, ripple burst"
```

---

## Task 7: Update `TalkInput` — remove mic button, add hint

**Files:**
- Modify: `frontend/src/components/talk/TalkInput.tsx`
- Modify: `frontend/src/__tests__/TalkInput.test.tsx`

- [ ] **Step 1: Update TalkInput tests first**

The mic button tests will break since the button is being removed. The `talkState` prop is also no longer needed (it was only used for the mic button's pulse animation). Update `frontend/src/__tests__/TalkInput.test.tsx` — remove mic-specific tests and the `onMicToggle` prop, keep all others:

```typescript
// frontend/src/__tests__/TalkInput.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import TalkInput from '../components/talk/TalkInput'

const defaultProps = {
  transcript: '',
  inputText: '',
  onInputChange: vi.fn(),
  onSend: vi.fn(),
}

describe('TalkInput', () => {
  it('renders text input', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('does not render a mic button', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /mic/i })).not.toBeInTheDocument()
  })

  it('calls onInputChange when typing', () => {
    const onInputChange = vi.fn()
    render(<TalkInput {...defaultProps} onInputChange={onInputChange} />)
    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'hello' } })
    expect(onInputChange).toHaveBeenCalledWith('hello')
  })

  it('shows send button only when inputText is non-empty', () => {
    const { rerender } = render(<TalkInput {...defaultProps} inputText="" />)
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument()
    rerender(<TalkInput {...defaultProps} inputText="hello" />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend with inputText when send button clicked', () => {
    const onSend = vi.fn()
    render(<TalkInput {...defaultProps} inputText="hello" onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('calls onSend on Enter key', () => {
    const onSend = vi.fn()
    render(<TalkInput {...defaultProps} inputText="hello" onSend={onSend} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/ask/i), { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('renders transcript text when provided', () => {
    render(<TalkInput {...defaultProps} transcript="Here is what KOS said." />)
    expect(screen.getByText('Here is what KOS said.')).toBeInTheDocument()
  })
})
```

Run to confirm the old tests fail now (since the component hasn't been updated yet):
```bash
cd frontend && npx vitest run src/__tests__/TalkInput.test.tsx
```
Expected: some tests fail because the component still has the mic button.

- [ ] **Step 2: Update `TalkInput.tsx`**

Replace the entire file content:

```typescript
// frontend/src/components/talk/TalkInput.tsx
import { KeyboardEvent } from 'react'
import { Send } from 'lucide-react'

interface TalkInputProps {
  transcript: string
  inputText: string
  onInputChange: (text: string) => void
  onSend: (text: string) => void
}

export default function TalkInput({
  transcript,
  inputText,
  onInputChange,
  onSend,
}: TalkInputProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputText.trim()) {
      onSend(inputText.trim())
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[380px] mx-auto px-4">
      <p
        className="min-h-[48px] text-center italic text-sm leading-relaxed"
        style={{ color: 'rgba(240,238,255,0.7)' }}
      >
        {transcript}
      </p>

      <div className="flex items-center gap-3 w-full">
        <input
          type="text"
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOS anything…"
          className="flex-1 rounded-full px-4 py-2 text-sm bg-transparent outline-none"
          style={{
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#f0eeff',
          }}
        />

        {inputText.trim() && (
          <button
            aria-label="send"
            onClick={() => onSend(inputText.trim())}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.3)' }}
          >
            <Send size={14} color="#a78bfa" />
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Fix the `TalkInput` prop usage in `TalkPage.tsx`**

In `TalkPage.tsx`, update the `<TalkInput>` call — remove `talkState` and `onMicToggle` props:

```typescript
<TalkInput
  transcript={transcript}
  inputText={inputText}
  onInputChange={setInputText}
  onSend={handleSend}
/>
```

- [ ] **Step 4: Run all TalkInput and TalkPage tests**

```bash
cd frontend && npx vitest run src/__tests__/TalkInput.test.tsx src/__tests__/TalkPage.test.tsx
```
Expected: all pass. The old mic-button TalkPage test (`renders the mic button`) also needs to be removed from `TalkPage.test.tsx` — find and delete this block:

```typescript
it('renders the mic button', () => {
  render(<Wrapper><TalkPage /></Wrapper>)
  expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument()
})
```

Run again after removing that test:
```bash
cd frontend && npx vitest run src/__tests__/TalkInput.test.tsx src/__tests__/TalkPage.test.tsx
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/talk/TalkInput.tsx frontend/src/__tests__/TalkInput.test.tsx frontend/src/__tests__/TalkPage.test.tsx frontend/src/pages/TalkPage.tsx
git commit -m "refactor: remove mic button from TalkInput, wire voice to nebula press zone"
```

---

## Task 8: Wire `/api/analyze` + `KnowledgeCards` in `TalkPage`

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`
- Modify: `frontend/src/__tests__/TalkPage.test.tsx`

- [ ] **Step 1: Write failing test**

Add to `frontend/src/__tests__/TalkPage.test.tsx`:

```typescript
it('calls /api/analyze after a successful /api/talk response', async () => {
  const mockFetch = vi.fn()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: 'Tell me more about your experience' }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({ new_topics: [], similar: [] }),
    })
  global.fetch = mockFetch

  render(<Wrapper><TalkPage /></Wrapper>)
  const input = screen.getByPlaceholderText(/ask/i)
  fireEvent.change(input, { target: { value: 'I read about Stoicism' } })
  fireEvent.keyDown(input, { key: 'Enter' })

  await waitFor(() => {
    const calls = mockFetch.mock.calls.map((c: unknown[]) => c[0])
    expect(calls).toContain('/api/analyze')
  })
})
```

Run to confirm it fails:
```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx -t "analyze"
```
Expected: FAIL.

- [ ] **Step 2: Import and use `useKnowledgeCards` in `TalkPage`**

At the top of `TalkPage.tsx`, add imports:

```typescript
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { NewTopicCard } from '../hooks/useKnowledgeCards'
```

Inside the component, add the hook:

```typescript
const { cards, addCards, dismiss, clearAll } = useKnowledgeCards()
```

- [ ] **Step 3: Add the analyze call in `handleSend`**

In `TalkPage.tsx`, update `handleSend` to fire `/api/analyze` after the talk response completes:

```typescript
async function handleSend(text: string) {
  if (!text.trim()) return
  abortControllerRef.current?.abort()
  const controller = new AbortController()
  abortControllerRef.current = controller
  send()
  clearTranscript()
  clearAll()
  try {
    const res = await fetch('/api/talk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: controller.signal,
    })
    firstTokenReceived()
    const data = await res.json()
    const responseText = data.response ?? ''
    setTranscript(responseText)
    streamComplete()

    // Fire-and-forget: analyze conversation for topics
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, response: responseText }),
    })
      .then(r => r.json())
      .then(d => addCards(d.new_topics ?? [], d.similar ?? []))
      .catch(() => { /* non-critical, ignore */ })
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      streamComplete()
    }
  }
}
```

- [ ] **Step 4: Add `onSave` handler and render `KnowledgeCards`**

Add the save handler inside the component:

```typescript
async function handleSaveCard(card: NewTopicCard) {
  dismiss(card.id)
  fetch('/api/insights/topic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: card.name, description: card.description }),
  }).catch(() => { /* non-critical */ })
}
```

In the JSX, add `KnowledgeCards` inside the visualizer container (which already has `relative` positioning):

```typescript
{/* Knowledge cards — floats over visualizer on desktop, bottom sheet on mobile */}
<KnowledgeCards
  cards={cards}
  onDismiss={dismiss}
  onSave={handleSaveCard}
/>
```

Place this immediately after the `</div>` that closes the visualizer container, before the state label `<p>`. The full return structure becomes:

```typescript
return (
  <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
    <StarfieldCanvas />

    {/* Visualizer container */}
    <div className="relative flex items-center justify-center shrink-0" style={{ width: vizSize, height: vizSize }}>
      <WaveCanvas ref={waveRef} size={vizSize} />
      <ParticleNebulaCanvas ref={particleRef} size={vizSize} onPointerDown={handleNebulaPointerDown} onPointerUp={handleNebulaPointerUp} onPointerCancel={handleNebulaPointerUp} />
      <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
      <HUDRingsSVG ringSpeed={visualParams.ringSpeed} size={vizSize} />
      {talkState === 'LISTENING' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
          <div className="flex items-center gap-1">
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }} />
            <span style={{ fontSize: '10px', color: 'rgba(196,181,253,0.85)', letterSpacing: '2px', fontFamily: 'monospace' }}>REC</span>
          </div>
        </div>
      )}
      <KnowledgeCards cards={cards} onDismiss={dismiss} onSave={handleSaveCard} />
    </div>

    {/* State label */}
    <p className="font-mono text-[10px] tracking-[3px] uppercase mt-3 z-10" style={{ color: 'rgba(196,181,253,0.5)' }}>
      {talkState}
    </p>
    <p className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10" style={{ color: 'rgba(196,181,253,0.2)' }}>
      Hold to talk · Release to send
    </p>

    <div className="z-10 w-full">
      <TalkInput transcript={transcript} inputText={inputText} onInputChange={setInputText} onSend={handleSend} />
    </div>
  </div>
)
```

- [ ] **Step 5: Run all tests**

```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx
```
Expected: all pass including the new analyze test.

Run the full frontend suite to catch any regressions:
```bash
cd frontend && npx vitest run
```
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx frontend/src/__tests__/TalkPage.test.tsx
git commit -m "feat: wire /api/analyze and KnowledgeCards into TalkPage"
```

---

## Task 9: Final smoke check

- [ ] **Step 1: Run all backend tests**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: all pass.

- [ ] **Step 2: Run all frontend tests**

```bash
cd frontend && npx vitest run
```
Expected: all pass.

- [ ] **Step 3: Manual smoke test**

Start the stack:
```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload

# Terminal 2
cd frontend && npm run dev
```

Open `http://localhost:5173` and navigate to the Talk view. Verify:
- [ ] No mic button visible
- [ ] "Hold to talk · Release to send" hint is visible below the state label
- [ ] Pressing and holding the nebula shows the red ● REC indicator
- [ ] Releasing triggers PROCESSING state (dashed ring not visible since that's canvas-level, but state label should show PROCESSING)
- [ ] Typing a message and pressing Enter sends it and shows a response in the transcript
- [ ] After a response, a knowledge card appears (may take a moment — the analyze call is async)
- [ ] Clicking "Save to brain" on a new topic card dismisses it
- [ ] On a narrow window (< 768px), cards appear as a bottom sheet instead of floating on the right

- [ ] **Step 4: Final commit if any fixes were made during smoke test**

```bash
git add -p  # stage only intentional changes
git commit -m "fix: smoke test corrections for Talk view redesign"
```
