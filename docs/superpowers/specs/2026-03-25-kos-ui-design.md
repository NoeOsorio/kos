# KOS — UI Design Spec
**Date:** 2026-03-25
**Status:** Approved by user

---

## Overview

KOS (Knowledge Operating System) is a three-mode app that feels like a living intelligence, not a note-taking tool. The UI has two distinct visual registers:

- **Cosmic / Immersive** — TALK and EXPLORE modes. Deep space aesthetic, purple nebula palette, animated rings, particle systems.
- **Tool / Readable** — BUILD mode. Dark neutral background, white text, functional layout. Feels like Linear or Raycast.

The three modes are accessible via a persistent nav: **TALK · EXPLORE · BUILD**

---

## Visual Foundation

### Color Palette
| Token | Value | Usage |
|---|---|---|
| `bg-deep` | `#05000e` | TALK / EXPLORE background |
| `bg-tool` | `#0e0e12` | BUILD background |
| `bg-card` | `#16161c` | BUILD cards and items |
| `purple-primary` | `#8b5cf6` (139,92,246) | Primary accent |
| `purple-bright` | `#a78bfa` (167,139,250) | Active states, glow |
| `purple-soft` | `#c4b5fd` (196,181,253) | Text on dark |
| `purple-dim` | `#6d28d9` (109,40,217) | Rings, halos |
| `text-primary` | `#f0eeff` | BUILD mode body text |
| `text-muted` | `rgba(255,255,255,.35)` | BUILD mode secondary |

### Typography
- **Monospace labels:** `'Fira Code', 'SF Mono', monospace` — loaded via Google Fonts CDN (`Fira Code` weights 400/600). Letter-spacing 2–4px, uppercase. SF Mono is macOS/iOS only; Fira Code is the web-safe primary.
- **Body text:** `-apple-system, 'Inter', sans-serif` — Inter loaded via Google Fonts as fallback.
- **Sizes:** 9px labels → 10px tags → 12px secondary → 14px body → 18–22px headings

### Mode Transitions
All mode switches: **300ms opacity crossfade** (`ease-in-out`). The outgoing screen fades to 0, incoming fades in from 0. Background color interpolates via CSS transition on `body` background.

---

## Navigation

### Desktop (≥768px) — Top Nav
Fixed at top, height **52px**, `z-index: 100`. `position: fixed`, full width. Canvas and page content reserve `margin-top: 52px` (not overlapped).

```
K·O·S          TALK · EXPLORE · BUILD          3 areas · 20 nodes
```
- Logo left, mode pills center, context info right
- Background: `rgba(8,3,20,.85)` with `backdrop-filter: blur(16px)`
- In TALK/EXPLORE: mode pills have purple glow style
- In BUILD: pills are clean minimal, no glow

### Mobile (<768px) — Bottom Tab Bar
The top nav is **replaced** by a fixed bottom tab bar (iOS pattern). Height: **56px**, `z-index: 100`, `position: fixed`, bottom: 0. Page content reserves `padding-bottom: 56px`.

Tab bar shows: TALK · EXPLORE · BUILD — icon + label each. No logo or context info.

---

## Mode 1 — TALK

**Purpose:** Input knowledge through Socratic conversation (voice + text).

### Layout
Full-screen immersive canvas. Content sits below the 52px nav (desktop) or above the 56px tab bar (mobile). Visualizer is centered in the remaining viewport.

**Desktop visualizer diameter: 480px** (centered horizontally and vertically in available space). All ring radii and bar geometry are defined relative to this container — they do not scale with viewport directly. If viewport height is less than 600px, diameter reduces to `min(viewport height - 200px, 480px)`.

**Mobile visualizer diameter: 240px.**

All visual layers are absolutely stacked canvases within the visualizer container:

1. **Starfield canvas** — 130 micro-stars across the full viewport (not just the visualizer). Individual twinkle animations via CSS custom properties.
2. **Siri-style fluid waves canvas** — 5 overlapping sine wave curves drawn radially (circular at r=122px from center), colors from purple spectrum, amplitude driven by audio state.
3. **HUD rings SVG** — 4 concentric rings at radii 72 / 100 / 130 / 158px from visualizer center. Each rotates independently via CSS `animation` on `transform-origin: center`. Ring specs:
   - r=72: 5s CCW, dash `4 6.3`, 2 bright arcs, glow filter σ=4
   - r=100: 10s CW, dash `6 4`, 2 bright arcs, glow filter σ=2.5
   - r=130: 20s CCW, dash `2 8.2`, 1 arc + 3 data blocks, glow filter σ=1.5
   - r=158: 30s CW, dash `3 14.5`, 3 arcs, glow filter σ=1.5
4. **Radial frequency bars canvas** — 64 bars, inner radius 80px, max bar height 48px. Color: `rgb(109+v×123, 40+v×141, 217+v×38)` where v=0→1. Tip dots appear when v>0.4.
5. **Particle nebula canvas** — 44 particles in 3 loose orbital bands (base radii 8 / 17 / 27px). Each particle has: angle, speed (positive or negative), breathe phase, drift rate, size (0.7–2.2px), alpha (0.35–0.85), color from purple spectrum. Particles accelerate with audio amplitude. Central radial glow breathes with amplitude.
6. **Status text** — 10px Fira Code, below visualizer center: STANDBY / LISTENING / PROCESSING / SPEAKING

### States & Animation
| State | Particle speed mult | Wave amplitude | Ring speed mult | Freq bars baseline |
|---|---|---|---|---|
| STANDBY | 0.6× | 0.18 | 0.8× | ~6% |
| LISTENING | 1.4× | 0.72 | 1.5× | ~42% |
| PROCESSING | 2.2× | 0.38 | 2.5× | ~35% |
| SPEAKING | 3.0× | 1.0 | 3.5× | ~65% |

**Lerp implementation (delta-time safe):**
```ts
// Call each frame with deltaMs from rAF timestamp
lerp(current, target, 1 - Math.pow(1 - 0.045, deltaMs / 16.67))
```
This produces consistent animation speed regardless of refresh rate.

### Bottom UI
Positioned below the visualizer, centered, max-width 380px:
- Italic transcript text (KOS response or current prompt) — min-height 48px
- Input row: text field (flex:1, rounded-full, minimal border) + mic button (50px circle)
- Mic button pulses with `box-shadow` animation when LISTENING

### Mobile
Visualizer 240px. Input row at bottom above tab bar. Mic is the primary CTA.

---

## Mode 2 — EXPLORE

**Purpose:** Navigate the knowledge graph as a constellation. Read insights, discover connections.

### Layout
Full-screen interactive canvas (below nav / above tab bar). Pan with drag, zoom with scroll/pinch. `cursor: grab`, `cursor: grabbing` while dragging, `cursor: pointer` on node hover.

### Visual Elements

- **Starfield** — same as TALK, full viewport, parallax shifts subtly with camera pan (stars move at 0.1× camera speed)
- **Nebula halos** — per-cluster radial gradient glow: `rgba(clusterColor, .055)` at center → transparent at `cluster.spread × camZ × 1.25`
- **Cluster labels** — fade in above zoom 0.48×, 28% opacity, `rgba(clusterColor, .28)`, Fira Code 9.5px
- **Edges:**
  - Resting: `rgba(139,92,246,.15)`, 0.7px
  - Hover (no selection): `rgba(139,92,246,.38)`, 1.2px
  - Connected to selected: `rgba(196,181,253,.55)`, 1.8px
  - Dimmed: `rgba(139,92,246,.04)`, 0.5px
- **Nodes:**
  - Radius: `r = 6 + connections.length × 1.1` (world units, scaled by `camZ`)
  - Resting: core dot at 78% opacity + radial glow halo at 2× radius
  - Hover: glow radius 3.5×, core opacity 100%
  - Selected: glow radius 5×, double animated pulse ring (outer at 3.5×r, inner at 2.2×r), both oscillate with `sin(t)`
  - Connected to selected: single ring at 1.8×r, 25% opacity
  - Dimmed (selection active, not selected/connected): 18% opacity
  - Float animation: `x += sin(t×0.28 + phase) × 0.9`, `y += cos(t×0.21 + phase) × 0.65`
- **Minimap** — desktop only (hidden on mobile). Fixed bottom-right, 88×68px, 20px from right edge, 20px from bottom. Shows cluster-colored dots + viewport rectangle `rgba(196,181,253,.3)`.

### Graph Data Model
```ts
interface KOSNode {
  id: string
  label: string
  cluster: number        // index into CLUSTERS array
  connections: string[]  // array of node IDs
  insight: string        // body text shown in detail panel
  date: string           // e.g. "Mar 10, 2026"
  // derived at render time:
  x: number; y: number   // world coordinates, set on load
  r: number              // computed from connections.length
  floatPhase: number     // random, set on load
}

interface KOSCluster {
  name: string
  color: [number, number, number]  // RGB
  cx: number; cy: number           // world center
  spread: number                   // scatter radius
}
```

**Data source:** Global Zustand store (`useGraphStore`). Initially seeded with mock data. Real data fetched from `GET /api/graph` on mount — returns `{ nodes: KOSNode[], clusters: KOSCluster[] }`.

### Empty State
When `nodes.length === 0` (new user or no results): canvas shows starfield only, center overlay reads:
> "Your constellation is empty.
> Start a conversation in TALK to log your first insight."
CTA button → navigates to TALK mode.

When search returns zero results: overlay reads "No nodes match — try a different term."

### Node Interaction — Tap/Click
1. Graph lerps camera toward selected node. Camera transform is applied as `translate(-camX × camZ, -camY × camZ)` from canvas center, so centering on a node means `targetCamX = -node.x`, `targetCamY = -node.y`. Lerp uses the same delta-time formula as TALK: `camX += (targetCamX - camX) × (1 - Math.pow(1 - 0.06, deltaMs / 16.67))`
2. Selected node: animated double pulse ring
3. Connected nodes + edges highlight; everything else dims to 18%
4. Detail panel slides in from right (`translateX(0)`, 300ms `cubic-bezier(.4,0,.2,1)`)
5. Minimap shifts left by panel width + 18px margin

### Detail Panel (300px)
- Cluster tag — colored, Fira Code, uppercase
- Node title — 18px bold
- Date logged — Fira Code, muted
- Insight body text — 14px, 1.7 line-height
- **Connected ideas** — chips by cluster color; click → jumps to that node (closes current, opens new)
- **"Ask KOS about this" button** → stores node context in global store, navigates to TALK mode. TALK mode reads context on mount and pre-seeds the conversation.

### Panel Close
Click empty canvas → panel slides out (`translateX(100%)`), selection cleared, graph returns to full state.

### Top Bar (desktop only)
Search input, right-aligned, 160px wide. Filters nodes and edges in real time — non-matching nodes fade to 0, matching nodes stay full opacity.

### Mobile
Pinch to zoom, tap to select. Detail panel becomes a **bottom sheet** — slides up from bottom, height 60% of viewport, rounded top corners. Drag handle at top. Tap outside to dismiss.

---

## Mode 3 — BUILD

**Purpose:** Use accumulated knowledge to produce real outputs. Tool feel, not cosmic.

### Visual Register
- Background: `#0e0e12`; cards: `#16161c`; borders: `rgba(255,255,255,.08)`
- Text: `#f0eeff` primary, `rgba(255,255,255,.35)` muted
- Purple only for: active source toggles, selected pills, primary CTA, inline node citation chips
- No canvas animations — fully static layout

### Home Screen
```
"What do you want to build?"
[subtitle: Use your knowledge graph to create something real.]

[App grid]

RECENT ──────────────────
[Recent session list]
```

**Application grid** — CSS grid, `auto-fill, minmax(200px, 1fr)`, gap 12px:

| App | Icon | Tag |
|---|---|---|
| Video Script | 🎬 | SCRIPT |
| Self Exam | 📝 | SPACED REP |
| Ask Your Brain | 💬 | RAG |
| Topic Summary | 📄 | SYNTHESIS |
| Thread / Post | 🧵 | SOCIAL |
| (Coming soon) | ＋ | SOON |

Each card: icon, name, 1-line description, tag badge. Hover: `translateY(-1px)`, brighter border.

**Recent sessions list** — max 5 items. Each row: icon, title, "App type · X days ago", node pills. Clicking a recent session reopens that workspace with the same topic, format, and sources pre-filled.

**Session persistence:** Sessions saved to `localStorage` as JSON array `kos_build_sessions`. Schema:
```ts
// Structured draft types per app — preserves app-specific state on restore
type ScriptDraft  = { type: 'script';  text: string }
type ExamDraft    = { type: 'exam';    questions: { id: string; text: string; answer: string; collapsed: boolean }[] }
type AskDraft     = { type: 'ask';     answer: string }
type SummaryDraft = { type: 'summary'; text: string }
type ThreadDraft  = { type: 'thread';  blocks: { id: string; text: string }[] }
type AppDraft = ScriptDraft | ExamDraft | AskDraft | SummaryDraft | ThreadDraft

interface BuildSession {
  id: string
  appType: 'script' | 'exam' | 'ask' | 'summary' | 'thread'
  topic: string
  format: string  // per-app pill value: script→'Personal'|'Educational'|'Opinion'|'Story', exam→'10 Questions'|'5 Questions'|'Custom', ask→'Detailed'|'Brief', summary→'Bullet Points'|'Paragraph'|'Key Takeaways', thread→'Twitter/X'|'LinkedIn'|'Threads'
  length?: string
  sourceIds: string[]      // graph node IDs
  externalSources: { type: string; label: string; url?: string }[]
  draft: AppDraft          // discriminated union — type matches appType
  updatedAt: string        // ISO timestamp
}
```

### Application Workspaces

All apps share the **same two-column workspace shell**:
- Left sidebar (280px, fixed)
- Right draft area (flex:1)

Sidebar content and draft section tags differ per app. The `Build →` button always triggers generation. The sidebar always has: back link, title, topic field, knowledge sources. Per-app additions:

#### 🎬 Video Script
- **Format pills** (single-select): Personal · Educational · Opinion · Story
- **Length pills** (single-select): 1 min · 3 min · 7 min · 10+ min
- **Draft sections:** HOOK (0:00–0:20) · PROBLEM · PERSONAL · MECHANISM · CTA

#### 📝 Self Exam
- **Topic scope** — textarea (what to be tested on)
- **Difficulty pills**: Easy · Medium · Hard
- **Question count pills**: 5 · 10 · 20
- **Draft sections:** numbered questions, each with: question text, answer reveal (collapsed by default, expand on click), source citation

#### 💬 Ask Your Brain
- **Question field** — single-line input ("What do you want to know?")
- No format or length pills
- **Draft sections:** ANSWER (prose, cited) · SOURCES (node chips + web chips) · RELATED NODES (chips linking to EXPLORE)

#### 📄 Topic Summary
- **Depth pills**: Overview · Deep dive
- **Audience pills**: Personal · Shareable
- **Draft sections:** SUMMARY · KEY INSIGHTS (bulleted) · CONNECTIONS (cross-cluster links) · GAPS (what you don't know yet)

#### 🧵 Thread / Post
- **Platform pills**: Twitter/X · LinkedIn
- **Tone pills**: Educational · Personal · Provocative
- **Draft sections:** per tweet/post numbered, each as an individual editable block

### Knowledge Sources (all apps)
Toggleable source list in sidebar. Source types and dot colors:
- 🧠 Graph nodes → **purple** `#a78bfa`
- 📚 Books → **amber** `#fbbf24`
- 🔗 Web links / articles → **cyan** `#38bdf8`
- 🎬 YouTube videos → **red** `#f87171`
- 📄 PDFs / papers → **green** `#34d399`

Each source type has its own color to match inline citation chips in the draft.

"+ Add source" expands an input: paste URL (auto-detects type) · search book by title · upload PDF.

### Live Draft Area
- Top bar: app title left, actions right (Regenerate / Copy / Export)
- Section tags: Fira Code 10px, `rgba(255,255,255,.25)`, with full-width `rgba(255,255,255,.06)` separator line
- Body: 15px Inter, `rgba(240,238,255,.82)`, 1.8 line-height
- **Inline citations:** chips with colored left dot matching source type. Clicking a node chip navigates to EXPLORE with that node selected. Clicking a web chip opens URL in new tab.
- Animated draft cursor during generation
- Sections appear sequentially during generation (fade in, ~800ms between sections)

---

## Responsive / Mobile Summary

| Element | Desktop | Mobile (<768px) |
|---|---|---|
| Mode nav | Fixed top bar, 52px | Fixed bottom tab bar, 56px |
| TALK visualizer | 480px centered | 240px centered |
| TALK input | Below visualizer | Above tab bar |
| EXPLORE canvas | Full viewport minus 52px | Full viewport minus 56px |
| EXPLORE detail | 300px right panel | Bottom sheet, 60% height |
| EXPLORE minimap | Bottom-right, 88×68px | Hidden (space constraint) |
| EXPLORE search | Top-right input | Icon toggle (expands as full-width overlay at top of viewport, above bottom tab bar) |
| BUILD home | 2–3 col grid | 1 col grid |
| BUILD workspace | 280px sidebar + draft | Sidebar becomes a top drawer. State is local React `useState` in the workspace component (no routing or Zustand). Default: collapsed (shows app title + "Configure →" button). Expand to configure, dismiss to see draft full-screen. |

---

## Tech Implementation Notes

### Frontend Stack
- **React 18 + Vite + TypeScript**
- **Tailwind CSS** for BUILD mode layout and global utilities
- **Canvas API** for all animated visualizations (TALK particle nebula, Siri waves, freq bars, EXPLORE graph + starfield)
- **SVG** for TALK HUD rings (CSS `animation` on `transform-origin`)
- **Zustand** for global state (current mode, selected node, TALK context, graph data)
- **Web Audio API** → `AnalyserNode` → `getFloatFrequencyData()` → `Float32Array` for real frequency bars in TALK
- **Web Speech API** → `SpeechRecognition` for voice-to-text; fallback to Whisper API if browser unsupported
- **react-router-dom** — routes: `/` (TALK), `/explore`, `/build`, `/build/:appType`

### Animation Performance
- Single `requestAnimationFrame` loop per mode (not one per component)
- `devicePixelRatio` scaling on all canvases
- Delta-time lerp for all smooth transitions (see formula above)
- Particle float: sine/cosine offsets only — no physics engine
- EXPLORE graph: custom canvas (not Cytoscape.js) for full visual control and consistent cosmic aesthetic — see Open Questions for rationale

### State Machine (TALK)
```
STANDBY → LISTENING (mic activated)
LISTENING → PROCESSING (speech ended / send pressed)
PROCESSING → SPEAKING (first token received from API)
SPEAKING → STANDBY (stream complete)
SPEAKING → PROCESSING (follow-up detected)
```

### Cross-Mode Context Passing (Zustand)
```ts
interface KOSStore {
  mode: 'talk' | 'explore' | 'build'
  talkContext: { nodeId?: string; nodeLabel?: string; nodeInsight?: string } | null
  selectedNodeId: string | null
  graphData: { nodes: KOSNode[]; clusters: KOSCluster[] }
  buildSessions: BuildSession[]
}
```

---

## Open Questions (post-spec)
- Voice input: Web Speech API (free, limited accuracy) vs Whisper API (accurate, ~$0.006/min)?
- Mobile: PWA (simpler) or native shell via Capacitor (better mic/audio access)?
- BUILD "Ask your brain" — streaming response or full response at once?
- EXPLORE graph engine: confirm custom canvas (chosen above) vs reconsider Cytoscape.js?
