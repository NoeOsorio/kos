# Knowledge Cards Redesign

**Date:** 2026-04-01
**Branch:** feat/voice-interaction (targeting main)
**Status:** Approved for implementation

---

## Problem Statement

The current knowledge cards have three critical issues:

1. **Auto-save bug** — `TalkPage` immediately POSTs new topics to `/api/insights/topic` after every `/api/analyze` response, before the user approves anything. The "Save to brain" button is cosmetic; saving already happened.
2. **Auto-dismiss** — cards disappear after 8 seconds with no user action, silently discarding knowledge the user may have wanted to review.
3. **Extraction quality** — the backend prompt produces Wikipedia-style definitions ("An educational facility that uses projection technology…") instead of synthesizing the actual insight from the conversation.
4. **Layout** — cards float over the visualizer on desktop, covering the core UI. Mobile experience is broken.

---

## Design

### 1. Page Layout

**Desktop:**
TalkPage uses a full-height flex row. Default state (no pending cards): single centered column, identical to current behavior. When cards arrive, the layout animates to a two-column grid:
- Left **2/3**: visualizer + status labels + chat input (centered within its column)
- Right **1/3**: knowledge cards panel

Transition is a smooth CSS width animation so the visualizer doesn't jump. The panel fades out and the layout reverts to single-column when all cards are dismissed or saved.

**Mobile:**
Always single-column. The 1/3 panel never appears. Cards are accessed via the bottom drawer (see Section 3).

---

### 2. Knowledge Cards Panel (Desktop)

A scrollable column, vertically aligned to the top with padding. Subtle header: `KNOWLEDGE DETECTED` in the same monospace/uppercase style as the rest of the UI.

**Card anatomy:**
- Concept title (clear, specific — reflects the actual conversation, not a generic name)
- 2–3 sentence insight synthesis written from the conversation context (what Noe said, experienced, or connected — not a definition)
- **Save** button (purple) → saves to DB, card disappears
- **Dismiss** button (✕) → discards, card disappears

**Card lifecycle:**
- Cards have **no auto-dismiss timer** — they stay until the user acts
- Cards are **living**: if a subsequent conversation exchange surfaces the same concept, the card's synthesis is enriched/updated rather than creating a duplicate
- Deduplication logic: backend returns a `topic_key` (normalized concept slug); frontend merges incoming data into the matching pending card if one exists
- Panel fades out entirely when the last card is gone

**No auto-save.** `/api/insights/topic` is only called when the user taps Save.

---

### 3. Mobile Drawer

A **pull handle** (pill-shaped indicator) is always visible at the bottom of the screen. It shows a **badge** with the count of pending cards when the drawer is closed.

Swiping up opens the bottom sheet with two snap points:
- **Half-screen** (default open): shows Pending section
- **Full-screen**: shows both Pending and Saved This Session sections

**Sections:**
- **Pending** — cards awaiting approval, same Save / Dismiss actions as desktop
- **Saved this session** — read-only chronological log of approved knowledge, shown as compact rows (title + truncated synthesis)

Swiping down from either snap point closes the drawer.

---

### 4. Backend Extraction — New Prompt

The extraction prompt is rewritten to produce **conversation-grounded insights**, not definitions.

**New prompt principles:**
- Extract what the user actually said, experienced, or connected — not a topic definition
- Write a 2–3 sentence synthesis in a personal, specific tone ("You visited the AMNH and were struck by the Planetarium…")
- Return a `topic_key`: a normalized slug for deduplication (e.g., `"american-museum-natural-history"`)
- No fixed category field — categorization is the app's emergent job via clustering
- If the exchange contains no extractable personal knowledge (small talk, greetings, simple questions), return empty `new_topics`
- Maximum 2 topics per exchange

**Response shape (updated):**
```json
{
  "new_topics": [
    {
      "topic_key": "american-museum-natural-history",
      "name": "American Museum of Natural History",
      "synthesis": "You visited the AMNH in New York and were particularly struck by the Planetarium. The scale of the museum — its collections spanning natural history across disciplines — made a strong impression."
    }
  ],
  "similar_keywords": ["museum", "planetarium", "new york"]
}
```

The `type` field is removed. The `description` field is replaced by `synthesis`.

---

### 5. Frontend — Card Hydration Logic

`useKnowledgeCards` is updated to support living cards:

- `addCards()` receives the new `topic_key` field
- Before adding a new card, check if a pending card with the same `topic_key` already exists
- If match found: update that card's `synthesis` (append or replace with the richer version), do not create a duplicate
- If no match: add as a new card

The auto-dismiss timer (`AUTO_DISMISS_MS`) and `scheduleAutoDismiss` are removed entirely.

---

### 6. Auto-Save Bug Fix

In `TalkPage.tsx`, remove the block that calls `/api/insights/topic` inside the `.then()` after `/api/analyze`. The only place that endpoint is called is inside `handleSaveCard`.

---

## Files Affected

| File | Change |
|------|--------|
| `frontend/src/pages/TalkPage.tsx` | Two-column layout logic, remove auto-save |
| `frontend/src/components/talk/KnowledgeCards.tsx` | Desktop panel + mobile drawer redesign |
| `frontend/src/hooks/useKnowledgeCards.ts` | Remove auto-dismiss, add hydration/dedup logic |
| `backend/app/api/routes/analyze.py` | New extraction prompt, add `topic_key`, remove `type` |

---

## Out of Scope

- Persistent cross-session knowledge history (future)
- Real pgvector similarity search (already tracked separately)
- Clustering/graph visualization of saved knowledge (future)
