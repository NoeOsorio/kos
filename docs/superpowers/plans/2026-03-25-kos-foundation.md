# KOS Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the shared foundation for KOS: dependencies, design tokens, React Query + Context state, routing, and the responsive NavBar — everything the TALK/EXPLORE/BUILD mode plans depend on.

**Architecture:** Vite + React 18 + TypeScript project already scaffolded. We add `@tanstack/react-query`, `framer-motion`, and `lucide-react`. UI state (mode, selectedNodeId, talkContext) lives in a React Context. Server/async state (graph data) is fetched via React Query hooks. No custom CSS is written — only Tailwind utility classes and inline styles where Tailwind can't reach. Framer Motion handles all animations (route crossfades, NavBar interactions).

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, @tanstack/react-query v5, framer-motion, lucide-react, react-router-dom v6, vitest, @testing-library/react, @testing-library/jest-dom

---

## File Structure

```
frontend/
├── index.html                         MODIFY — add Google Fonts CDN links
├── package.json                       MODIFY — add deps + devDeps
├── tailwind.config.js                 MODIFY — KOS color tokens + font stacks
├── vite.config.ts                     MODIFY — add vitest test config
└── src/
    ├── index.css                      MODIFY — Tailwind directives only (3 lines, no custom CSS)
    ├── setupTests.ts                  CREATE — vitest/jsdom setup
    ├── main.tsx                       MODIFY — wrap app in QueryClientProvider
    ├── App.tsx                        MODIFY — routes + Framer Motion crossfade + KOSProvider
    ├── context/
    │   └── KOSContext.tsx             CREATE — React Context for UI state (mode, selectedNodeId, talkContext)
    ├── types/
    │   └── kos.ts                     CREATE — shared TypeScript types (KOSNode, KOSCluster, BuildSession)
    ├── pages/
    │   ├── TalkPage.tsx               CREATE — stub (replaced in Plan 2)
    │   ├── ExplorePage.tsx            CREATE — stub (replaced in Plan 3)
    │   ├── BuildPage.tsx              CREATE — stub (replaced in Plan 4)
    │   └── BuildWorkspacePage.tsx     CREATE — stub (replaced in Plan 4)
    ├── components/
    │   └── NavBar.tsx                 CREATE — desktop top bar (52px) + mobile bottom tab bar (56px), Framer Motion buttons
    └── __tests__/
        ├── KOSContext.test.tsx        CREATE
        ├── NavBar.test.tsx            CREATE
        └── App.test.tsx               CREATE
```

---

### Task 1: Test Infrastructure

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/setupTests.ts`

- [ ] **Step 1: Install vitest and testing-library**

```bash
cd frontend && npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 2: Add vitest config to vite.config.ts**

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
})
```

- [ ] **Step 3: Create setupTests.ts**

```ts
// frontend/src/setupTests.ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

Add to `"scripts"`:
```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Add tsconfig support for vitest globals**

In `frontend/tsconfig.app.json`, add `"types": ["vitest/globals"]` inside `compilerOptions`:
```json
"types": ["vitest/globals"]
```

- [ ] **Step 6: Write a smoke test to verify the setup works**

Create `frontend/src/__tests__/smoke.test.ts`:
```ts
describe('test setup', () => {
  it('passes', () => {
    expect(true).toBe(true)
  })
})
```

- [ ] **Step 7: Run to verify**

```bash
cd frontend && npm run test:run
```
Expected: 1 test passed

- [ ] **Step 8: Commit**

```bash
cd frontend && git add package.json vite.config.ts src/setupTests.ts src/__tests__/smoke.test.ts tsconfig.app.json
git commit -m "chore: add vitest + testing-library setup"
```

---

### Task 2: Install App Dependencies

**Files:**
- Modify: `frontend/package.json`

Note: `react-router-dom` is already in `package.json` from the scaffold. Only the packages below are new.

- [ ] **Step 1: Install app dependencies**

```bash
cd frontend && npm install @tanstack/react-query framer-motion lucide-react
```

- [ ] **Step 2: Verify install**

```bash
cd frontend && node -e "require('./node_modules/@tanstack/react-query')" && echo 'react-query ok'
cd frontend && node -e "require('./node_modules/framer-motion')" && echo 'framer-motion ok'
cd frontend && node -e "require('./node_modules/lucide-react')" && echo 'lucide-react ok'
```
Expected: three `ok` lines

- [ ] **Step 3: Commit**

```bash
cd frontend && git add package.json package-lock.json
git commit -m "chore: add @tanstack/react-query, framer-motion, lucide-react"
```

---

### Task 3: Tailwind Color Tokens + Typography

**Files:**
- Modify: `frontend/tailwind.config.js`

- [ ] **Step 1: Write a failing test**

Create `frontend/src/__tests__/tokens.test.ts`:
```ts
import config from '../../tailwind.config.js'

describe('tailwind color tokens', () => {
  it('defines bg-deep', () => {
    expect(config.theme.extend.colors['bg-deep']).toBe('#05000e')
  })
  it('defines purple-primary', () => {
    expect(config.theme.extend.colors['purple-primary']).toBe('#8b5cf6')
  })
  it('defines text-primary', () => {
    expect(config.theme.extend.colors['text-primary']).toBe('#f0eeff')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/tokens.test.ts
```
Expected: FAIL — properties undefined

- [ ] **Step 3: Replace tailwind.config.js with KOS tokens**

```js
// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'Fira Code'", "'SF Mono'", 'monospace'],
        sans: ['-apple-system', 'Inter', 'sans-serif'],
      },
      colors: {
        'bg-deep':        '#05000e',
        'bg-tool':        '#0e0e12',
        'bg-card':        '#16161c',
        'purple-primary': '#8b5cf6',
        'purple-bright':  '#a78bfa',
        'purple-soft':    '#c4b5fd',
        'purple-dim':     '#6d28d9',
        'text-primary':   '#f0eeff',
      },
    },
  },
  plugins: [],
}
```

Note: `text-muted` is `rgba(255,255,255,.35)` — not expressible as a named Tailwind color. Use the Tailwind arbitrary value `text-[rgba(255,255,255,0.35)]` or inline style `style={{ color: 'rgba(255,255,255,.35)' }}` wherever it's needed.

- [ ] **Step 4: Run test to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/tokens.test.ts
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add tailwind.config.js src/__tests__/tokens.test.ts
git commit -m "feat: add KOS color tokens to Tailwind config"
```

---

### Task 4: Google Fonts + Minimal index.css

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Add Google Fonts to index.html**

In `frontend/index.html`, add inside `<head>`, before the title:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Strip index.css to Tailwind directives only**

Replace the entire contents of `frontend/src/index.css` with:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

That is the complete file. No custom rules, no CSS variables, no keyframes.

- [ ] **Step 3: Commit**

```bash
cd frontend && git add index.html src/index.css
git commit -m "feat: add Google Fonts and strip index.css to Tailwind directives only"
```

---

### Task 5: Shared Types

**Files:**
- Create: `frontend/src/types/kos.ts`

These types are used across all four plans. Defining them once here avoids duplication.

- [ ] **Step 1: Write a type import test**

Create `frontend/src/__tests__/types.test.ts`:
```ts
import type { KOSNode, KOSCluster, BuildSession } from '../types/kos'

describe('kos types', () => {
  it('KOSNode is structurally correct', () => {
    const node: KOSNode = {
      id: 'n1', label: 'Test', cluster: 0, connections: [],
      insight: 'An insight', date: 'Mar 25, 2026',
      x: 0, y: 0, r: 6, floatPhase: 0,
    }
    expect(node.id).toBe('n1')
  })

  it('KOSCluster is structurally correct', () => {
    const cluster: KOSCluster = {
      name: 'Learning', color: [139, 92, 246], cx: 0, cy: 0, spread: 100,
    }
    expect(cluster.name).toBe('Learning')
  })

  it('BuildSession is structurally correct', () => {
    const session: BuildSession = {
      id: 's1', appType: 'script', topic: 'AI', format: 'Educational',
      sourceIds: [], externalSources: [],
      draft: { type: 'script', text: '' },
      updatedAt: new Date().toISOString(),
    }
    expect(session.appType).toBe('script')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/types.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create the types file**

Create `frontend/src/types/kos.ts`:
```ts
export interface KOSNode {
  id: string
  label: string
  cluster: number
  connections: string[]
  insight: string
  date: string
  // Derived at render time:
  x: number
  y: number
  r: number
  floatPhase: number
}

export interface KOSCluster {
  name: string
  color: [number, number, number]  // RGB
  cx: number
  cy: number
  spread: number
}

export type AppType = 'script' | 'exam' | 'ask' | 'summary' | 'thread'

type ScriptDraft  = { type: 'script';   text: string }
type ExamDraft    = { type: 'exam';     questions: { id: string; text: string; answer: string; collapsed: boolean }[] }
type AskDraft     = { type: 'ask';      answer: string }
type SummaryDraft = { type: 'summary';  text: string }
type ThreadDraft  = { type: 'thread';   blocks: { id: string; text: string }[] }
export type AppDraft = ScriptDraft | ExamDraft | AskDraft | SummaryDraft | ThreadDraft

export interface BuildSession {
  id: string
  appType: AppType
  topic: string
  format: string
  length?: string
  sourceIds: string[]
  externalSources: { type: string; label: string; url?: string }[]
  draft: AppDraft
  updatedAt: string
}
```

- [ ] **Step 4: Run test to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/types.test.ts
```
Expected: 3 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/types/kos.ts src/__tests__/types.test.ts
git commit -m "feat: add shared KOS TypeScript types"
```

---

### Task 6: React Context for UI State

**Files:**
- Create: `frontend/src/context/KOSContext.tsx`
- Create: `frontend/src/__tests__/KOSContext.test.tsx`

This context owns UI state that must be shared across modes: the current mode, the selected graph node, and the TALK context pre-seed. It does NOT own server data — that's React Query's job (Plan 3 for graph data, Plan 4 for build sessions).

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/KOSContext.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { KOSProvider, useKOS } from '../context/KOSContext'

function ModeDisplay() {
  const { mode, setMode } = useKOS()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode('explore')}>go explore</button>
      <button onClick={() => setMode('build')}>go build</button>
    </div>
  )
}

function NodeDisplay() {
  const { selectedNodeId, setSelectedNodeId } = useKOS()
  return (
    <div>
      <span data-testid="node">{selectedNodeId ?? 'none'}</span>
      <button onClick={() => setSelectedNodeId('node-1')}>select</button>
      <button onClick={() => setSelectedNodeId(null)}>deselect</button>
    </div>
  )
}

describe('KOSContext', () => {
  it('initializes mode as talk', () => {
    render(<KOSProvider><ModeDisplay /></KOSProvider>)
    expect(screen.getByTestId('mode').textContent).toBe('talk')
  })

  it('setMode updates mode', () => {
    render(<KOSProvider><ModeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('go explore'))
    expect(screen.getByTestId('mode').textContent).toBe('explore')
  })

  it('setSelectedNodeId updates selectedNodeId', () => {
    render(<KOSProvider><NodeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('select'))
    expect(screen.getByTestId('node').textContent).toBe('node-1')
  })

  it('setSelectedNodeId(null) clears selection', () => {
    render(<KOSProvider><NodeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('select'))
    fireEvent.click(screen.getByText('deselect'))
    expect(screen.getByTestId('node').textContent).toBe('none')
  })

  it('throws if useKOS used outside KOSProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ModeDisplay />)).toThrow()
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/KOSContext.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Create KOSContext**

Create `frontend/src/context/KOSContext.tsx`:
```tsx
import { createContext, useContext, useState, ReactNode } from 'react'

export type Mode = 'talk' | 'explore' | 'build'

interface TalkContextData {
  nodeId?: string
  nodeLabel?: string
  nodeInsight?: string
}

interface KOSContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  talkContext: TalkContextData | null
  setTalkContext: (ctx: TalkContextData | null) => void
}

const KOSCtx = createContext<KOSContextValue | null>(null)

export function KOSProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('talk')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [talkContext, setTalkContext] = useState<TalkContextData | null>(null)

  return (
    <KOSCtx.Provider value={{ mode, setMode, selectedNodeId, setSelectedNodeId, talkContext, setTalkContext }}>
      {children}
    </KOSCtx.Provider>
  )
}

export function useKOS(): KOSContextValue {
  const ctx = useContext(KOSCtx)
  if (!ctx) throw new Error('useKOS must be used within KOSProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/KOSContext.test.tsx
```
Expected: 5 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/context/KOSContext.tsx src/__tests__/KOSContext.test.tsx
git commit -m "feat: add KOS React Context for UI state (mode, selectedNodeId, talkContext)"
```

---

### Task 7: Page Stubs

**Files:**
- Create: `frontend/src/pages/TalkPage.tsx`
- Create: `frontend/src/pages/ExplorePage.tsx`
- Create: `frontend/src/pages/BuildPage.tsx`
- Create: `frontend/src/pages/BuildWorkspacePage.tsx`

Minimal stubs — replaced in Plans 2, 3, and 4. They exist so routing works from day one.

- [ ] **Step 1: Create TalkPage stub**

```tsx
// frontend/src/pages/TalkPage.tsx
export default function TalkPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
        TALK — coming soon
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create ExplorePage stub**

```tsx
// frontend/src/pages/ExplorePage.tsx
export default function ExplorePage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
        EXPLORE — coming soon
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Create BuildPage stub**

```tsx
// frontend/src/pages/BuildPage.tsx
export default function BuildPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
        BUILD — coming soon
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Create BuildWorkspacePage stub**

```tsx
// frontend/src/pages/BuildWorkspacePage.tsx
import { useParams } from 'react-router-dom'

export default function BuildWorkspacePage() {
  const { appType } = useParams<{ appType: string }>()
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
        {appType?.toUpperCase()} WORKSPACE — coming soon
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/pages/
git commit -m "feat: add page stubs for TALK, EXPLORE, BUILD routes"
```

---

### Task 8: NavBar Component

**Files:**
- Create: `frontend/src/components/NavBar.tsx`
- Create: `frontend/src/__tests__/NavBar.test.tsx`

Two visual forms:
- **Desktop (≥768px):** `hidden md:flex` — fixed top, 52px. Logo `K·O·S` left; mode pills center; context info right.
- **Mobile (<768px):** `flex md:hidden` — fixed bottom, 56px. Icon + label tabs.

Active mode from `useKOS()`. Navigation via `useNavigate`. Framer Motion on buttons for press feedback (`whileTap`) and active-pill scale (`animate`).

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/NavBar.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { KOSProvider, useKOS } from '../context/KOSContext'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <KOSProvider><MemoryRouter>{children}</MemoryRouter></KOSProvider>
}

describe('NavBar', () => {
  it('renders the KOS logo', () => {
    render(<Wrapper><NavBar /></Wrapper>)
    expect(screen.getAllByText('K·O·S').length).toBeGreaterThan(0)
  })

  it('renders all three mode labels', () => {
    render(<Wrapper><NavBar /></Wrapper>)
    expect(screen.getAllByText('TALK').length).toBeGreaterThan(0)
    expect(screen.getAllByText('EXPLORE').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BUILD').length).toBeGreaterThan(0)
  })

  it('clicking EXPLORE sets mode to explore', () => {
    let capturedMode = ''
    function Spy() {
      const { mode } = useKOS()
      capturedMode = mode
      return null
    }
    render(<KOSProvider><MemoryRouter><NavBar /><Spy /></MemoryRouter></KOSProvider>)
    fireEvent.click(screen.getAllByText('EXPLORE')[0])
    expect(capturedMode).toBe('explore')
  })

  it('clicking BUILD sets mode to build', () => {
    let capturedMode = ''
    function Spy() {
      const { mode } = useKOS()
      capturedMode = mode
      return null
    }
    render(<KOSProvider><MemoryRouter><NavBar /><Spy /></MemoryRouter></KOSProvider>)
    fireEvent.click(screen.getAllByText('BUILD')[0])
    expect(capturedMode).toBe('build')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/NavBar.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Create NavBar**

Create `frontend/src/components/NavBar.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, GitBranch, Layers } from 'lucide-react'
import { useKOS, type Mode } from '../context/KOSContext'

const ROUTE_MAP: Record<Mode, string> = {
  talk:    '/',
  explore: '/explore',
  build:   '/build',
}

const TABS: { mode: Mode; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { mode: 'talk',    label: 'TALK',    Icon: Mic },
  { mode: 'explore', label: 'EXPLORE', Icon: GitBranch },
  { mode: 'build',   label: 'BUILD',   Icon: Layers },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { mode, setMode } = useKOS()
  const isBuild = mode === 'build'

  function handleNav(m: Mode) {
    setMode(m)
    navigate(ROUTE_MAP[m])
  }

  return (
    <>
      {/* ── Desktop: fixed top bar ── */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-[100] h-[52px] items-center px-6"
        style={{ background: 'rgba(8,3,20,.85)', backdropFilter: 'blur(16px)' }}
      >
        {/* Logo */}
        <span className="font-mono text-xs tracking-[4px] uppercase text-purple-soft opacity-60 w-24 shrink-0">
          K·O·S
        </span>

        {/* Mode pills — centered */}
        <div className="flex-1 flex items-center justify-center gap-1">
          {TABS.map(({ mode: m, label }) => {
            const isActive = mode === m
            return (
              <motion.button
                key={m}
                onClick={() => handleNav(m)}
                whileTap={{ scale: 0.95 }}
                animate={isActive ? { opacity: 1 } : { opacity: 0.35 }}
                transition={{ duration: 0.15 }}
                className={[
                  'font-mono text-[11px] tracking-[3px] uppercase px-3 py-1 rounded border',
                  isActive
                    ? isBuild
                      ? 'text-purple-bright border-purple-dim/40 bg-purple-dim/10'
                      : 'text-purple-bright border-purple-bright/40 bg-purple-bright/10'
                    : 'text-white border-transparent hover:text-white/60',
                ].join(' ')}
                style={isActive && !isBuild ? {
                  boxShadow: '0 0 12px rgba(167,139,250,0.25)',
                } : undefined}
              >
                {label}
              </motion.button>
            )
          })}
        </div>

        {/* Right spacer (context info added in Plan 3 when graph data is available) */}
        <div className="w-24 shrink-0" />
      </nav>

      {/* ── Mobile: fixed bottom tab bar ── */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[56px] items-stretch"
        style={{
          background: 'rgba(8,3,20,.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {TABS.map(({ mode: m, label, Icon }) => {
          const isActive = mode === m
          return (
            <motion.button
              key={m}
              onClick={() => handleNav(m)}
              whileTap={{ scale: 0.92 }}
              animate={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              <Icon size={18} />
              <span className="font-mono text-[9px] tracking-[2px] uppercase">{label}</span>
            </motion.button>
          )
        })}
      </nav>
    </>
  )
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/NavBar.test.tsx
```
Expected: 4 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/NavBar.tsx src/__tests__/NavBar.test.tsx
git commit -m "feat: add responsive NavBar with Framer Motion button animations"
```

---

### Task 9: App Layout + React Query Setup + Framer Motion Route Transitions

**Files:**
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/__tests__/App.test.tsx`

`main.tsx` wraps the app in `QueryClientProvider`. `App.tsx` adds `KOSProvider`, the mode-aware background (Framer Motion animated div), and `AnimatePresence` for page crossfades.

- [ ] **Step 1: Write failing route tests**

Create `frontend/src/__tests__/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

function renderApp(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App routing', () => {
  it('renders TalkPage at /', () => {
    renderApp('/')
    expect(screen.getByText(/TALK/i)).toBeInTheDocument()
  })

  it('renders ExplorePage at /explore', () => {
    renderApp('/explore')
    expect(screen.getByText(/EXPLORE/i)).toBeInTheDocument()
  })

  it('renders BuildPage at /build', () => {
    renderApp('/build')
    expect(screen.getByText(/BUILD/i)).toBeInTheDocument()
  })

  it('renders BuildWorkspacePage at /build/script', () => {
    renderApp('/build/script')
    expect(screen.getByText(/SCRIPT/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify failures**

```bash
cd frontend && npm run test:run -- src/__tests__/App.test.tsx
```
Expected: FAIL — routes not wired

- [ ] **Step 3: Update main.tsx to add QueryClientProvider**

Read the current `frontend/src/main.tsx` first, then replace it:
```tsx
// frontend/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
```

- [ ] **Step 4: Rewrite App.tsx**

Note: App.tsx does NOT include its own `BrowserRouter` — routing is provided by `main.tsx`. The test wrapper provides `MemoryRouter` instead.

```tsx
// frontend/src/App.tsx
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { KOSProvider, useKOS } from './context/KOSContext'
import NavBar from './components/NavBar'
import TalkPage from './pages/TalkPage'
import ExplorePage from './pages/ExplorePage'
import BuildPage from './pages/BuildPage'
import BuildWorkspacePage from './pages/BuildWorkspacePage'

const BG: Record<string, string> = {
  talk:    '#05000e',
  explore: '#05000e',
  build:   '#0e0e12',
}

function Layout() {
  const location = useLocation()
  const { mode } = useKOS()

  return (
    <motion.div
      className="min-h-screen text-text-primary"
      animate={{ backgroundColor: BG[mode] }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <NavBar />
      <main className="md:mt-[52px] pb-[56px] md:pb-0 h-screen md:h-[calc(100vh-52px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Routes location={location}>
              <Route path="/"               element={<TalkPage />} />
              <Route path="/explore"        element={<ExplorePage />} />
              <Route path="/build"          element={<BuildPage />} />
              <Route path="/build/:appType" element={<BuildWorkspacePage />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </main>
    </motion.div>
  )
}

export default function App() {
  return (
    <KOSProvider>
      <Layout />
    </KOSProvider>
  )
}
```

- [ ] **Step 5: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/App.test.tsx
```
Expected: 4 tests pass

- [ ] **Step 6: Run all tests to confirm no regressions**

```bash
cd frontend && npm run test:run
```
Expected: All tests pass

- [ ] **Step 7: Type-check**

```bash
cd frontend && npm run type-check
```
Expected: No TypeScript errors

- [ ] **Step 8: Visual smoke test**

```bash
cd frontend && npm run dev
```
Open `http://localhost:5173`. Verify:
- Background is deep purple-black (`#05000e`)
- Desktop: top nav with K·O·S + TALK · EXPLORE · BUILD pills
- Mobile (resize to <768px): bottom tab bar with icons
- Clicking BUILD shifts background to `#0e0e12` with smooth Framer Motion transition
- Route transitions fade out/in (300ms)
- Button taps have a slight scale-down feel

- [ ] **Step 9: Final commit**

```bash
cd frontend && git add src/main.tsx src/App.tsx src/__tests__/App.test.tsx
git commit -m "feat: wire routes, QueryClientProvider, KOSProvider, and Framer Motion transitions"
```

---

## Done

After completing all 9 tasks:
- All tests pass: `cd frontend && npm run test:run`
- Dev server runs: `cd frontend && npm run dev`
- Type-check passes: `cd frontend && npm run type-check`

**Next plans (in any order after this foundation):**
- `2026-03-25-kos-talk-mode.md` — TALK canvas, audio, state machine
- `2026-03-25-kos-explore-mode.md` — EXPLORE graph canvas, pan/zoom, detail panel
- `2026-03-25-kos-build-mode.md` — BUILD home grid, 5 workspaces, localStorage sessions
