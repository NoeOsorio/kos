# Build Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the BUILD mode home screen and all 5 app workspaces with localStorage session persistence and mock generation.

**Architecture:** `BuildPage` renders an app grid + recent sessions list. Navigating to `/build/:appType` opens `BuildWorkspacePage` — a two-column layout (280px sidebar + flex-1 draft). All 5 app types share the same shell with per-app sidebar fields and draft sections. Sessions persist to `localStorage` under `kos_build_sessions`. Generation is mocked with a 1.2s delay; real AI wiring is out of scope.

**Tech Stack:** React 18 + TypeScript, Tailwind CSS, Framer Motion, lucide-react, localStorage, Vitest + React Testing Library

---

## File Map

**Create:**
- `frontend/src/hooks/useBuildSessions.ts` — localStorage CRUD for `BuildSession[]`
- `frontend/src/components/build/AppCard.tsx` — single app grid card
- `frontend/src/components/build/PillGroup.tsx` — reusable single-select pill row
- `frontend/src/components/build/KnowledgeSources.tsx` — toggleable source list shell
- `frontend/src/components/build/WorkspaceSidebar.tsx` — sidebar with shared + per-app fields
- `frontend/src/components/build/WorkspaceDraft.tsx` — draft area with per-app sections
- `frontend/src/__tests__/useBuildSessions.test.ts`
- `frontend/src/__tests__/AppCard.test.tsx`
- `frontend/src/__tests__/PillGroup.test.tsx`
- `frontend/src/__tests__/KnowledgeSources.test.tsx`
- `frontend/src/__tests__/BuildPage.test.tsx`
- `frontend/src/__tests__/BuildWorkspacePage.test.tsx`

**Modify:**
- `frontend/src/pages/BuildPage.tsx` — replace placeholder with home screen
- `frontend/src/pages/BuildWorkspacePage.tsx` — replace placeholder with workspace shell

---

## Task 1: useBuildSessions hook

**Files:**
- Create: `frontend/src/hooks/useBuildSessions.ts`
- Test: `frontend/src/__tests__/useBuildSessions.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/useBuildSessions.test.ts
import { renderHook, act } from '@testing-library/react'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { BuildSession } from '../types/kos'

const SESSION: BuildSession = {
  id: 'abc',
  appType: 'script',
  topic: 'Productivity',
  format: 'Personal',
  sourceIds: [],
  externalSources: [],
  draft: { type: 'script', text: 'hello' },
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => localStorage.clear())

describe('useBuildSessions', () => {
  it('starts empty when localStorage is clean', () => {
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.sessions).toEqual([])
  })

  it('upsertSession adds a new session and persists it', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('abc')
    expect(JSON.parse(localStorage.getItem('kos_build_sessions')!)).toHaveLength(1)
  })

  it('upsertSession updates an existing session by id', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    act(() => result.current.upsertSession({ ...SESSION, topic: 'Deep Work' }))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].topic).toBe('Deep Work')
  })

  it('getSession returns null for unknown id', () => {
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.getSession('unknown')).toBeNull()
  })

  it('getSession returns the session for a known id', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    expect(result.current.getSession('abc')).toEqual(SESSION)
  })

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([SESSION]))
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('abc')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/useBuildSessions.test.ts --reporter=verbose
```

Expected: FAIL — `Cannot find module '../hooks/useBuildSessions'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/hooks/useBuildSessions.ts
import { useState, useCallback } from 'react'
import type { BuildSession } from '../types/kos'

const KEY = 'kos_build_sessions'

function load(): BuildSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(sessions: BuildSession[]): void {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

export function useBuildSessions() {
  const [sessions, setSessions] = useState<BuildSession[]>(load)

  const upsertSession = useCallback((session: BuildSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id)
      const next = idx >= 0
        ? prev.map((s, i) => (i === idx ? session : s))
        : [session, ...prev]
      persist(next)
      return next
    })
  }, [])

  const getSession = useCallback(
    (id: string) => sessions.find(s => s.id === id) ?? null,
    [sessions],
  )

  return { sessions, upsertSession, getSession }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/useBuildSessions.test.ts --reporter=verbose
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useBuildSessions.ts frontend/src/__tests__/useBuildSessions.test.ts
git commit -m "feat: add useBuildSessions hook with localStorage persistence"
```

---

## Task 2: PillGroup component

**Files:**
- Create: `frontend/src/components/build/PillGroup.tsx`
- Test: `frontend/src/__tests__/PillGroup.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/PillGroup.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PillGroup from '../components/build/PillGroup'

describe('PillGroup', () => {
  it('renders all options as buttons', () => {
    render(<PillGroup options={['A', 'B', 'C']} value="A" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<PillGroup label="Format" options={['A']} value="A" onChange={() => {}} />)
    expect(screen.getByText('Format')).toBeInTheDocument()
  })

  it('calls onChange with clicked option', async () => {
    const onChange = vi.fn()
    render(<PillGroup options={['A', 'B']} value="A" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('B')
  })

  it('active pill has aria-pressed=true', () => {
    render(<PillGroup options={['A', 'B']} value="B" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'false')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/PillGroup.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../components/build/PillGroup'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/components/build/PillGroup.tsx
interface PillGroupProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div>
      {label && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            aria-pressed={opt === value}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-mono tracking-wide border transition-colors ${
              opt === value
                ? 'border-purple-primary bg-purple-primary/20 text-purple-bright'
                : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/60'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/PillGroup.test.tsx --reporter=verbose
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/build/PillGroup.tsx frontend/src/__tests__/PillGroup.test.tsx
git commit -m "feat: add PillGroup single-select component for Build workspaces"
```

---

## Task 3: AppCard component

**Files:**
- Create: `frontend/src/components/build/AppCard.tsx`
- Test: `frontend/src/__tests__/AppCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/AppCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileText } from 'lucide-react'
import AppCard from '../components/build/AppCard'

describe('AppCard', () => {
  it('renders name, description, and tag', () => {
    render(
      <AppCard
        Icon={FileText}
        name="Topic Summary"
        description="Synthesize a topic from your graph."
        tag="SYNTHESIS"
        onClick={() => {}}
      />
    )
    expect(screen.getByText('Topic Summary')).toBeInTheDocument()
    expect(screen.getByText('Synthesize a topic from your graph.')).toBeInTheDocument()
    expect(screen.getByText('SYNTHESIS')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<AppCard Icon={FileText} name="X" description="" tag="T" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<AppCard Icon={FileText} name="X" description="" tag="SOON" onClick={onClick} disabled />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows "coming soon" label when disabled', () => {
    render(<AppCard Icon={FileText} name="X" description="" tag="SOON" onClick={() => {}} disabled />)
    expect(screen.getByText('coming soon')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/AppCard.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../components/build/AppCard'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/components/build/AppCard.tsx
import type { LucideProps } from 'lucide-react'

interface AppCardProps {
  Icon: React.FC<LucideProps>
  name: string
  description: string
  tag: string
  onClick: () => void
  disabled?: boolean
}

export default function AppCard({ Icon, name, description, tag, onClick, disabled }: AppCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative w-full text-left p-4 rounded-lg border transition-all duration-150 ${
        disabled
          ? 'border-white/5 bg-bg-card opacity-40 cursor-not-allowed'
          : 'border-white/8 bg-bg-card hover:-translate-y-px hover:border-white/20 cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-purple-soft opacity-60">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-text-primary mb-1">{name}</p>
          {description && (
            <p className="text-xs text-white/35 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest uppercase text-purple-soft/50 border border-purple-soft/20 px-1.5 py-0.5 rounded">
          {tag}
        </span>
        {disabled && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/20">
            coming soon
          </span>
        )}
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/AppCard.test.tsx --reporter=verbose
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/build/AppCard.tsx frontend/src/__tests__/AppCard.test.tsx
git commit -m "feat: add AppCard component for Build home grid"
```

---

## Task 4: KnowledgeSources component

**Files:**
- Create: `frontend/src/components/build/KnowledgeSources.tsx`
- Test: `frontend/src/__tests__/KnowledgeSources.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/KnowledgeSources.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KnowledgeSources from '../components/build/KnowledgeSources'

describe('KnowledgeSources', () => {
  it('shows section label', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByText(/knowledge sources/i)).toBeInTheDocument()
  })

  it('shows empty state when no sources', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByText(/no sources added/i)).toBeInTheDocument()
  })

  it('shows Add source button', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /add source/i })).toBeInTheDocument()
  })

  it('shows source count when sources are present', () => {
    render(<KnowledgeSources sourceIds={['a', 'b']} onToggle={() => {}} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('clicking Add source shows URL input', async () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /add source/i }))
    expect(screen.getByPlaceholderText(/paste url or search/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeSources.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../components/build/KnowledgeSources'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/components/build/KnowledgeSources.tsx
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface KnowledgeSourcesProps {
  sourceIds: string[]
  onToggle: (id: string) => void
}

export default function KnowledgeSources({ sourceIds, onToggle }: KnowledgeSourcesProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
          Knowledge Sources
          {sourceIds.length > 0 && (
            <span className="ml-1.5 text-purple-soft">{sourceIds.length}</span>
          )}
        </p>
      </div>

      {sourceIds.length === 0 && !addOpen && (
        <p className="text-xs text-white/25 mb-2">No sources added</p>
      )}

      {addOpen && (
        <div className="flex gap-1.5 mb-2">
          <input
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Paste URL or search…"
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-text-primary placeholder:text-white/25 outline-none focus:border-purple-primary/50"
          />
          <button
            onClick={() => { setAddOpen(false); setInputValue('') }}
            className="text-white/35 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!addOpen && (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 text-xs text-white/35 hover:text-purple-soft transition-colors"
        >
          <Plus size={12} />
          Add source
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/KnowledgeSources.test.tsx --reporter=verbose
```

Expected: PASS — 5 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/build/KnowledgeSources.tsx frontend/src/__tests__/KnowledgeSources.test.tsx
git commit -m "feat: add KnowledgeSources component with add source input"
```

---

## Task 5: BuildPage home screen

**Files:**
- Modify: `frontend/src/pages/BuildPage.tsx`
- Test: `frontend/src/__tests__/BuildPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/BuildPage.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { KOSProvider } from '../context/KOSContext'
import BuildPage from '../pages/BuildPage'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <KOSProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </KOSProvider>
  )
}

beforeEach(() => localStorage.clear())

describe('BuildPage', () => {
  it('shows the main heading', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/what do you want to build/i)).toBeInTheDocument()
  })

  it('renders all 5 app cards', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('Video Script')).toBeInTheDocument()
    expect(screen.getByText('Self Exam')).toBeInTheDocument()
    expect(screen.getByText('Ask Your Brain')).toBeInTheDocument()
    expect(screen.getByText('Topic Summary')).toBeInTheDocument()
    expect(screen.getByText('Thread / Post')).toBeInTheDocument()
  })

  it('renders a Coming Soon placeholder card', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('coming soon')).toBeInTheDocument()
  })

  it('shows RECENT section header', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/recent/i)).toBeInTheDocument()
  })

  it('shows empty recent state when no sessions', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/no recent sessions/i)).toBeInTheDocument()
  })

  it('shows a saved session in the recent list', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([{
      id: 's1', appType: 'script', topic: 'My Topic', format: 'Personal',
      sourceIds: [], externalSources: [], draft: { type: 'script', text: '' },
      updatedAt: new Date().toISOString(),
    }]))
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('My Topic')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/BuildPage.test.tsx --reporter=verbose
```

Expected: FAIL — heading and cards not found

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/pages/BuildPage.tsx
import { useNavigate } from 'react-router-dom'
import { Film, ClipboardList, Brain, FileText, AlignLeft, Plus } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import AppCard from '../components/build/AppCard'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { AppType } from '../types/kos'

interface AppDef {
  appType: AppType | null
  Icon: React.FC<LucideProps>
  name: string
  description: string
  tag: string
  disabled?: boolean
}

const APPS: AppDef[] = [
  {
    appType: 'script',
    Icon: Film,
    name: 'Video Script',
    description: 'Turn your ideas into a structured video script.',
    tag: 'SCRIPT',
  },
  {
    appType: 'exam',
    Icon: ClipboardList,
    name: 'Self Exam',
    description: 'Test yourself on what you know.',
    tag: 'SPACED REP',
  },
  {
    appType: 'ask',
    Icon: Brain,
    name: 'Ask Your Brain',
    description: 'Query your knowledge base directly.',
    tag: 'RAG',
  },
  {
    appType: 'summary',
    Icon: FileText,
    name: 'Topic Summary',
    description: 'Synthesize a topic from your graph.',
    tag: 'SYNTHESIS',
  },
  {
    appType: 'thread',
    Icon: AlignLeft,
    name: 'Thread / Post',
    description: 'Create a social post from your knowledge.',
    tag: 'SOCIAL',
  },
  {
    appType: null,
    Icon: Plus,
    name: 'More Apps',
    description: '',
    tag: 'SOON',
    disabled: true,
  },
]

const APP_TYPE_LABELS: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function BuildPage() {
  const navigate = useNavigate()
  const { sessions } = useBuildSessions()
  const recent = sessions.slice(0, 5)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Heading */}
        <h1 className="text-xl font-mono text-text-primary mb-1">
          What do you want to build?
        </h1>
        <p className="text-sm text-white/35 mb-8">
          Use your knowledge graph to create something real.
        </p>

        {/* App grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
          {APPS.map(app => (
            <AppCard
              key={app.tag}
              Icon={app.Icon}
              name={app.name}
              description={app.description}
              tag={app.tag}
              disabled={app.disabled}
              onClick={() => app.appType && navigate(`/build/${app.appType}`)}
            />
          ))}
        </div>

        {/* Recent sessions */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
              Recent
            </p>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          {recent.length === 0 ? (
            <p className="text-xs text-white/25">No recent sessions</p>
          ) : (
            <ul className="space-y-1">
              {recent.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => navigate(`/build/${s.appType}?session=${s.id}`)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/4 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate">{s.topic || '(untitled)'}</p>
                      <p className="text-xs text-white/35 font-mono">
                        {APP_TYPE_LABELS[s.appType]} · {timeAgo(s.updatedAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/BuildPage.test.tsx --reporter=verbose
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/BuildPage.tsx frontend/src/__tests__/BuildPage.test.tsx
git commit -m "feat: implement BuildPage home screen with app grid and recent sessions"
```

---

## Task 6: WorkspaceSidebar component

**Files:**
- Create: `frontend/src/components/build/WorkspaceSidebar.tsx`
- Test: `frontend/src/__tests__/WorkspaceSidebar.test.tsx` (add to test dir)

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/WorkspaceSidebar.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import WorkspaceSidebar from '../components/build/WorkspaceSidebar'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

const baseProps = {
  appType: 'script' as const,
  topic: '',
  onTopicChange: () => {},
  format: 'Personal',
  onFormatChange: () => {},
  length: '3 min',
  onLengthChange: () => {},
  question: '',
  onQuestionChange: () => {},
  sourceIds: [],
  onSourceToggle: () => {},
  onBuild: () => {},
  isGenerating: false,
}

describe('WorkspaceSidebar', () => {
  it('renders back link', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByRole('link', { name: /build/i })).toBeInTheDocument()
  })

  it('renders topic textarea', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByPlaceholderText(/what is the topic/i)).toBeInTheDocument()
  })

  it('renders Build button', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByRole('button', { name: /build/i })).toBeInTheDocument()
  })

  it('Build button calls onBuild', async () => {
    const onBuild = vi.fn()
    render(<Wrapper><WorkspaceSidebar {...baseProps} onBuild={onBuild} /></Wrapper>)
    await userEvent.click(screen.getByRole('button', { name: /build/i }))
    expect(onBuild).toHaveBeenCalledTimes(1)
  })

  it('shows Format pills for script type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="script" /></Wrapper>)
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Educational')).toBeInTheDocument()
  })

  it('shows Length pills for script type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="script" /></Wrapper>)
    expect(screen.getByText('1 min')).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
  })

  it('shows question field for ask type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="ask" /></Wrapper>)
    expect(screen.getByPlaceholderText(/what do you want to know/i)).toBeInTheDocument()
  })

  it('shows difficulty pills for exam type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="exam" /></Wrapper>)
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('shows Build button as disabled when isGenerating', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} isGenerating /></Wrapper>)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/WorkspaceSidebar.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../components/build/WorkspaceSidebar'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/components/build/WorkspaceSidebar.tsx
import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PillGroup from './PillGroup'
import KnowledgeSources from './KnowledgeSources'
import type { AppType } from '../../types/kos'

const APP_TITLES: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

interface WorkspaceSidebarProps {
  appType: AppType
  topic: string
  onTopicChange: (v: string) => void
  format: string
  onFormatChange: (v: string) => void
  length: string
  onLengthChange: (v: string) => void
  question: string
  onQuestionChange: (v: string) => void
  sourceIds: string[]
  onSourceToggle: (id: string) => void
  onBuild: () => void
  isGenerating: boolean
}

export default function WorkspaceSidebar({
  appType,
  topic,
  onTopicChange,
  format,
  onFormatChange,
  length,
  onLengthChange,
  question,
  onQuestionChange,
  sourceIds,
  onSourceToggle,
  onBuild,
  isGenerating,
}: WorkspaceSidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-5">
      {/* Back */}
      <Link
        to="/build"
        className="flex items-center gap-1 text-xs font-mono text-white/35 hover:text-white/60 transition-colors w-fit"
      >
        <ChevronLeft size={13} />
        BUILD
      </Link>

      {/* Title */}
      <p className="font-mono text-xs uppercase tracking-widest text-purple-soft">
        {APP_TITLES[appType]}
      </p>

      {/* Topic */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">Topic</p>
        <textarea
          value={topic}
          onChange={e => onTopicChange(e.target.value)}
          placeholder="What is the topic?"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-text-primary placeholder:text-white/25 resize-none outline-none focus:border-purple-primary/50 leading-relaxed"
        />
      </div>

      {/* Per-app fields */}
      {appType === 'script' && (
        <>
          <PillGroup
            label="Format"
            options={['Personal', 'Educational', 'Opinion', 'Story']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Length"
            options={['1 min', '3 min', '7 min', '10+ min']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'exam' && (
        <>
          <PillGroup
            label="Difficulty"
            options={['Easy', 'Medium', 'Hard']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Questions"
            options={['5', '10', '20']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'ask' && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">Question</p>
          <input
            value={question}
            onChange={e => onQuestionChange(e.target.value)}
            placeholder="What do you want to know?"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-text-primary placeholder:text-white/25 outline-none focus:border-purple-primary/50"
          />
        </div>
      )}

      {appType === 'summary' && (
        <>
          <PillGroup
            label="Depth"
            options={['Overview', 'Deep dive']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Audience"
            options={['Personal', 'Shareable']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'thread' && (
        <>
          <PillGroup
            label="Platform"
            options={['Twitter/X', 'LinkedIn']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Tone"
            options={['Educational', 'Personal', 'Provocative']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {/* Knowledge sources */}
      <KnowledgeSources sourceIds={sourceIds} onToggle={onSourceToggle} />

      {/* Build button */}
      <div className="mt-auto pt-3">
        <button
          onClick={onBuild}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg bg-purple-primary hover:bg-purple-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-xs uppercase tracking-widest text-white"
        >
          {isGenerating ? 'Generating…' : 'Build →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/WorkspaceSidebar.test.tsx --reporter=verbose
```

Expected: PASS — 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/build/WorkspaceSidebar.tsx frontend/src/__tests__/WorkspaceSidebar.test.tsx
git commit -m "feat: add WorkspaceSidebar with per-app fields and build trigger"
```

---

## Task 7: WorkspaceDraft component

**Files:**
- Create: `frontend/src/components/build/WorkspaceDraft.tsx`
- Test: `frontend/src/__tests__/WorkspaceDraft.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/WorkspaceDraft.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkspaceDraft from '../components/build/WorkspaceDraft'
import type { AppDraft, AppType } from '../types/kos'

const scriptDraft: AppDraft = { type: 'script', text: 'Hello hook\n\nHello problem' }
const examDraft: AppDraft = {
  type: 'exam',
  questions: [
    { id: 'q1', text: 'What is X?', answer: 'X is Y.', collapsed: true },
  ],
}
const askDraft: AppDraft = { type: 'ask', answer: 'The answer is 42.' }
const summaryDraft: AppDraft = { type: 'summary', text: 'Summary text here.' }
const threadDraft: AppDraft = {
  type: 'thread',
  blocks: [{ id: 'b1', text: 'Thread intro post' }],
}

describe('WorkspaceDraft — empty state', () => {
  it('shows a prompt to configure and build when draft is null', () => {
    render(
      <WorkspaceDraft appType="script" draft={null} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/configure your settings/i)).toBeInTheDocument()
  })

  it('shows a loading indicator while generating', () => {
    render(
      <WorkspaceDraft appType="script" draft={null} isGenerating onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/generating/i)).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — script', () => {
  it('renders draft text', () => {
    render(
      <WorkspaceDraft appType="script" draft={scriptDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/hello hook/i)).toBeInTheDocument()
  })

  it('shows Regenerate and Copy buttons', () => {
    render(
      <WorkspaceDraft appType="script" draft={scriptDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — exam', () => {
  it('renders question text', () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('What is X?')).toBeInTheDocument()
  })

  it('answer is hidden by default (collapsed)', () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.queryByText('X is Y.')).not.toBeInTheDocument()
  })

  it('answer reveals on click', async () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    await userEvent.click(screen.getByText('What is X?'))
    expect(screen.getByText('X is Y.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — ask', () => {
  it('renders the answer', () => {
    render(
      <WorkspaceDraft appType="ask" draft={askDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('The answer is 42.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — summary', () => {
  it('renders summary text', () => {
    render(
      <WorkspaceDraft appType="summary" draft={summaryDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('Summary text here.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — thread', () => {
  it('renders thread blocks', () => {
    render(
      <WorkspaceDraft appType="thread" draft={threadDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('Thread intro post')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/WorkspaceDraft.test.tsx --reporter=verbose
```

Expected: FAIL — `Cannot find module '../components/build/WorkspaceDraft'`

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/components/build/WorkspaceDraft.tsx
import { useState } from 'react'
import { RefreshCw, Copy } from 'lucide-react'
import type { AppType, AppDraft } from '../../types/kos'

interface WorkspaceDraftProps {
  appType: AppType
  draft: AppDraft | null
  isGenerating: boolean
  onRegenerate: () => void
  onCopy: () => void
}

function SectionTag({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

function ScriptContent({ text }: { text: string }) {
  const sections = [
    { tag: 'Hook', marker: /hook/i },
    { tag: 'Problem', marker: /problem/i },
    { tag: 'Personal', marker: /personal/i },
    { tag: 'Mechanism', marker: /mechanism/i },
    { tag: 'CTA', marker: /cta/i },
  ]
  const paragraphs = text.split(/\n\n+/)
  const tagged: { tag: string | null; text: string }[] = paragraphs.map(p => {
    const match = sections.find(s => s.marker.test(p))
    return { tag: match?.tag ?? null, text: p.replace(/^#+\s*/, '').trim() }
  })

  return (
    <div>
      {tagged.map((block, i) => (
        <div key={i}>
          {block.tag && <SectionTag label={block.tag} />}
          <p className="text-[15px] leading-[1.8] text-text-primary/82">{block.text}</p>
        </div>
      ))}
    </div>
  )
}

function ExamContent({ questions }: { questions: { id: string; text: string; answer: string; collapsed: boolean }[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border border-white/8 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(q.id)}
            className="w-full text-left p-4 flex items-start gap-3"
          >
            <span className="font-mono text-xs text-white/25 mt-0.5 shrink-0">{i + 1}.</span>
            <span className="text-sm text-text-primary">{q.text}</span>
          </button>
          {expandedIds.has(q.id) && (
            <div className="px-4 pb-4 pl-10 border-t border-white/6">
              <p className="text-sm text-white/70 leading-relaxed pt-3">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AskContent({ answer }: { answer: string }) {
  return (
    <div>
      <SectionTag label="Answer" />
      <p className="text-[15px] leading-[1.8] text-text-primary/82">{answer}</p>
    </div>
  )
}

function SummaryContent({ text }: { text: string }) {
  return (
    <div>
      <p className="text-[15px] leading-[1.8] text-text-primary/82 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function ThreadContent({ blocks }: { blocks: { id: string; text: string }[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="border border-white/8 rounded-lg p-4 flex gap-3">
          <span className="font-mono text-xs text-white/25 shrink-0">{i + 1}</span>
          <p className="text-sm text-text-primary leading-relaxed">{b.text}</p>
        </div>
      ))}
    </div>
  )
}

const APP_TITLES: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

export default function WorkspaceDraft({
  appType,
  draft,
  isGenerating,
  onRegenerate,
  onCopy,
}: WorkspaceDraftProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
        <p className="font-mono text-xs uppercase tracking-widest text-white/35">
          {APP_TITLES[appType]}
        </p>
        {draft && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 px-6 py-6">
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-white/35">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-primary animate-pulse" />
            Generating…
          </div>
        )}

        {!isGenerating && !draft && (
          <p className="text-sm text-white/25">
            Configure your settings and click Build to generate content.
          </p>
        )}

        {!isGenerating && draft && (
          <>
            {draft.type === 'script' && <ScriptContent text={draft.text} />}
            {draft.type === 'exam' && <ExamContent questions={draft.questions} />}
            {draft.type === 'ask' && <AskContent answer={draft.answer} />}
            {draft.type === 'summary' && <SummaryContent text={draft.text} />}
            {draft.type === 'thread' && <ThreadContent blocks={draft.blocks} />}
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/WorkspaceDraft.test.tsx --reporter=verbose
```

Expected: PASS — 10 tests pass

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/build/WorkspaceDraft.tsx frontend/src/__tests__/WorkspaceDraft.test.tsx
git commit -m "feat: add WorkspaceDraft component with per-app section rendering"
```

---

## Task 8: BuildWorkspacePage — wire everything together

**Files:**
- Modify: `frontend/src/pages/BuildWorkspacePage.tsx`
- Test: `frontend/src/__tests__/BuildWorkspacePage.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// frontend/src/__tests__/BuildWorkspacePage.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { KOSProvider } from '../context/KOSContext'
import BuildWorkspacePage from '../pages/BuildWorkspacePage'

function renderAt(path: string) {
  return render(
    <KOSProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/build/:appType" element={<BuildWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </KOSProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

describe('BuildWorkspacePage', () => {
  it('renders sidebar and draft area on desktop', () => {
    renderAt('/build/script')
    expect(screen.getByPlaceholderText(/what is the topic/i)).toBeInTheDocument()
    expect(screen.getByText(/configure your settings/i)).toBeInTheDocument()
  })

  it('renders Build button', () => {
    renderAt('/build/script')
    expect(screen.getByRole('button', { name: /build/i })).toBeInTheDocument()
  })

  it('shows Generating state after clicking Build', async () => {
    renderAt('/build/script')
    await userEvent.click(screen.getByRole('button', { name: /build/i }))
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('shows draft content after generation completes', async () => {
    renderAt('/build/script')
    await userEvent.click(screen.getByRole('button', { name: /build/i }))
    await vi.runAllTimersAsync()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /generating/i })).not.toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: /build/i })).not.toBeDisabled()
  })

  it('saves session to localStorage after generation', async () => {
    renderAt('/build/script')
    await userEvent.type(screen.getByPlaceholderText(/what is the topic/i), 'Productivity')
    await userEvent.click(screen.getByRole('button', { name: /build/i }))
    await vi.runAllTimersAsync()
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('kos_build_sessions') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].topic).toBe('Productivity')
    })
  })

  it('restores session from localStorage via ?session= param', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([{
      id: 's1', appType: 'script', topic: 'Restored Topic', format: 'Educational',
      length: '3 min', sourceIds: [], externalSources: [],
      draft: { type: 'script', text: 'Restored text' }, updatedAt: new Date().toISOString(),
    }]))
    renderAt('/build/script?session=s1')
    expect(screen.getByDisplayValue('Restored Topic')).toBeInTheDocument()
  })

  it('shows mobile Configure button on small screens', () => {
    renderAt('/build/ask')
    expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd frontend && npx vitest run src/__tests__/BuildWorkspacePage.test.tsx --reporter=verbose
```

Expected: FAIL — tests fail (placeholder page has none of these elements)

- [ ] **Step 3: Write the implementation**

```typescript
// frontend/src/pages/BuildWorkspacePage.tsx
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceSidebar from '../components/build/WorkspaceSidebar'
import WorkspaceDraft from '../components/build/WorkspaceDraft'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { AppType, AppDraft } from '../types/kos'

const DEFAULT_FORMAT: Record<AppType, string> = {
  script: 'Personal',
  exam: 'Medium',
  ask: '',
  summary: 'Overview',
  thread: 'Twitter/X',
}

const DEFAULT_LENGTH: Record<AppType, string> = {
  script: '3 min',
  exam: '10',
  ask: '',
  summary: 'Personal',
  thread: 'Educational',
}

function makeMockDraft(appType: AppType, topic: string): AppDraft {
  const t = topic || 'this topic'
  switch (appType) {
    case 'script':
      return {
        type: 'script',
        text: `## Hook\nHere's what most people get wrong about ${t}...\n\n## Problem\nThe conventional approach fails because it ignores...\n\n## Personal\nWhen I first encountered ${t}, I made every mistake possible...\n\n## Mechanism\nThe key insight is that ${t} works by...\n\n## CTA\nStart tomorrow by doing one small thing related to ${t}.`,
      }
    case 'exam':
      return {
        type: 'exam',
        questions: [
          { id: 'q1', text: `What is the core principle behind ${t}?`, answer: `The core principle is that ${t} fundamentally changes how we approach problems by...`, collapsed: true },
          { id: 'q2', text: `How does ${t} connect to things you already know?`, answer: `${t} connects to related concepts through the shared idea of...`, collapsed: true },
          { id: 'q3', text: `What is a common misconception about ${t}?`, answer: `Many people believe ${t} means X, but in reality it means Y because...`, collapsed: true },
        ],
      }
    case 'ask':
      return {
        type: 'ask',
        answer: `Based on your knowledge graph, here is a synthesis of what you know about ${t}. Your notes cover three main angles: the foundational concepts, the practical applications, and the open questions. The strongest thread connecting your insights is...`,
      }
    case 'summary':
      return {
        type: 'summary',
        text: `${t} is a concept that appears across several clusters in your knowledge graph.\n\nKey Insights:\n- First insight pulled from your notes...\n- Second insight connecting two areas...\n- Third insight from recent reading...\n\nConnections:\n- Links to Productivity via the concept of...\n- Links to Systems thinking through...\n\nGaps:\n- You haven't yet explored the relationship between ${t} and...`,
      }
    case 'thread':
      return {
        type: 'thread',
        blocks: [
          { id: 'b1', text: `Thread: What I know about ${t} after months of study` },
          { id: 'b2', text: `1/ Most people think about ${t} completely wrong. Here's the reframe that changed everything for me:` },
          { id: 'b3', text: `2/ The key insight is that ${t} is not about X — it's about Y. This distinction matters because...` },
          { id: 'b4', text: `3/ In practice, this means doing Z. Here's a concrete example from my own experience:` },
          { id: 'b5', text: `4/ The biggest mistake people make is skipping the fundamentals. If you want to understand ${t}, start with these three resources:` },
        ],
      }
  }
}

export default function BuildWorkspacePage() {
  const { appType } = useParams<{ appType: string }>() as { appType: AppType }
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const { upsertSession, getSession } = useBuildSessions()

  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState(DEFAULT_FORMAT[appType] ?? '')
  const [length, setLength] = useState(DEFAULT_LENGTH[appType] ?? '')
  const [question, setQuestion] = useState('')
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [draft, setDraft] = useState<AppDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Restore session from localStorage if ?session= param present
  useEffect(() => {
    if (!sessionId) return
    const session = getSession(sessionId)
    if (!session) return
    setTopic(session.topic)
    setFormat(session.format)
    setLength(session.length ?? '')
    setSourceIds(session.sourceIds)
    setDraft(session.draft)
  }, [sessionId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSource(id: string) {
    setSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  async function handleBuild() {
    setIsGenerating(true)
    await new Promise(r => setTimeout(r, 1200))
    const newDraft = makeMockDraft(appType, topic)
    setDraft(newDraft)
    setIsGenerating(false)
    setSidebarOpen(false)

    const id = sessionId ?? `${appType}-${Date.now()}`
    upsertSession({
      id,
      appType,
      topic,
      format,
      length,
      sourceIds,
      externalSources: [],
      draft: newDraft,
      updatedAt: new Date().toISOString(),
    })
  }

  const sidebarProps = {
    appType,
    topic,
    onTopicChange: setTopic,
    format,
    onFormatChange: setFormat,
    length,
    onLengthChange: setLength,
    question,
    onQuestionChange: setQuestion,
    sourceIds,
    onSourceToggle: toggleSource,
    onBuild: handleBuild,
    isGenerating,
  }

  function handleCopy() {
    if (!draft) return
    const text =
      draft.type === 'script' ? draft.text
      : draft.type === 'exam' ? draft.questions.map((q, i) => `${i + 1}. ${q.text}\nA: ${q.answer}`).join('\n\n')
      : draft.type === 'ask' ? draft.answer
      : draft.type === 'summary' ? draft.text
      : draft.blocks.map((b, i) => `${i + 1}/ ${b.text}`).join('\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile: Configure toggle button */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <span className="font-mono text-xs uppercase tracking-widest text-white/35">
          {appType.toUpperCase()}
        </span>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <Settings size={13} />
          Configure
        </button>
      </div>

      {/* Mobile: collapsible sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            className="md:hidden border-b border-white/6 shrink-0 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WorkspaceSidebar {...sidebarProps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-[280px] shrink-0 border-r border-white/6 overflow-y-auto">
          <WorkspaceSidebar {...sidebarProps} />
        </aside>

        {/* Draft area */}
        <main className="flex-1 overflow-y-auto">
          <WorkspaceDraft
            appType={appType}
            draft={draft}
            isGenerating={isGenerating}
            onRegenerate={handleBuild}
            onCopy={handleCopy}
          />
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd frontend && npx vitest run src/__tests__/BuildWorkspacePage.test.tsx --reporter=verbose
```

Expected: PASS — 6 tests pass

- [ ] **Step 5: Run the full test suite to confirm no regressions**

```bash
cd frontend && npx vitest run --reporter=verbose
```

Expected: All previously passing tests still pass, plus new Build tests.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/BuildWorkspacePage.tsx frontend/src/__tests__/BuildWorkspacePage.test.tsx
git commit -m "feat: implement BuildWorkspacePage with two-column layout, mock generation, and session persistence"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| BUILD home heading + subtitle | Task 5 |
| App grid — 5 apps + coming soon | Tasks 3, 5 |
| Recent sessions list (5 max) | Tasks 1, 5 |
| Session persistence to localStorage | Tasks 1, 8 |
| Restore session from recent row | Tasks 1, 8 |
| Two-column workspace shell | Task 8 |
| Per-app sidebar fields (pills, question) | Task 6 |
| Knowledge sources section | Task 4 |
| Build → button triggers generation | Tasks 6, 8 |
| Mock generation with realistic delay | Task 8 |
| Per-app draft sections | Task 7 |
| Exam question collapse/expand | Task 7 |
| Regenerate + Copy actions | Task 7 |
| Mobile sidebar as top drawer | Task 8 |
| `bg-tool` / `bg-card` visual register | Tasks 3, 5, 6, 7 |
| No emojis as icons (lucide-react) | Tasks 3, 5, 6, 7, 8 |

**Open questions (not in scope for this plan):**
- Real AI generation (needs a `/api/build` backend endpoint)
- Actual knowledge graph node source toggling (nodes not yet fetched in Build context)
- PDF/URL source parsing for external sources
- Export functionality
