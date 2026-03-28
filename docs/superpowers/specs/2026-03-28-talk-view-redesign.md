# Talk View Redesign

**Date:** 2026-03-28
**Status:** Approved

## Overview

Improve the Talk view with three changes: replace the mic button with a walkie-talkie press-and-hold interaction on the particle nebula, add a floating knowledge card system that surfaces detected topics and existing brain matches, and keep the text input for silent-mode use.

---

## 1. Walkie-talkie interaction

### What changes
- The mic button in `TalkInput` is removed.
- The entire `ParticleNebulaCanvas` becomes the interaction zone (`pointer-events: auto`).
- A subtle hint label — "Hold to talk · Release to send" — replaces the mic button area below the visualizer.

### Interaction lifecycle
| Event | Action |
|---|---|
| `pointerdown` on nebula | `startMic()` + `activateMic()` → state: LISTENING |
| `pointerup` / `pointercancel` | `stopMic()` + `stopListening()` + `handleSend(speechTranscript \|\| inputText)` → state: PROCESSING |

Works for both mouse (desktop) and touch (mobile) via the Pointer Events API.

### Visual states (already agreed)
- **STANDBY** — slow orbit, dim glow, no label
- **On press** — ripple burst, particles energize
- **LISTENING (holding)** — fast orbit, strong glow, red ● REC indicator in center
- **PROCESSING (released)** — dashed spinning ring, particles converge inward, `···` label

### Files touched
- `frontend/src/components/talk/ParticleNebulaCanvas.tsx` — add pointer event props
- `frontend/src/components/talk/TalkInput.tsx` — remove mic button, add hint label
- `frontend/src/pages/TalkPage.tsx` — wire `onPointerDown` / `onPointerUp` to nebula

---

## 2. Knowledge card system

### Trigger
After every completed AI response (`streamComplete`), the frontend sends a parallel `POST /api/analyze` with the user message and AI response. This does not block or delay the conversation.

### Backend: `/api/analyze`

**Request:**
```json
{ "message": "string", "response": "string" }
```

**Response:**
```json
{
  "new_topics": [
    { "name": "Stoicism", "description": "Philosophy of virtue and control" }
  ],
  "similar": [
    { "id": "uuid", "title": "Mental models", "excerpt": "The map is not the territory" }
  ]
}
```

- Uses `claude-haiku-4-5` with a tight extraction prompt (cheap, fast).
- Queries the `insights` table with pgvector similarity for the `similar` array (top 3 matches).
- If both arrays are empty, no cards are shown.

### Frontend: `KnowledgeCards` component

New component `frontend/src/components/talk/KnowledgeCards.tsx` managed by a new `useKnowledgeCards` hook.

**Card types:**
- **New topic card** (purple border) — shows topic name + description + "Save to brain" / dismiss (✕)
- **Existing knowledge card** (dim purple border) — shows title + excerpt + "Tap to explore →" (navigates to Explore view)

**Behavior:**
- Cards slide in from the right with a CSS transition.
- Auto-dismiss after 8 seconds if not interacted with.
- "Save to brain" posts `{ title, description }` to `POST /api/insights` and dismisses the card.
- Multiple cards stack vertically; max 3 visible at once (oldest dismissed first if limit exceeded).

### Responsive layout
| Viewport | Cards position |
|---|---|
| Desktop (≥ 768px) | `position: absolute; right: 12px` — float over the visualizer |
| Mobile (< 768px) | `position: fixed; bottom: 0` — bottom sheet with drag handle, slides up |

`useIsMobile` hook (checks `window.innerWidth < 768`, updates on resize).

### Files added/touched
- `frontend/src/components/talk/KnowledgeCards.tsx` — new
- `frontend/src/hooks/useKnowledgeCards.ts` — new
- `frontend/src/hooks/useIsMobile.ts` — new
- `frontend/src/pages/TalkPage.tsx` — call `/api/analyze` after `streamComplete`, pass cards to `KnowledgeCards`
- `backend/app/api/routes/analyze.py` — new endpoint
- `backend/app/api/routes/insights.py` — new endpoint (create insight from card save)
- `backend/app/main.py` — register `/api/analyze` and `/api/insights` routers

---

## 3. Text input

Kept as-is below the visualizer. No changes to the input field itself. The send button (↑) remains. The mic button next to the input is removed — voice is now handled exclusively by the nebula press zone.

---

## 4. Out of scope

- **Help / instructions UI** — to be designed as a separate Settings or About tab in a future spec. The Socratic system prompt is not changed.
- **Conversation history** — backend remains stateless per turn.
- **TTS / audio playback** — not addressed in this spec.

---

## Component map

```
TalkPage
├── StarfieldCanvas          (unchanged)
├── HUDRingsSVG              (unchanged)
├── FreqBarsCanvas           (unchanged)
├── WaveCanvas               (unchanged)
├── ParticleNebulaCanvas     (add pointer events)
├── KnowledgeCards           (new)
└── TalkInput                (remove mic button, add hint label)

hooks/
├── useTalkMachine           (unchanged)
├── useAudioAnalyser         (unchanged)
├── useSpeechRecognition     (unchanged)
├── useKnowledgeCards        (new)
└── useIsMobile              (new)

backend/
├── api/routes/talk.py       (unchanged)
├── api/routes/analyze.py    (new)
└── api/routes/insights.py   (new)
```
