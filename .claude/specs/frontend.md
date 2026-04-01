# Frontend Spec

Stack: Vite + React 18 + TypeScript + Tailwind CSS
Entry: `frontend/src/main.tsx` → `App.tsx`
Dev server: `http://localhost:5173` (proxy `/api/*` → `localhost:8000`)

---

## Pages (`frontend/src/pages/`)

| Page | Route | Purpose |
|------|-------|---------|
| `TalkPage.tsx` | `/` | Main socratic conversation. Nebula visualizer, streaming chat, KnowledgeCards |
| `ExplorePage.tsx` | `/explore` | Interactive knowledge graph canvas + node detail panel |
| `BuildPage.tsx` | `/build` | App selector (script, exam, ask, summary, thread) |
| `BuildWorkspacePage.tsx` | `/build/:appType` | Workspace for each app type |

---

## Components (`frontend/src/components/`)

### Talk (`components/talk/`)
| Component | Purpose |
|-----------|---------|
| `ParticleNebulaCanvas.tsx` | Main interactive orb — press to record voice |
| `KnowledgeCards.tsx` | Slides in after each exchange — new topics + "in your brain" matches |
| `TalkInput.tsx` | Text input bar + send button |
| `WaveCanvas.tsx` | Ambient wave animation behind nebula |
| `FreqBarsCanvas.tsx` | Audio frequency bars around nebula |
| `HUDRingsSVG.tsx` | Rotating HUD rings overlay |
| `StarfieldCanvas.tsx` | Background starfield |

### Explore (`components/explore/`)
| Component | Purpose |
|-----------|---------|
| `GraphCanvas.tsx` | Canvas-based knowledge graph — drag, zoom, hover, click |
| `NodeDetailPanel.tsx` | Slide-in panel on node click — shows insight, date, connections, "Discuss in Talk" |

### Other
| Component | Purpose |
|-----------|---------|
| `NavBar.tsx` | Bottom nav (mobile) / top nav (desktop) |

---

## Hooks (`frontend/src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useTalkMachine.ts` | FSM: IDLE → LISTENING → PROCESSING → RESPONDING → IDLE |
| `useAudioAnalyser.ts` | Mic access + amplitude sampling for visualizers |
| `useSpeechRecognition.ts` | Web Speech API — transcript from voice |
| `useKnowledgeCards.ts` | Card state management — add, dismiss, clearAll |
| `useGraph.ts` | Fetches `/api/graph`, runs `layoutNodes()`, returns `KOSNode[]` + `GraphEdge[]` |
| `useIsMobile.ts` | `window.innerWidth < 768` |
| `useBuildSessions.ts` | Build workspace session state |

---

## Key Types (`frontend/src/types/kos.ts`)

```typescript
RawNode      { id, label, cluster, area, connections, insight, date }
KOSNode      { ...RawNode, x, y, r, floatPhase }  // layout added by graph-layout.ts
GraphEdge    { source, target, weight }
KOSCluster   { name, color: [r,g,b], cx, cy, spread }
BuildSession { id, appType, topic, format, sourceIds, draft, updatedAt }
```

---

## Graph Layout (`frontend/src/utils/graph-layout.ts`)

- `CLUSTERS` — 3 hardcoded clusters: Productivity (purple), Philosophy (blue), Systems (green)
- `LOGICAL_W/H` — 1400 × 900 logical canvas space
- `layoutNodes(raw, clusters)` — assigns x/y/r/floatPhase to each RawNode based on cluster center + deterministic hash

---

## Context (`frontend/src/context/KOSContext.tsx`)

Global state: `mode` (talk/explore/build), `selectedNodeId`, `talkContext` (nodeId, label, insight).
Used to navigate from ExplorePage node → TalkPage with pre-loaded context.

---

## Current Status Summary

| Feature | Status |
|---------|--------|
| Socratic chat (non-streaming) | DONE |
| Streaming SSE chat | TODO (Task 5 in plan) |
| Conversation history across turns | TODO (Task 5) |
| Knowledge graph (mock data) | DONE |
| Knowledge graph (real DB) | TODO (Task 6) |
| KnowledgeCards — show + dismiss | DONE |
| KnowledgeCards — save to brain (real DB) | TODO (Task 3) |
| Area filter in ExplorePage | TODO (Task 8) |
| Voice input via nebula press | DONE |
