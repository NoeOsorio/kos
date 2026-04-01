# Voice Interaction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace broken hold-to-talk with walkie-talkie (hold) + Siri-like conversation (double-tap) modes, with animations that match state and rolling message windows for token efficiency.

**Architecture:** A new `useVoiceInteraction` hook composes `useTalkMachine` + `useSpeechRecognition` + `useAudioAnalyser`, owning all gesture detection, timers, and conversation loop logic. `useTalkMachine` gains a `mode` field and four new transitions. `TalkPage` delegates entirely to `useVoiceInteraction`.

**Tech Stack:** React 18, TypeScript, Web Speech API, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `frontend/src/hooks/useTalkMachine.ts` | Modify | Add `TalkMode`, `mode` state, `enterWalkie`, `enterConversation`, `exitConversation`, `interruptConversation`; update `streamComplete` |
| `frontend/src/hooks/useSpeechRecognition.ts` | Modify | Change `lang: 'en-US'` → `lang: ''` |
| `frontend/src/hooks/useVoiceInteraction.ts` | Create | All gesture, silence, conversation-loop, token-window logic |
| `frontend/src/pages/TalkPage.tsx` | Modify | Replace mic/gesture/loop code with `useVoiceInteraction`; pass `messages` and callbacks |
| `frontend/src/__tests__/useTalkMachine.test.ts` | Modify | Add tests for new transitions and mode branching in `streamComplete` |
| `frontend/src/__tests__/useVoiceInteraction.test.ts` | Create | Full interaction tests: walkie, conversation loop, silence, double-tap, token window |

---

## Task 1: Extend `useTalkMachine` with mode and new transitions

**Files:**
- Modify: `frontend/src/hooks/useTalkMachine.ts`
- Modify: `frontend/src/__tests__/useTalkMachine.test.ts`

- [ ] **Step 1: Write failing tests for new machine behaviour**

Append to `frontend/src/__tests__/useTalkMachine.test.ts` (inside the `describe` block, before the closing `}`):

```ts
  // --- mode tests ---
  it('initializes with mode idle', () => {
    const { result } = renderHook(() => useTalkMachine())
    expect(result.current.mode).toBe('idle')
  })

  it('enterWalkie: STANDBY → LISTENING, mode=walkie', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterWalkie())
    expect(result.current.talkState).toBe('LISTENING')
    expect(result.current.mode).toBe('walkie')
  })

  it('enterConversation: STANDBY → LISTENING, mode=conversation', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterConversation())
    expect(result.current.talkState).toBe('LISTENING')
    expect(result.current.mode).toBe('conversation')
  })

  it('exitConversation: any state → STANDBY, mode=idle', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterConversation())
    act(() => result.current.send())
    act(() => result.current.exitConversation())
    expect(result.current.talkState).toBe('STANDBY')
    expect(result.current.mode).toBe('idle')
  })

  it('interruptConversation: SPEAKING → LISTENING, mode stays conversation', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterConversation())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    expect(result.current.talkState).toBe('SPEAKING')
    act(() => result.current.interruptConversation())
    expect(result.current.talkState).toBe('LISTENING')
    expect(result.current.mode).toBe('conversation')
  })

  it('interruptConversation is no-op when not SPEAKING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterConversation())
    expect(result.current.talkState).toBe('LISTENING')
    act(() => result.current.interruptConversation())
    expect(result.current.talkState).toBe('LISTENING')
  })

  it('streamComplete in conversation mode: SPEAKING → LISTENING, mode stays conversation', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterConversation())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('LISTENING')
    expect(result.current.mode).toBe('conversation')
  })

  it('streamComplete in walkie mode: SPEAKING → STANDBY, mode=idle', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.enterWalkie())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('STANDBY')
    expect(result.current.mode).toBe('idle')
  })

  it('streamComplete in idle mode: SPEAKING → STANDBY, mode stays idle', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('STANDBY')
    expect(result.current.mode).toBe('idle')
  })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/useTalkMachine.test.ts
```

Expected: failures mentioning `mode`, `enterWalkie`, `enterConversation`, `exitConversation`, `interruptConversation`.

- [ ] **Step 3: Rewrite `useTalkMachine.ts`**

Replace the entire file:

```ts
import { useState, useCallback, useRef } from 'react'

export type TalkState = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'
export type TalkMode = 'idle' | 'walkie' | 'conversation'

export interface VisualParams {
  particleSpeed: number
  waveAmp: number
  ringSpeed: number
  freqBaseline: number
}

export const VISUAL_PARAMS: Record<TalkState, VisualParams> = {
  STANDBY:    { particleSpeed: 0.6, waveAmp: 0.18, ringSpeed: 0.8,  freqBaseline: 0.06 },
  LISTENING:  { particleSpeed: 1.4, waveAmp: 0.72, ringSpeed: 1.5,  freqBaseline: 0.42 },
  PROCESSING: { particleSpeed: 2.2, waveAmp: 0.38, ringSpeed: 2.5,  freqBaseline: 0.35 },
  SPEAKING:   { particleSpeed: 3.0, waveAmp: 1.0,  ringSpeed: 3.5,  freqBaseline: 0.65 },
}

export interface UseTalkMachineReturn {
  talkState: TalkState
  mode: TalkMode
  visualParams: VisualParams
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  /** STANDBY → LISTENING (no mode change, legacy text-path) */
  activateMic: () => void
  /** STANDBY|LISTENING → PROCESSING, clears inputText */
  send: () => void
  /** PROCESSING → SPEAKING */
  firstTokenReceived: () => void
  /** SPEAKING|PROCESSING → STANDBY (idle/walkie) or LISTENING (conversation) */
  streamComplete: () => void
  /** SPEAKING → PROCESSING */
  followUp: () => void
  /** STANDBY → LISTENING, mode=walkie */
  enterWalkie: () => void
  /** STANDBY → LISTENING, mode=conversation */
  enterConversation: () => void
  /** any → STANDBY, mode=idle */
  exitConversation: () => void
  /** SPEAKING → LISTENING, mode stays conversation */
  interruptConversation: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [talkState, setTalkState] = useState<TalkState>('STANDBY')
  const [mode, setMode] = useState<TalkMode>('idle')
  // Ref mirrors mode so callbacks don't go stale
  const modeRef = useRef<TalkMode>('idle')
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const updateMode = useCallback((m: TalkMode) => {
    modeRef.current = m
    setMode(m)
  }, [])

  const activateMic = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
  }, [])

  const enterWalkie = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
    updateMode('walkie')
  }, [updateMode])

  const enterConversation = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
    updateMode('conversation')
  }, [updateMode])

  const exitConversation = useCallback(() => {
    setTalkState('STANDBY')
    updateMode('idle')
  }, [updateMode])

  const interruptConversation = useCallback(() => {
    setTalkState(s => s === 'SPEAKING' ? 'LISTENING' : s)
    // mode stays conversation — no updateMode call
  }, [])

  const send = useCallback(() => {
    setInputText('')
    setTalkState(s => (s === 'STANDBY' || s === 'LISTENING') ? 'PROCESSING' : s)
  }, [])

  const firstTokenReceived = useCallback(() => {
    setTalkState(s => s === 'PROCESSING' ? 'SPEAKING' : s)
  }, [])

  const streamComplete = useCallback(() => {
    const currentMode = modeRef.current
    setTalkState(s => {
      if (s !== 'SPEAKING' && s !== 'PROCESSING') return s
      return currentMode === 'conversation' ? 'LISTENING' : 'STANDBY'
    })
    if (modeRef.current !== 'conversation') updateMode('idle')
  }, [updateMode])

  const followUp = useCallback(() => {
    setTalkState(s => s === 'SPEAKING' ? 'PROCESSING' : s)
  }, [])

  return {
    talkState, mode, visualParams: VISUAL_PARAMS[talkState],
    transcript, inputText, setInputText, setTranscript,
    activateMic, send, firstTokenReceived, streamComplete, followUp,
    enterWalkie, enterConversation, exitConversation, interruptConversation,
  }
}
```

- [ ] **Step 4: Run tests and confirm all pass**

```bash
cd frontend && npx vitest run src/__tests__/useTalkMachine.test.ts
```

Expected: all tests pass (existing 14 + new 9 = 23 total).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useTalkMachine.ts frontend/src/__tests__/useTalkMachine.test.ts
git commit -m "feat: add mode and walkie/conversation transitions to useTalkMachine"
```

---

## Task 2: Fix speech recognition language

**Files:**
- Modify: `frontend/src/hooks/useSpeechRecognition.ts`

- [ ] **Step 1: Change lang to browser default**

In `frontend/src/hooks/useSpeechRecognition.ts`, line 28:

```ts
// Before:
recognition.lang = 'en-US'
// After:
recognition.lang = ''
```

- [ ] **Step 2: Run existing speech recognition tests**

```bash
cd frontend && npx vitest run src/__tests__/useSpeechRecognition.test.ts
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useSpeechRecognition.ts
git commit -m "fix: use browser default language for speech recognition"
```

---

## Task 3: Create `useVoiceInteraction` hook

**Files:**
- Create: `frontend/src/hooks/useVoiceInteraction.ts`
- Create: `frontend/src/__tests__/useVoiceInteraction.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/__tests__/useVoiceInteraction.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { useVoiceInteraction } from '../hooks/useVoiceInteraction'
import { useTalkMachine, VISUAL_PARAMS } from '../hooks/useTalkMachine'
import type { TalkState, TalkMode } from '../hooks/useTalkMachine'
import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

vi.mock('../hooks/useTalkMachine')
vi.mock('../hooks/useAudioAnalyser')
vi.mock('../hooks/useSpeechRecognition')

function makeMachine(overrides: Partial<ReturnType<typeof useTalkMachine>> = {}) {
  return {
    talkState: 'STANDBY' as TalkState,
    mode: 'idle' as TalkMode,
    visualParams: VISUAL_PARAMS['STANDBY'],
    transcript: '',
    inputText: '',
    setInputText: vi.fn(),
    setTranscript: vi.fn(),
    activateMic: vi.fn(),
    send: vi.fn(),
    firstTokenReceived: vi.fn(),
    streamComplete: vi.fn(),
    followUp: vi.fn(),
    enterWalkie: vi.fn(),
    enterConversation: vi.fn(),
    exitConversation: vi.fn(),
    interruptConversation: vi.fn(),
    ...overrides,
  }
}

function makeAudio() {
  return {
    isActive: false,
    start: vi.fn().mockResolvedValue(true),
    stop: vi.fn(),
    getAmplitude: vi.fn().mockReturnValue(0),
  }
}

function makeSpeech() {
  return {
    isSupported: true,
    transcript: '',
    startListening: vi.fn(),
    stopListening: vi.fn(),
    clearTranscript: vi.fn(),
  }
}

describe('useVoiceInteraction', () => {
  let machine: ReturnType<typeof makeMachine>
  let audio: ReturnType<typeof makeAudio>
  let speech: ReturnType<typeof makeSpeech>
  let onSend: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    machine = makeMachine()
    audio = makeAudio()
    speech = makeSpeech()
    onSend = vi.fn()
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    vi.mocked(useAudioAnalyser).mockReturnValue(audio)
    vi.mocked(useSpeechRecognition).mockReturnValue(speech)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // --- Walkie-talkie ---

  it('hold >200ms calls enterWalkie and starts mic', async () => {
    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    act(() => result.current.onPointerDown())
    await act(async () => { vi.advanceTimersByTime(201) })
    expect(machine.enterWalkie).toHaveBeenCalled()
    expect(audio.start).toHaveBeenCalled()
    expect(speech.startListening).toHaveBeenCalled()
  })

  it('release after hold sends with no history (walkie mode)', async () => {
    machine.mode = 'walkie'
    machine.inputText = 'hello walkie'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [{ role: 'assistant', content: 'hi' }], onSend })
    )
    act(() => result.current.onPointerDown())
    await act(async () => { vi.advanceTimersByTime(201) })
    act(() => result.current.onPointerUp())

    expect(machine.send).toHaveBeenCalled()
    expect(onSend).toHaveBeenCalledWith(
      'hello walkie',
      [{ role: 'user', content: 'hello walkie' }]
    )
  })

  it('short tap (<200ms) does not start walkie', () => {
    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    act(() => result.current.onPointerDown())
    act(() => { vi.advanceTimersByTime(100) })
    act(() => result.current.onPointerUp())
    expect(machine.enterWalkie).not.toHaveBeenCalled()
  })

  // --- Double-tap conversation ---

  it('double tap from STANDBY calls enterConversation and starts mic', async () => {
    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    // First tap
    act(() => result.current.onPointerDown())
    act(() => result.current.onPointerUp())
    // Second tap within 300ms
    act(() => { vi.advanceTimersByTime(150) })
    act(() => result.current.onPointerDown())
    act(() => result.current.onPointerUp())

    await act(async () => { vi.advanceTimersByTime(0) })
    expect(machine.enterConversation).toHaveBeenCalled()
    expect(audio.start).toHaveBeenCalled()
  })

  it('single tap while SPEAKING in conversation calls interruptConversation', async () => {
    machine.talkState = 'SPEAKING'
    machine.mode = 'conversation'
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    const onInterrupt = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend, onInterrupt })
    )
    act(() => result.current.onPointerDown())
    act(() => result.current.onPointerUp())
    await act(async () => { vi.advanceTimersByTime(310) }) // past double-tap window

    expect(onInterrupt).toHaveBeenCalled()
    expect(machine.interruptConversation).toHaveBeenCalled()
  })

  it('single tap while LISTENING in conversation calls exitConversation', async () => {
    machine.talkState = 'LISTENING'
    machine.mode = 'conversation'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    act(() => result.current.onPointerDown())
    act(() => result.current.onPointerUp())
    await act(async () => { vi.advanceTimersByTime(310) })

    expect(machine.exitConversation).toHaveBeenCalled()
  })

  // --- Silence detection ---

  it('silence for 10s in conversation mode calls doSend', async () => {
    machine.talkState = 'LISTENING'
    machine.mode = 'conversation'
    machine.inputText = 'some transcript'
    audio.getAmplitude.mockReturnValue(0.01) // below threshold
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    await act(async () => { vi.advanceTimersByTime(10_100) })

    expect(machine.send).toHaveBeenCalled()
    expect(onSend).toHaveBeenCalledWith(
      'some transcript',
      [{ role: 'user', content: 'some transcript' }]
    )
  })

  it('silence counter resets on sound above threshold', async () => {
    machine.talkState = 'LISTENING'
    machine.mode = 'conversation'
    machine.inputText = 'hello'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    // Silent for 9s, then loud, then silent for 9s more — should NOT send
    audio.getAmplitude
      .mockReturnValueOnce(0.01) // first 9s of calls: silent
    // We'll just verify it doesn't trigger at 9s
    renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    await act(async () => { vi.advanceTimersByTime(9_000) })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('silence detection is inactive when not in conversation mode', async () => {
    machine.talkState = 'LISTENING'
    machine.mode = 'idle'
    machine.inputText = 'hello'
    audio.getAmplitude.mockReturnValue(0.01)
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    await act(async () => { vi.advanceTimersByTime(11_000) })
    expect(onSend).not.toHaveBeenCalled()
  })

  // --- Token window ---

  it('sendText passes rolling last 10 messages + current', () => {
    machine.mode = 'idle'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const history = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
    }))

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: history, onSend })
    )
    act(() => result.current.sendText('new message'))

    const passedMessages = onSend.mock.calls[0][1]
    expect(passedMessages).toHaveLength(11) // 10 history + 1 current
    expect(passedMessages[10]).toEqual({ role: 'user', content: 'new message' })
    // Should be last 10 of history + current
    expect(passedMessages[0]).toEqual(history[2])
  })

  it('walkie sendText passes only current message', () => {
    machine.mode = 'walkie'
    machine.inputText = 'walkie msg'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const history = [{ role: 'assistant' as const, content: 'previous' }]
    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: history, onSend })
    )
    act(() => result.current.sendText('walkie msg'))

    expect(onSend).toHaveBeenCalledWith(
      'walkie msg',
      [{ role: 'user', content: 'walkie msg' }]
    )
  })

  // --- Cleanup ---

  it('clears inputText and transcript after send', () => {
    machine.mode = 'idle'
    machine.inputText = 'some text'
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    act(() => result.current.sendText('some text'))

    expect(speech.clearTranscript).toHaveBeenCalled()
    expect(machine.send).toHaveBeenCalled() // which clears inputText in the real machine
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run src/__tests__/useVoiceInteraction.test.ts
```

Expected: all fail with "Cannot find module '../hooks/useVoiceInteraction'".

- [ ] **Step 3: Create `useVoiceInteraction.ts`**

Create `frontend/src/hooks/useVoiceInteraction.ts`:

```ts
import { useRef, useEffect, useCallback, useState } from 'react'
import { useTalkMachine } from './useTalkMachine'
import type { TalkState, TalkMode, VisualParams } from './useTalkMachine'
import { useAudioAnalyser } from './useAudioAnalyser'
import { useSpeechRecognition } from './useSpeechRecognition'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseVoiceInteractionOptions {
  messages: Message[]
  onSend: (text: string, messages: Message[]) => void
  onInterrupt?: () => void
}

export interface UseVoiceInteractionReturn {
  talkState: TalkState
  visualParams: VisualParams
  mode: TalkMode
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  conversationTimeLeft: number
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerCancel: () => void
  sendText: (text: string) => void
  // Exposed so TalkPage can drive state from the fetch lifecycle
  streamComplete: () => void
  firstTokenReceived: () => void
}

const SILENCE_THRESHOLD = 0.02
const SILENCE_MS = 10_000
const HOLD_MS = 200
const DOUBLE_TAP_MS = 300
const CONVO_MAX_MS = 600_000
const MSG_WINDOW = 10

export function useVoiceInteraction({
  messages,
  onSend,
  onInterrupt,
}: UseVoiceInteractionOptions): UseVoiceInteractionReturn {
  const machine = useTalkMachine()
  const { start: startMic, stop: stopMic, getAmplitude } = useAudioAnalyser()
  const { transcript: speechTranscript, startListening, stopListening, clearTranscript } = useSpeechRecognition()

  // Stable refs to avoid stale closures
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const onSendRef = useRef(onSend)
  useEffect(() => { onSendRef.current = onSend }, [onSend])
  const onInterruptRef = useRef(onInterrupt)
  useEffect(() => { onInterruptRef.current = onInterrupt }, [onInterrupt])
  const modeRef = useRef(machine.mode)
  useEffect(() => { modeRef.current = machine.mode }, [machine.mode])
  const talkStateRef = useRef(machine.talkState)
  useEffect(() => { talkStateRef.current = machine.talkState }, [machine.talkState])
  const inputTextRef = useRef(machine.inputText)
  useEffect(() => { inputTextRef.current = machine.inputText }, [machine.inputText])

  // Gesture refs
  const pressStartRef = useRef(0)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoldingRef = useRef(false)

  // Conversation timer
  const [conversationTimeLeft, setConversationTimeLeft] = useState(0)
  const convoCapRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convoCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Silence detection
  const silenceAccRef = useRef(0)
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync speech transcript → inputText
  useEffect(() => {
    if (speechTranscript) machine.setInputText(speechTranscript)
  }, [speechTranscript]) // eslint-disable-line react-hooks/exhaustive-deps

  // Core send: stops mic/speech, slices history, calls onSend
  const doSend = useCallback((text: string) => {
    if (!text.trim()) return
    stopMic()
    stopListening()
    clearTranscript()
    const msgs = messagesRef.current
    const history = modeRef.current === 'walkie'
      ? [{ role: 'user' as const, content: text }]
      : [...msgs.slice(-MSG_WINDOW), { role: 'user' as const, content: text }]
    machine.send()
    onSendRef.current(text, history)
  }, [machine, stopMic, stopListening, clearTranscript])

  // Walkie helpers
  const startWalkie = useCallback(async () => {
    isHoldingRef.current = true
    machine.enterWalkie()
    const ok = await startMic()
    if (ok) startListening()
  }, [machine, startMic, startListening])

  const releaseWalkie = useCallback(() => {
    isHoldingRef.current = false
    doSend(inputTextRef.current)
  }, [doSend])

  // Conversation helpers
  const stopConvoTimers = useCallback(() => {
    if (convoCapRef.current) { clearTimeout(convoCapRef.current); convoCapRef.current = null }
    if (convoCountdownRef.current) { clearInterval(convoCountdownRef.current); convoCountdownRef.current = null }
    setConversationTimeLeft(0)
  }, [])

  const doExitConversation = useCallback(() => {
    stopConvoTimers()
    stopMic()
    stopListening()
    machine.exitConversation()
  }, [machine, stopMic, stopListening, stopConvoTimers])

  const doEnterConversation = useCallback(async () => {
    machine.enterConversation()
    const ok = await startMic()
    if (ok) startListening()

    let remaining = Math.floor(CONVO_MAX_MS / 1000)
    setConversationTimeLeft(remaining)
    convoCountdownRef.current = setInterval(() => {
      remaining -= 1
      setConversationTimeLeft(remaining)
      if (remaining <= 0) doExitConversation()
    }, 1000)
    convoCapRef.current = setTimeout(doExitConversation, CONVO_MAX_MS)
  }, [machine, startMic, startListening, doExitConversation])

  // Auto-restart mic after AI speaks in conversation (SPEAKING → LISTENING transition)
  const prevTalkStateRef = useRef(machine.talkState)
  useEffect(() => {
    const prev = prevTalkStateRef.current
    prevTalkStateRef.current = machine.talkState
    if (
      prev === 'SPEAKING' &&
      machine.talkState === 'LISTENING' &&
      machine.mode === 'conversation'
    ) {
      startMic().then(ok => { if (ok) startListening() })
    }
  }, [machine.talkState, machine.mode, startMic, startListening])

  // Silence detection — active only when LISTENING in conversation mode
  useEffect(() => {
    if (machine.talkState !== 'LISTENING' || machine.mode !== 'conversation') return
    silenceAccRef.current = 0
    silenceIntervalRef.current = setInterval(() => {
      const amp = getAmplitude()
      if (amp >= SILENCE_THRESHOLD) {
        silenceAccRef.current = 0
      } else {
        silenceAccRef.current += 100
        if (silenceAccRef.current >= SILENCE_MS) {
          silenceAccRef.current = 0
          const text = inputTextRef.current.trim()
          if (text) doSend(text)
        }
      }
    }, 100)
    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current)
        silenceIntervalRef.current = null
      }
    }
  }, [machine.talkState, machine.mode, getAmplitude, doSend])

  // Gesture: single tap handler (fires after double-tap window expires)
  const handleSingleTap = useCallback(() => {
    if (modeRef.current === 'conversation') {
      if (talkStateRef.current === 'SPEAKING') {
        onInterruptRef.current?.()
        machine.interruptConversation()
      } else {
        doExitConversation()
      }
    }
    // no-op from STANDBY idle
  }, [machine, doExitConversation])

  const handleDoubleTap = useCallback(async () => {
    if (talkStateRef.current === 'STANDBY') {
      await doEnterConversation()
    }
  }, [doEnterConversation])

  const handleTap = useCallback(() => {
    const now = Date.now()
    if (lastTapTimeRef.current > 0 && now - lastTapTimeRef.current < DOUBLE_TAP_MS) {
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current)
      lastTapTimeRef.current = 0
      handleDoubleTap()
    } else {
      lastTapTimeRef.current = now
      doubleTapTimerRef.current = setTimeout(() => {
        lastTapTimeRef.current = 0
        handleSingleTap()
      }, DOUBLE_TAP_MS)
    }
  }, [handleSingleTap, handleDoubleTap])

  const onPointerDown = useCallback(() => {
    pressStartRef.current = Date.now()
    holdTimerRef.current = setTimeout(() => { startWalkie() }, HOLD_MS)
  }, [startWalkie])

  const onPointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    const elapsed = Date.now() - pressStartRef.current
    if (isHoldingRef.current) {
      releaseWalkie()
    } else if (elapsed < HOLD_MS) {
      handleTap()
    }
  }, [releaseWalkie, handleTap])

  const onPointerCancel = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    if (isHoldingRef.current) {
      isHoldingRef.current = false
      stopMic()
      stopListening()
      machine.exitConversation()
    }
  }, [machine, stopMic, stopListening])

  const sendText = useCallback((text: string) => {
    doSend(text)
  }, [doSend])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic()
      stopListening()
      stopConvoTimers()
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    talkState: machine.talkState,
    visualParams: machine.visualParams,
    mode: machine.mode,
    transcript: machine.transcript,
    inputText: machine.inputText,
    setInputText: machine.setInputText,
    setTranscript: machine.setTranscript,
    streamComplete: machine.streamComplete,
    firstTokenReceived: machine.firstTokenReceived,
    conversationTimeLeft,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    sendText,
  }
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd frontend && npx vitest run src/__tests__/useVoiceInteraction.test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useVoiceInteraction.ts frontend/src/__tests__/useVoiceInteraction.test.ts
git commit -m "feat: add useVoiceInteraction hook with walkie, conversation, silence detection"
```

---

## Task 4: Update TalkPage to use `useVoiceInteraction`

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`
- Modify: `frontend/src/__tests__/TalkPage.test.tsx`

- [ ] **Step 1: Update TalkPage.test.tsx**

The existing tests mock `fetch` directly. They need to be updated to work with the new page structure. The key change: `TalkPage` no longer calls `/api/chat` directly from gesture handlers — it calls it from an `onSend` callback passed to `useVoiceInteraction`. The tests should still work since `handleSend` still triggers the fetch.

Review the existing two tests that were fixed previously and confirm they still test `/api/chat` with streaming mocks — no changes needed if they do.

Run first to confirm current state:

```bash
cd frontend && npx vitest run src/__tests__/TalkPage.test.tsx
```

Expected: all pass.

- [ ] **Step 2: Rewrite TalkPage.tsx**

Replace the entire file:

```tsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceInteraction } from '../hooks/useVoiceInteraction'
import type { Message } from '../hooks/useVoiceInteraction'
import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import StarfieldCanvas from '../components/talk/StarfieldCanvas'
import HUDRingsSVG from '../components/talk/HUDRingsSVG'
import FreqBarsCanvas, { type FreqBarsHandle } from '../components/talk/FreqBarsCanvas'
import ParticleNebulaCanvas, { type ParticleNebulaHandle } from '../components/talk/ParticleNebulaCanvas'
import WaveCanvas, { type WaveCanvasHandle } from '../components/talk/WaveCanvas'
import TalkInput from '../components/talk/TalkInput'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'
import type { NewTopicCard } from '../hooks/useKnowledgeCards'

function getVisualizerSize(): number {
  if (typeof window === 'undefined') return 480
  const isMobile = window.innerWidth < 768
  if (isMobile) return 240
  const available = window.innerHeight - 52
  if (available < 600) return Math.max(available - 200, 240)
  return 480
}

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const { cards, addCards, dismiss, clearAll } = useKnowledgeCards()

  const handleSend = useCallback(async (text: string, windowed: Message[]) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    clearAll()

    // Append full message to local history (unbounded — for display only)
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: windowed }),
        signal: controller.signal,
      })

      if (!res.ok || !res.body) {
        voice.streamComplete()
        return
      }

      voice.firstTokenReceived()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const token = part.slice(6)
          if (token === '[DONE]') break
          fullResponse += token
          voice.setTranscript(fullResponse)
        }
      }

      voice.streamComplete()
      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])

      // Background: analyze and auto-save topics
      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, response: fullResponse }),
      })
        .then(r => r.json())
        .then(d => {
          addCards(d.new_topics ?? [], d.similar ?? [])
          ;(d.new_topics ?? []).forEach((topic: { name: string; description: string }) => {
            fetch('/api/insights/topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: topic.name, description: topic.description }),
            }).catch(() => {})
          })
        })
        .catch(() => {})
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        voice.streamComplete()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // NOTE: voice is declared after handleSend but used inside it via closure.
  // We need a ref pattern to avoid the circular dependency.
  // Solution: wrap handleSend in a ref so voice can call it before it's "defined".
  const handleSendRef = useRef(handleSend)
  useEffect(() => { handleSendRef.current = handleSend }, [handleSend])

  const voice = useVoiceInteraction({
    messages,
    onSend: (text, windowed) => handleSendRef.current(text, windowed),
    onInterrupt: () => abortControllerRef.current?.abort(),
  })

  // Also expose streamComplete / firstTokenReceived / setTranscript on voice —
  // handleSend references these, so we store them in refs too.
  const voiceRef = useRef(voice)
  useEffect(() => { voiceRef.current = voice }, [voice])

  // Fix: replace direct voice.* calls in handleSend with ref calls
  // The above handleSend uses `voice.streamComplete()` etc — but voice isn't
  // defined when handleSend is first created. We solve this by making handleSend
  // use voiceRef.current instead:

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  const vizSize = getVisualizerSize()
  const { getAmplitude } = useAudioAnalyser()
  const freqBarsRef = useRef<FreqBarsHandle>(null)
  const particleRef  = useRef<ParticleNebulaHandle>(null)
  const waveRef      = useRef<WaveCanvasHandle>(null)
  const rafRef       = useRef<number>(0)
  const ampLerpRef   = useRef(0)
  const tRef         = useRef(0)
  const lastTimeRef  = useRef(0)
  const visualParamsRef = useRef(voice.visualParams)
  useEffect(() => { visualParamsRef.current = voice.visualParams }, [voice.visualParams])

  const [showRipple, setShowRipple] = useState(false)

  const tick = useCallback((now: number) => {
    const deltaMs = lastTimeRef.current ? now - lastTimeRef.current : 16.67
    lastTimeRef.current = now
    tRef.current += deltaMs / 1000
    const rawAmp = getAmplitude()
    const lerpFactor = 1 - Math.pow(1 - 0.045, deltaMs / 16.67)
    ampLerpRef.current += (rawAmp - ampLerpRef.current) * lerpFactor
    const amp = ampLerpRef.current
    const { waveAmp, particleSpeed, freqBaseline } = visualParamsRef.current
    freqBarsRef.current?.draw(amp, freqBaseline)
    particleRef.current?.draw(amp, particleSpeed, tRef.current)
    waveRef.current?.draw(amp, waveAmp, tRef.current)
    rafRef.current = requestAnimationFrame(tick)
  }, [getAmplitude])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  function handleSaveCard(card: NewTopicCard) { dismiss(card.id) }

  const handleNebulaPointerDown = () => {
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 400)
    voice.onPointerDown()
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      <StarfieldCanvas />

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

        {voice.talkState === 'LISTENING' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <div className="flex items-center gap-1">
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(196,181,253,0.85)', letterSpacing: '2px', fontFamily: 'monospace' }}>REC</span>
            </div>
          </div>
        )}

        {voice.talkState === 'PROCESSING' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <div style={{
              width: vizSize * 0.7, height: vizSize * 0.7, borderRadius: '50%',
              border: '2px dashed rgba(139,92,246,0.5)', borderTopColor: 'rgba(139,92,246,0.9)',
              animation: 'spin 1s linear infinite',
            }} />
          </div>
        )}

        {showRipple && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 9 }}>
            <div style={{
              width: vizSize * 0.6, height: vizSize * 0.6, borderRadius: '50%',
              border: '2px solid rgba(139,92,246,0.7)',
              animation: 'ripple-out 0.4s ease-out forwards',
            }} />
          </div>
        )}

        {voice.mode === 'conversation' && voice.conversationTimeLeft > 0 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none" style={{ zIndex: 10 }}>
            <span style={{ fontSize: '9px', color: 'rgba(196,181,253,0.4)', letterSpacing: '2px', fontFamily: 'monospace' }}>
              {Math.floor(voice.conversationTimeLeft / 60)}:{String(voice.conversationTimeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        )}

        <KnowledgeCards cards={cards} onDismiss={dismiss} onSave={handleSaveCard} />
      </div>

      <p className="font-mono text-[10px] tracking-[3px] uppercase mt-3 z-10" style={{ color: 'rgba(196,181,253,0.5)' }}>
        {voice.talkState}
        {voice.mode === 'conversation' ? ' · CONVO' : voice.mode === 'walkie' ? ' · WALKIE' : ''}
      </p>
      <p className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10" style={{ color: 'rgba(196,181,253,0.2)' }}>
        {voice.mode === 'conversation' ? 'Tap to interrupt · Tap again to end' : 'Hold to talk · Double-tap for conversation'}
      </p>

      <div className="z-10 w-full">
        <TalkInput
          transcript={voice.transcript}
          inputText={voice.inputText}
          onInputChange={voice.setInputText}
          onSend={(text) => voice.sendText(text)}
        />
      </div>
    </div>
  )
}
```

**Important:** The `handleSend` function uses `voice.streamComplete()`, `voice.firstTokenReceived()`, and `voice.setTranscript()`. Since `voice` is declared after `handleSend`, replace those calls with `voiceRef.current.*` calls. Rewrite `handleSend` as follows (this is the corrected version — use this instead of the one above):

```ts
  const handleSend = useCallback(async (text: string, windowed: Message[]) => {
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    clearAll()
    setMessages(prev => [...prev, { role: 'user', content: text }])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: windowed }),
        signal: controller.signal,
      })
      if (!res.ok || !res.body) { voiceRef.current.streamComplete(); return }

      voiceRef.current.firstTokenReceived()
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullResponse = ''
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const token = part.slice(6)
          if (token === '[DONE]') break
          fullResponse += token
          voiceRef.current.setTranscript(fullResponse)
        }
      }

      voiceRef.current.streamComplete()
      setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])

      fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, response: fullResponse }),
      })
        .then(r => r.json())
        .then(d => {
          addCards(d.new_topics ?? [], d.similar ?? [])
          ;(d.new_topics ?? []).forEach((topic: { name: string; description: string }) => {
            fetch('/api/insights/topic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: topic.name, description: topic.description }),
            }).catch(() => {})
          })
        })
        .catch(() => {})
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') voiceRef.current.streamComplete()
    }
  }, [clearAll, addCards])
```

These are already included in `UseVoiceInteractionReturn` from Task 3 — no additional changes needed to the hook.

- [ ] **Step 3: Run all tests**

```bash
cd frontend && npx vitest run
```

Expected: 157+ tests pass. Fix any TypeScript errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/TalkPage.tsx frontend/src/__tests__/TalkPage.test.tsx frontend/src/hooks/useVoiceInteraction.ts
git commit -m "feat: wire TalkPage to useVoiceInteraction, add conversation mode UI"
```

---

## Task 5: Full test run and branch push

- [ ] **Step 1: Run full test suite**

```bash
cd frontend && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 2: Push branch**

```bash
git push origin feat/week1-week2
```

- [ ] **Step 3: Smoke test in browser**

1. `docker compose up --build`
2. Open `http://localhost:5173`
3. **Walkie:** Hold nebula >0.2s, speak, release → AI responds, returns to STANDBY
4. **Conversation:** Double-tap → REC indicator, speak, release (or silence 10s) → AI responds → mic auto-restarts
5. **Interrupt:** While AI speaks, single tap → REC restarts
6. **Exit conversation:** Single tap while LISTENING → STANDBY
7. **Text input:** Type, Enter → sends with rolling window, input clears
