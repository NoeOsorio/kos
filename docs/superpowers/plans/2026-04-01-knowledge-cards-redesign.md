# Knowledge Cards Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the auto-save bug, remove auto-dismiss, redesign cards into a 1/3 desktop panel + mobile swipe drawer, and rewrite the backend extraction to produce personal insight synthesis with topic deduplication.

**Architecture:** Backend extraction prompt is rewritten to produce `topic_key` + `synthesis` per card. The frontend hook tracks pending + saved cards with no auto-dismiss; duplicate `topic_key` hits hydrate the existing card instead of creating a new one. TalkPage switches to a 2/3 + 1/3 flex-row layout when pending cards exist on desktop. Mobile gets a fixed bottom drawer with swipe-up gesture.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, FastAPI, Pydantic v2, Claude Haiku (backend extraction)

---

## File Map

| File | Change |
|------|--------|
| `backend/app/api/routes/analyze.py` | New extraction prompt; add `topic_key`; rename `description`→`synthesis`; remove `type` |
| `frontend/src/hooks/useKnowledgeCards.ts` | Remove auto-dismiss; add `savedCards` + `save()`; hydrate on `topic_key` match |
| `frontend/src/components/talk/KnowledgeCards.tsx` | Desktop card list (no positioning); mobile drawer with handle + badge + swipe |
| `frontend/src/pages/TalkPage.tsx` | 2/3+1/3 layout; remove auto-save; wire `save()` and `savedCards` |
| `frontend/src/__tests__/useKnowledgeCards.test.ts` | Update fixtures to `topicKey`/`synthesis`; replace auto-dismiss test with hydration test |
| `frontend/src/__tests__/KnowledgeCards.test.tsx` | Update fixtures to `synthesis`; add saved cards section test |

---

## Task 1: Update backend data contract — add `topic_key`, rename `description`→`synthesis`, remove `type`

**Files:**
- Modify: `backend/app/api/routes/analyze.py`

- [ ] **Step 1: Update `TopicItem` and `AnalyzeResponse` Pydantic models**

In `backend/app/api/routes/analyze.py`, replace the existing model definitions:

```python
class TopicItem(BaseModel):
    topic_key: str
    name: str
    synthesis: str


class AnalyzeResponse(BaseModel):
    new_topics: list[TopicItem]
    similar: list[SimilarItem]
```

Remove the `type` field from `AnalyzeResponse` entirely (delete `from typing import Literal` if no longer used).

- [ ] **Step 2: Update the `analyze` endpoint return statement**

The endpoint currently returns `AnalyzeResponse(type=intent_type, ...)`. Replace the entire try/except parse block and return:

```python
    try:
        text = message.content[0].text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[-1]
            text = text.rsplit("```", 1)[0].strip()
        raw = json.loads(text)
        new_topics = [TopicItem(**t) for t in raw.get("new_topics", [])]
        similar = _find_similar(raw.get("similar_keywords", []))
    except (json.JSONDecodeError, KeyError, TypeError, ValidationError):
        return AnalyzeResponse(new_topics=[], similar=[])

    return AnalyzeResponse(new_topics=new_topics, similar=similar)
```

Also update the early-return stubs:
```python
    if len(request.message.strip()) < 10:
        return AnalyzeResponse(new_topics=[], similar=[])

    if not settings.anthropic_api_key:
        return AnalyzeResponse(new_topics=[], similar=[])
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/analyze.py
git commit -m "feat(backend): update AnalyzeResponse — add topic_key, synthesis, remove type"
```

---

## Task 2: Rewrite extraction prompt

**Files:**
- Modify: `backend/app/api/routes/analyze.py`

- [ ] **Step 1: Replace `_EXTRACTION_PROMPT`**

```python
_EXTRACTION_PROMPT = """You are a knowledge extraction engine for a personal second brain app.

User message: {message}
AI response: {response}

Extract up to 2 knowledge topics that the user personally encountered, visited, experienced, connected, or found meaningful. Skip generic Q&A, greetings, and exchanges with no personal knowledge content.

For each topic:
- Write a synthesis (2-3 sentences) grounded in what the user actually said or experienced — not a textbook definition. Use second-person ("You visited...", "You connected...", "You noticed...").
- Generate a topic_key: a lowercase hyphenated slug of the core concept (e.g. "american-museum-natural-history", "flow-state", "stoicism").

Return JSON only:
{{
  "new_topics": [
    {{
      "topic_key": "slug-of-concept",
      "name": "Concept Name",
      "synthesis": "2-3 sentence synthesis grounded in the user's actual words and experience."
    }}
  ],
  "similar_keywords": ["keyword1", "keyword2"]
}}

Return empty new_topics list if there is no personal knowledge to extract. Return only valid JSON, nothing else."""
```

- [ ] **Step 2: Restart the backend and manually verify the new prompt shape**

```bash
cd backend && uvicorn app.main:app --reload
```

In a second terminal, send a test request:
```bash
curl -s -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"message":"I visited the American Museum of Natural History this weekend and the Planetarium blew my mind","response":"That sounds incredible! The Rose Center for Earth and Space is one of the most awe-inspiring spaces in New York."}' \
  | python3 -m json.tool
```

Expected: response contains `topic_key`, `synthesis` (2-3 personal sentences), no `type` field.

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/routes/analyze.py
git commit -m "feat(backend): rewrite extraction prompt — personal synthesis, topic_key, no fixed categories"
```

---

## Task 3: Update `useKnowledgeCards` hook — remove auto-dismiss, add hydration, add `savedCards`

**Files:**
- Modify: `frontend/src/hooks/useKnowledgeCards.ts`
- Modify: `frontend/src/__tests__/useKnowledgeCards.test.ts`

- [ ] **Step 1: Write the failing tests first**

Replace the entire content of `frontend/src/__tests__/useKnowledgeCards.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'

describe('useKnowledgeCards', () => {
  it('starts with no cards and no saved cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    expect(result.current.cards).toHaveLength(0)
    expect(result.current.savedCards).toHaveLength(0)
  })

  it('addCards adds new topic and similar cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You connected Stoicism to your daily decisions.' }],
        [{ id: 'node-mm', title: 'Mental Models', excerpt: 'Patterns across disciplines' }],
      )
    })
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0]).toMatchObject({ type: 'new', name: 'Stoicism', topicKey: 'stoicism' })
    expect(result.current.cards[1]).toMatchObject({ type: 'similar', title: 'Mental Models' })
  })

  it('hydrates an existing card when same topicKey arrives again', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'First synthesis.' }],
        [],
      )
    })
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'Richer second synthesis.' }],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(1)
    expect((result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard).synthesis).toBe('Richer second synthesis.')
  })

  it('cards do NOT auto-dismiss after 8 seconds', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.cards).toHaveLength(1)
    vi.useRealTimers()
  })

  it('dismiss removes a card by id', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    const id = result.current.cards[0].id
    act(() => { result.current.dismiss(id) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('save moves card from cards to savedCards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    const card = result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard
    act(() => { result.current.save(card) })
    expect(result.current.cards).toHaveLength(0)
    expect(result.current.savedCards).toHaveLength(1)
    expect(result.current.savedCards[0].topicKey).toBe('stoicism')
  })

  it('caps visible cards at 3, keeping newest', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [
          { topicKey: 'a', name: 'Topic A', synthesis: 'Synthesis A' },
          { topicKey: 'b', name: 'Topic B', synthesis: 'Synthesis B' },
          { topicKey: 'c', name: 'Topic C', synthesis: 'Synthesis C' },
          { topicKey: 'd', name: 'Topic D', synthesis: 'Synthesis D' },
        ],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(3)
    expect((result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard).name).toBe('Topic B')
  })

  it('clearAll removes all cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'a', name: 'A', synthesis: 'Synthesis A' }, { topicKey: 'b', name: 'B', synthesis: 'Synthesis B' }],
        [],
      )
    })
    act(() => { result.current.clearAll() })
    expect(result.current.cards).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd frontend && npx vitest run src/__tests__/useKnowledgeCards.test.ts
```

Expected: failures on `topicKey`, `synthesis`, `save`, hydration, and auto-dismiss tests.

- [ ] **Step 3: Rewrite `useKnowledgeCards.ts`**

```typescript
import { useState, useCallback } from 'react'

export interface NewTopicCard {
  id: string
  type: 'new'
  topicKey: string
  name: string
  synthesis: string
}

export interface SimilarCard {
  id: string
  type: 'similar'
  insightId: string
  title: string
  excerpt: string
}

export type KnowledgeCard = NewTopicCard | SimilarCard

interface TopicItem { topicKey: string; name: string; synthesis: string }
interface SimilarItem { id: string; title: string; excerpt: string }

const MAX_CARDS = 3

export function useKnowledgeCards() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const [savedCards, setSavedCards] = useState<NewTopicCard[]>([])

  const dismiss = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  const save = useCallback((card: NewTopicCard) => {
    setCards(prev => prev.filter(c => c.id !== card.id))
    setSavedCards(prev => [...prev, card])
  }, [])

  const addCards = useCallback((
    newTopics: TopicItem[],
    similar: SimilarItem[],
  ) => {
    const incomingSimilar: SimilarCard[] = similar.map(s => ({
      id: `similar-${s.id}-${Date.now()}`,
      type: 'similar',
      insightId: s.id,
      title: s.title,
      excerpt: s.excerpt,
    }))

    setCards(prev => {
      let updated = [...prev]

      // Hydrate or add new topic cards
      for (const t of newTopics) {
        const existingIdx = updated.findIndex(c => c.type === 'new' && (c as NewTopicCard).topicKey === t.topicKey)
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], synthesis: t.synthesis } as NewTopicCard
        } else {
          updated.push({
            id: `new-${t.topicKey}-${Date.now()}`,
            type: 'new',
            topicKey: t.topicKey,
            name: t.name,
            synthesis: t.synthesis,
          })
        }
      }

      // Add similar cards
      updated = [...updated, ...incomingSimilar]

      // Cap at MAX_CARDS (keep newest)
      return updated.slice(-MAX_CARDS)
    })
  }, [])

  const clearAll = useCallback(() => {
    setCards([])
  }, [])

  return { cards, savedCards, addCards, dismiss, save, clearAll }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd frontend && npx vitest run src/__tests__/useKnowledgeCards.test.ts
```

Expected: all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useKnowledgeCards.ts frontend/src/__tests__/useKnowledgeCards.test.ts
git commit -m "feat: update useKnowledgeCards — remove auto-dismiss, add hydration, savedCards, save()"
```

---

## Task 4: Fix auto-save bug in TalkPage + wire new hook API

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`

- [ ] **Step 1: Remove auto-save from the SSE streaming path**

In `TalkPage.tsx`, find the `.then()` block after the `/api/analyze` fetch in the SSE path (around line 85-101). Replace it with a version that does NOT call `/api/insights/topic`:

```typescript
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, response: fullResponse }),
        })
          .then(r => r.json())
          .then(d => {
            addCards(d.new_topics ?? [], d.similar ?? [])
          })
          .catch(() => {})
```

- [ ] **Step 2: Remove auto-save from the JSON fallback path**

Find the identical block in the JSON fallback path (around line 111-128). Apply the same removal:

```typescript
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, response: responseText }),
        })
          .then(r => r.json())
          .then(d => {
            addCards(d.new_topics ?? [], d.similar ?? [])
          })
          .catch(() => {})
```

- [ ] **Step 3: Update `handleSaveCard` to use `save()` instead of `dismiss()`**

Destructure `save` from `useKnowledgeCards`:
```typescript
const { cards, addCards, dismiss, save, clearAll, savedCards } = useKnowledgeCards()
```

Update `handleSaveCard`:
```typescript
  function handleSaveCard(card: NewTopicCard) {
    save(card)
    fetch('/api/insights/topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: card.name, description: card.synthesis }),
    }).catch(() => {})
  }
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx
git commit -m "fix: remove auto-save bug — insights only saved on explicit user approval"
```

---

## Task 5: Update `KnowledgeCards.test.tsx` for new data shape

**Files:**
- Modify: `frontend/src/__tests__/KnowledgeCards.test.tsx`

- [ ] **Step 1: Update test fixtures and add saved cards test**

Replace the entire content of `frontend/src/__tests__/KnowledgeCards.test.tsx`:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { KnowledgeCard, NewTopicCard } from '../hooks/useKnowledgeCards'

const newCard: KnowledgeCard = {
  id: 'new-stoicism-1',
  type: 'new',
  topicKey: 'stoicism',
  name: 'Stoicism',
  synthesis: 'You connected Stoicism to your daily decisions while reading Marcus Aurelius.',
}

const similarCard: KnowledgeCard = {
  id: 'similar-node-mm-1',
  type: 'similar',
  insightId: 'node-mm',
  title: 'Mental Models',
  excerpt: 'Patterns across disciplines',
}

const savedCard: NewTopicCard = {
  id: 'new-deep-work-1',
  type: 'new',
  topicKey: 'deep-work',
  name: 'Deep Work',
  synthesis: 'You recognized the value of deep work sessions during your morning routine.',
}

const noop = vi.fn()

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('KnowledgeCards', () => {
  it('renders nothing when cards and savedCards are both empty', () => {
    const { container } = wrap(
      <KnowledgeCards cards={[]} savedCards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a new topic card with name and synthesis', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText(/connected Stoicism/)).toBeInTheDocument()
  })

  it('renders "Save to brain" button on new topic card', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByRole('button', { name: /save to brain/i })).toBeInTheDocument()
  })

  it('calls onSave with card when save button clicked', () => {
    const onSave = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save to brain/i }))
    expect(onSave).toHaveBeenCalledWith(newCard)
  })

  it('calls onDismiss with card id when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={onDismiss} onSave={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledWith('new-stoicism-1')
  })

  it('renders a similar card with title and excerpt', () => {
    wrap(<KnowledgeCards cards={[similarCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
    expect(screen.getByText('Patterns across disciplines')).toBeInTheDocument()
  })

  it('renders multiple cards', () => {
    wrap(
      <KnowledgeCards cards={[newCard, similarCard]} savedCards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
  })

  it('renders "KNOWLEDGE DETECTED" header when cards are present', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText(/knowledge detected/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail (component not yet updated)**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeCards.test.tsx
```

Expected: failures on `savedCards` prop, `synthesis` text, and "KNOWLEDGE DETECTED" header.

- [ ] **Step 3: Commit the test file**

```bash
git add frontend/src/__tests__/KnowledgeCards.test.tsx
git commit -m "test: update KnowledgeCards fixtures — synthesis, savedCards prop, header assertion"
```

---

## Task 6: Redesign `KnowledgeCards` component — desktop panel + mobile drawer

**Files:**
- Modify: `frontend/src/components/talk/KnowledgeCards.tsx`

- [ ] **Step 1: Rewrite `KnowledgeCards.tsx`**

```typescript
import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { KnowledgeCard, NewTopicCard, SimilarCard } from '../../hooks/useKnowledgeCards'

interface KnowledgeCardsProps {
  cards: KnowledgeCard[]
  savedCards: NewTopicCard[]
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
      style={{
        background: 'rgba(8,8,20,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139,92,246,0.55)',
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: '0 6px 24px rgba(139,92,246,0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: '8px', color: 'rgba(139,92,246,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          New insight
        </span>
        <button
          aria-label="dismiss"
          onClick={() => onDismiss(card.id)}
          style={{
            background: 'none', border: 'none',
            fontSize: '11px', color: 'rgba(196,181,253,0.35)',
            cursor: 'pointer', padding: 0,
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(240,238,255,0.98)', marginBottom: '6px' }}>
        {card.name}
      </p>
      <p style={{ fontSize: '11px', color: 'rgba(196,181,253,0.65)', marginBottom: '12px', lineHeight: 1.5 }}>
        {card.synthesis}
      </p>
      <button
        aria-label="save to brain"
        onClick={() => onSave(card)}
        style={{
          width: '100%', padding: '6px 0',
          background: 'rgba(139,92,246,0.35)',
          border: '1px solid rgba(139,92,246,0.6)',
          borderRadius: '8px',
          fontSize: '10px', color: 'rgba(196,181,253,1.0)', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Save to brain
      </button>
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
      style={{
        background: 'rgba(8,8,20,0.87)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(109,40,217,0.38)',
        borderRadius: '12px',
        padding: '12px 14px',
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

// Desktop: plain scrollable card list — parent (TalkPage) controls positioning
function DesktopPanel({
  cards,
  onDismiss,
  onSave,
}: {
  cards: KnowledgeCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto pt-8 px-4 pb-6 gap-3">
      <p
        style={{
          fontSize: '9px', color: 'rgba(139,92,246,0.5)',
          letterSpacing: '2.5px', textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: '4px',
        }}
      >
        Knowledge detected
      </p>
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )
}

type DrawerState = 'closed' | 'open'

// Mobile: fixed bottom drawer with pull handle, swipe gesture, pending + saved sections
function MobileDrawer({
  cards,
  savedCards,
  onDismiss,
  onSave,
}: {
  cards: KnowledgeCard[]
  savedCards: NewTopicCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  const [drawerState, setDrawerState] = useState<DrawerState>('closed')
  const touchStartYRef = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = touchStartYRef.current - e.changedTouches[0].clientY
    if (delta > 50) setDrawerState('open')
    if (delta < -50) setDrawerState('closed')
  }, [])

  const pendingCount = cards.filter(c => c.type === 'new').length
  const drawerHeight = drawerState === 'open' ? '70vh' : '36px'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
      style={{
        height: drawerHeight,
        transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
        background: 'rgba(8,8,20,0.97)',
        borderTop: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '16px 16px 0 0',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull handle */}
      <button
        aria-label={drawerState === 'open' ? 'close knowledge drawer' : 'open knowledge drawer'}
        onClick={() => setDrawerState(s => s === 'open' ? 'closed' : 'open')}
        className="flex items-center justify-center gap-2 w-full shrink-0"
        style={{ height: '36px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: 'rgba(139,92,246,0.3)' }} />
        {pendingCount > 0 && (
          <span style={{
            fontSize: '9px', fontFamily: 'monospace',
            color: 'rgba(139,92,246,0.8)',
            background: 'rgba(139,92,246,0.15)',
            borderRadius: '8px', padding: '1px 6px',
          }}>
            {pendingCount}
          </span>
        )}
      </button>

      {/* Drawer content */}
      {drawerState === 'open' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Pending section */}
          {cards.length > 0 && (
            <>
              <p style={{ fontSize: '9px', color: 'rgba(139,92,246,0.5)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '12px' }}>
                Pending
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {cards.map(card =>
                  card.type === 'new'
                    ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
                    : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
                )}
              </div>
            </>
          )}

          {/* Saved this session section */}
          {savedCards.length > 0 && (
            <>
              <p style={{ fontSize: '9px', color: 'rgba(109,40,217,0.5)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '12px' }}>
                Saved this session
              </p>
              <div className="flex flex-col gap-2">
                {savedCards.map(card => (
                  <div key={card.id} style={{ borderBottom: '1px solid rgba(139,92,246,0.1)', paddingBottom: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(240,238,255,0.7)', marginBottom: '2px' }}>{card.name}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.4)', lineHeight: 1.4 }}>
                      {card.synthesis.length > 80 ? card.synthesis.slice(0, 80) + '…' : card.synthesis}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeCards({ cards, savedCards, onDismiss, onSave }: KnowledgeCardsProps) {
  const isMobile = useIsMobile()

  const hasContent = cards.length > 0 || savedCards.length > 0
  if (!hasContent) return null

  if (isMobile) {
    return (
      <MobileDrawer
        cards={cards}
        savedCards={savedCards}
        onDismiss={onDismiss}
        onSave={onSave}
      />
    )
  }

  return (
    <DesktopPanel
      cards={cards}
      onDismiss={onDismiss}
      onSave={onSave}
    />
  )
}
```

- [ ] **Step 2: Run KnowledgeCards tests**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeCards.test.tsx
```

Expected: all 8 tests pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/talk/KnowledgeCards.tsx
git commit -m "feat: redesign KnowledgeCards — desktop panel, mobile drawer, synthesis display, savedCards"
```

---

## Task 7: Restructure TalkPage layout — 2/3 talk machine + 1/3 cards panel

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`

- [ ] **Step 1: Add `useIsMobile` import and `savedCards` prop pass-through**

At the top of `TalkPage.tsx`, add the import:
```typescript
import { useIsMobile } from '../hooks/useIsMobile'
```

Inside `TalkPage`, add:
```typescript
const isMobile = useIsMobile()
```

Update the `useKnowledgeCards` destructure to include `savedCards`:
```typescript
const { cards, addCards, dismiss, save, clearAll, savedCards } = useKnowledgeCards()
```

- [ ] **Step 2: Remove `KnowledgeCards` from inside the visualizer div**

Find and remove this block inside the visualizer container div (the one with `style={{ width: vizSize, height: vizSize }}`):

```tsx
        <KnowledgeCards
          cards={cards}
          onDismiss={dismiss}
          onSave={handleSaveCard}
        />
```

- [ ] **Step 3: Restructure the TalkPage return to 2/3 + 1/3 layout**

Replace the outer wrapper div and its children with this structure:

```tsx
  return (
    <div className="relative flex h-full overflow-hidden">
      <StarfieldCanvas />

      {/* Left: talk machine — 2/3 on desktop when cards pending, full otherwise */}
      <div
        className="flex flex-col items-center justify-center transition-all duration-300"
        style={{ width: cards.length > 0 && !isMobile ? '66.666%' : '100%' }}
      >
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
            onPointerUp={voice.onPointerUp}
            onPointerCancel={voice.onPointerCancel}
          />
          <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
          <HUDRingsSVG ringSpeed={voice.visualParams.ringSpeed} size={vizSize} />

          {/* REC indicator */}
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

          {/* Processing spinner */}
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

          {/* Ripple burst */}
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
        </div>

        {/* State label */}
        <p
          className="font-mono text-[10px] tracking-[3px] uppercase mt-3 z-10"
          style={{ color: 'rgba(196,181,253,0.5)' }}
        >
          {statusLabel}
        </p>

        {/* Conversation timer */}
        {isConversation && conversationTimeLeft > 0 && (
          <p
            className="font-mono text-[10px] tracking-[2px] z-10"
            style={{ color: 'rgba(139,92,246,0.6)' }}
          >
            {formatTime(conversationTimeLeft)}
          </p>
        )}

        <p
          className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10"
          style={{ color: 'rgba(196,181,253,0.2)' }}
        >
          {hintText}
        </p>

        <div className="z-10 w-full flex flex-col items-center">
          <TalkInput
            transcript={voice.transcript}
            inputText={voice.inputText}
            messages={messages}
            onInputChange={voice.setInputText}
            onSend={(text) => voice.sendText(text)}
          />
        </div>
      </div>

      {/* Right: cards panel — desktop only, 1/3, only when pending cards exist */}
      {cards.length > 0 && !isMobile && (
        <div
          className="z-10 overflow-hidden transition-all duration-300"
          style={{
            width: '33.333%',
            borderLeft: '1px solid rgba(139,92,246,0.1)',
          }}
        >
          <KnowledgeCards
            cards={cards}
            savedCards={savedCards}
            onDismiss={dismiss}
            onSave={handleSaveCard}
          />
        </div>
      )}

      {/* Mobile drawer — always rendered when content exists (handles its own visibility) */}
      {isMobile && (
        <KnowledgeCards
          cards={cards}
          savedCards={savedCards}
          onDismiss={dismiss}
          onSave={handleSaveCard}
        />
      )}
    </div>
  )
```

- [ ] **Step 4: Run the full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass. Fix any TypeScript errors reported by the compiler:
```bash
cd frontend && node_modules/.bin/tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx
git commit -m "feat: TalkPage 2/3 + 1/3 layout — cards panel on desktop, mobile drawer wired"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Auto-save bug fixed (Task 4)
- ✅ Auto-dismiss removed (Task 3)
- ✅ `topic_key` + `synthesis` data contract (Tasks 1, 2)
- ✅ Card hydration on matching `topic_key` (Task 3)
- ✅ Desktop 2/3 + 1/3 layout (Task 7)
- ✅ `savedCards` tracking with `save()` (Task 3)
- ✅ Desktop panel with "KNOWLEDGE DETECTED" header (Task 6)
- ✅ Mobile drawer with pull handle + badge + Pending + Saved sections (Task 6)
- ✅ Swipe gesture on mobile drawer (Task 6)
- ✅ Cards only appear when pending (Task 7)

**Type consistency check:**
- `topicKey` is used consistently across `NewTopicCard`, `TopicItem`, `addCards()`, test fixtures
- `synthesis` replaces `description` everywhere — backend `TopicItem`, frontend `NewTopicCard`, all test fixtures, `handleSaveCard` API call body
- `save(card: NewTopicCard)` signature matches usage in `handleSaveCard` and tests
- `savedCards` flows from hook → TalkPage → KnowledgeCards prop

**Placeholder scan:** No TBDs, no "implement later", no incomplete steps.
