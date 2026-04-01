# Voice Interaction — Design Spec
**Date:** 2026-04-01
**Status:** Approved

## Overview

Replace the broken hold-to-talk behavior with two distinct voice interaction modes: a fixed walkie-talkie (hold) and a Siri-like persistent conversation (double-tap). Animations already match each state; this spec wires interaction to state correctly and adds token hygiene.

---

## Interaction Modes

### Mode 1 — Walkie-Talkie (hold)
- **Hold** nebula (>200ms) → LISTENING animation starts, mic + speech recognition activate
- **Release** → send current transcript, PROCESSING → SPEAKING → STANDBY
- Stateless: no conversation history is sent, each exchange is independent
- Mode resets to `idle` after response completes

### Mode 2 — Conversation (double-tap)
- **Double-tap** nebula (<300ms between taps) → LISTENING, mode = `conversation`
- After AI responds (SPEAKING → stream complete) → mic **auto-activates** (LISTENING), no user action needed
- **10-second silence** while LISTENING → auto-send accumulated transcript
- **Single tap** while in conversation:
  - During SPEAKING → interrupt current stream, go to LISTENING
  - During LISTENING/PROCESSING → exit conversation, go to STANDBY
- **10-minute hard cap** → auto-exit to STANDBY
- Rolling last 10 messages (5 exchanges) sent to API

### Mode 3 — Text input (unchanged)
- Enter key or Send button → send, rolling last 10 messages
- Input field clears after every send

---

## State Machine

Existing `TalkState` unchanged: `STANDBY | LISTENING | PROCESSING | SPEAKING`

New field added to machine: `mode: 'idle' | 'walkie' | 'conversation'`

### New transitions

| Transition | From | To state | To mode |
|-----------|------|----------|---------|
| `enterWalkie()` | STANDBY | LISTENING | walkie |
| `enterConversation()` | STANDBY | LISTENING | conversation |
| `exitConversation()` | any | STANDBY | idle |
| `streamComplete()` — mode=conversation | SPEAKING | **LISTENING** | conversation |
| `streamComplete()` — mode=idle/walkie | SPEAKING/PROCESSING | STANDBY | idle |

---

## `useVoiceInteraction` Hook

**New file:** `frontend/src/hooks/useVoiceInteraction.ts`

Composes `useTalkMachine` + `useSpeechRecognition` + `useAudioAnalyser`. Owns all gesture detection, timers, and conversation loop logic.

### API

```ts
interface UseVoiceInteractionOptions {
  onSend: (text: string, messages: Message[]) => void
  onInterrupt?: () => void   // TalkPage passes: () => abortControllerRef.current?.abort()
}

interface UseVoiceInteractionReturn {
  talkState: TalkState
  visualParams: VisualParams
  mode: Mode
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  conversationTimeLeft: number      // seconds, 0 when not in conversation
  onPointerDown: () => void         // wire to nebula
  onPointerUp: () => void           // wire to nebula
  onPointerCancel: () => void       // wire to nebula
  // TalkPage calls this with its own messages array; hook slices the window internally
  sendText: (text: string, messages: Message[]) => void
}
```

### Gesture detection logic

```
onPointerDown:
  record pressStart = Date.now()
  schedule holdTimer = setTimeout(startWalkie, 200ms)

onPointerUp:
  clear holdTimer
  elapsed = Date.now() - pressStart
  if elapsed >= 200ms:         → releaseWalkie() → send
  else:                        → handleTap()

handleTap():
  if lastTapTime && (now - lastTapTime) < 300ms:
    clearTimeout(doubleTapTimer)
    handleDoubleTap()
  else:
    lastTapTime = now
    doubleTapTimer = setTimeout(handleSingleTap, 300ms)

handleSingleTap():
  if mode === 'conversation':
    if talkState === 'SPEAKING': interrupt + LISTENING
    else: exitConversation()
  // no action from STANDBY on single tap

handleDoubleTap():
  if talkState === 'STANDBY': enterConversation()
```

### Silence detection

Runs as a `useEffect` watching `talkState` and `mode`:
- Active only when `talkState === 'LISTENING'` and `mode === 'conversation'`
- Polls `getAmplitude()` every 100ms
- If amplitude < `0.02` for 10 consecutive seconds → call `sendText(transcript)`
- Resets counter whenever amplitude ≥ `0.02`

### Conversation loop

When `streamComplete()` is called with `mode === 'conversation'`:
1. Machine transitions to LISTENING
2. Hook calls `startMic()` + `startListening()` automatically
3. Silence detector activates

### 10-minute cap

On `enterConversation()`: `setTimeout(exitConversation, 600_000)`
On `exitConversation()`: clear the timeout.

---

## Token Hygiene

Messages array lives in TalkPage (unchanged). After every send:
- Input field clears (`setInputText('')`)
- Speech transcript clears (`clearTranscript()`)
- Only the last 10 messages are passed to `onSend` (sliced before the fetch)

```ts
// Inside sendText(text, messages):
const window = messages.slice(-10)
onSend(text, [...window, { role: 'user', content: text }])
```

Walkie mode: `onSend(text, [{ role: 'user', content: text }])` — no history.

TalkPage keeps the `abortControllerRef` and passes `onInterrupt` to the hook. The hook calls `onInterrupt()` when a tap interrupts a SPEAKING state in conversation mode, then transitions to LISTENING.

---

## Speech Recognition

Change `lang: 'en-US'` → `lang: ''` in `useSpeechRecognition` to use the browser's default language. This supports Spanish and other languages without hardcoding.

---

## Files Changed

| File | Change |
|------|--------|
| `hooks/useVoiceInteraction.ts` | **New** — all gesture + timer + conversation loop logic |
| `hooks/useTalkMachine.ts` | Add `mode`, new transitions, update `streamComplete` |
| `hooks/useSpeechRecognition.ts` | `lang: 'en-US'` → `lang: ''` |
| `pages/TalkPage.tsx` | Replace gesture/mic/loop logic with `useVoiceInteraction`; add message window slice |
| `__tests__/useVoiceInteraction.test.ts` | **New** — walkie cycle, conversation loop, silence timeout, double-tap, token window |

No backend changes. No new UI components.

---

## Testing

| Scenario | Assertion |
|----------|-----------|
| Hold >200ms → release | LISTENING then PROCESSING then STANDBY, mode=idle after |
| Hold <200ms (tap) | No state change from STANDBY on single tap |
| Double tap | Enters conversation, mode=conversation |
| Conversation: stream ends | Auto-transitions to LISTENING, mic restarts |
| Silence 10s in conversation | `onSend` called with transcript |
| Single tap while SPEAKING in conversation | Interrupts, goes to LISTENING |
| Single tap while LISTENING in conversation | Exits to STANDBY |
| 10min cap | `exitConversation` called after 600s |
| Walkie send | `onSend` called with single message, no history |
| Text input send | Rolling last 10 messages passed |
| Input after send | `inputText` and `transcript` are both empty |
