# KOS TALK Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the TALK mode: immersive canvas visualizer (starfield, HUD rings, particle nebula, Siri waves, frequency bars) + STANDBY/LISTENING/PROCESSING/SPEAKING state machine + text/voice input + backend API integration.

**Architecture:** TalkPage owns a single `requestAnimationFrame` loop that drives all canvas updates. A `useTalkMachine` hook owns the state machine and visual param multipliers. A `useAudioAnalyser` hook (Web Audio API) provides mic amplitude. A `useSpeechRecognition` hook (Web Speech API) provides transcript. All canvas components expose a `draw(...)` method via `forwardRef` + `useImperativeHandle` — called imperatively from the rAF loop. All canvas measurements scale proportionally with `size / 480` (480px = desktop visualizer diameter, 240px = mobile). DevicePixelRatio scaling on every canvas.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS v3, Web Audio API, Web Speech API, @tanstack/react-query v5, framer-motion, lucide-react, vitest, @testing-library/react

---

## File Structure

```
frontend/src/
├── pages/
│   └── TalkPage.tsx                    MODIFY — replace stub with full implementation
├── hooks/
│   ├── useTalkMachine.ts               CREATE — state machine + visual params
│   ├── useAudioAnalyser.ts             CREATE — Web Audio API, mic → amplitude
│   └── useSpeechRecognition.ts         CREATE — Web Speech API wrapper
├── components/
│   └── talk/
│       ├── StarfieldCanvas.tsx         CREATE — 130 stars, full viewport
│       ├── HUDRingsSVG.tsx             CREATE — 4 concentric rings, CSS rotation
│       ├── FreqBarsCanvas.tsx          CREATE — 64 radial bars, amplitude-driven
│       ├── ParticleNebulaCanvas.tsx    CREATE — 44 particles, 3 orbital bands
│       ├── WaveCanvas.tsx              CREATE — 5 Siri-style sine waves
│       └── TalkInput.tsx               CREATE — transcript + input row + mic button
└── __tests__/
    ├── useTalkMachine.test.ts          CREATE
    ├── useAudioAnalyser.test.ts        CREATE
    ├── useSpeechRecognition.test.ts    CREATE
    ├── TalkInput.test.tsx              CREATE
    └── TalkPage.test.tsx               CREATE
```

---

### Task 1: Talk State Machine

Pure logic hook — no UI, no side effects. Owns the `STANDBY | LISTENING | PROCESSING | SPEAKING` state and derives visual multipliers from it.

**Visual params per state:**
| State | particleSpeed | waveAmp | ringSpeed | freqBaseline |
|---|---|---|---|---|
| STANDBY | 0.6 | 0.18 | 0.8 | 0.06 |
| LISTENING | 1.4 | 0.72 | 1.5 | 0.42 |
| PROCESSING | 2.2 | 0.38 | 2.5 | 0.35 |
| SPEAKING | 3.0 | 1.0 | 3.5 | 0.65 |

**Files:**
- Create: `frontend/src/hooks/useTalkMachine.ts`
- Create: `frontend/src/__tests__/useTalkMachine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/useTalkMachine.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useTalkMachine } from '../hooks/useTalkMachine'

describe('useTalkMachine', () => {
  it('initializes in STANDBY', () => {
    const { result } = renderHook(() => useTalkMachine())
    expect(result.current.talkState).toBe('STANDBY')
  })

  it('transitions STANDBY → LISTENING on activateMic', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    expect(result.current.talkState).toBe('LISTENING')
  })

  it('transitions LISTENING → PROCESSING on send', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send('hello'))
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('transitions PROCESSING → SPEAKING on firstTokenReceived', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send('hello'))
    act(() => result.current.firstTokenReceived())
    expect(result.current.talkState).toBe('SPEAKING')
  })

  it('transitions SPEAKING → STANDBY on streamComplete', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send('hello'))
    act(() => result.current.firstTokenReceived())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('STANDBY')
  })

  it('transitions SPEAKING → PROCESSING on followUp', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send('hello'))
    act(() => result.current.firstTokenReceived())
    act(() => result.current.followUp())
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('returns correct visual params for STANDBY', () => {
    const { result } = renderHook(() => useTalkMachine())
    expect(result.current.visualParams.particleSpeed).toBe(0.6)
    expect(result.current.visualParams.waveAmp).toBe(0.18)
    expect(result.current.visualParams.ringSpeed).toBe(0.8)
    expect(result.current.visualParams.freqBaseline).toBe(0.06)
  })

  it('returns correct visual params for LISTENING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    expect(result.current.visualParams.particleSpeed).toBe(1.4)
    expect(result.current.visualParams.waveAmp).toBe(0.72)
    expect(result.current.visualParams.ringSpeed).toBe(1.5)
    expect(result.current.visualParams.freqBaseline).toBe(0.42)
  })

  it('setInputText updates inputText', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.setInputText('hello'))
    expect(result.current.inputText).toBe('hello')
  })

  it('send clears inputText', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.setInputText('hello'))
    act(() => result.current.send('hello'))
    expect(result.current.inputText).toBe('')
  })

  it('setTranscript updates transcript', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.setTranscript('KOS says: hi'))
    expect(result.current.transcript).toBe('KOS says: hi')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/useTalkMachine.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create useTalkMachine.ts**

Create `frontend/src/hooks/useTalkMachine.ts`:
```ts
import { useState, useCallback } from 'react'

export type TalkState = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'

export interface VisualParams {
  particleSpeed: number
  waveAmp: number
  ringSpeed: number
  freqBaseline: number
}

const VISUAL_PARAMS: Record<TalkState, VisualParams> = {
  STANDBY:    { particleSpeed: 0.6, waveAmp: 0.18, ringSpeed: 0.8, freqBaseline: 0.06 },
  LISTENING:  { particleSpeed: 1.4, waveAmp: 0.72, ringSpeed: 1.5, freqBaseline: 0.42 },
  PROCESSING: { particleSpeed: 2.2, waveAmp: 0.38, ringSpeed: 2.5, freqBaseline: 0.35 },
  SPEAKING:   { particleSpeed: 3.0, waveAmp: 1.0,  ringSpeed: 3.5, freqBaseline: 0.65 },
}

export interface UseTalkMachineReturn {
  talkState: TalkState
  visualParams: VisualParams
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  activateMic: () => void
  send: (text: string) => void
  firstTokenReceived: () => void
  streamComplete: () => void
  followUp: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [talkState, setTalkState] = useState<TalkState>('STANDBY')
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const activateMic = useCallback(() => setTalkState('LISTENING'), [])
  const send = useCallback((_text: string) => {
    setInputText('')
    setTalkState('PROCESSING')
  }, [])
  const firstTokenReceived = useCallback(() => setTalkState('SPEAKING'), [])
  const streamComplete = useCallback(() => setTalkState('STANDBY'), [])
  const followUp = useCallback(() => setTalkState('PROCESSING'), [])

  return {
    talkState,
    visualParams: VISUAL_PARAMS[talkState],
    transcript,
    inputText,
    setInputText,
    setTranscript,
    activateMic,
    send,
    firstTokenReceived,
    streamComplete,
    followUp,
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/useTalkMachine.test.ts
```
Expected: 11 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/hooks/useTalkMachine.ts src/__tests__/useTalkMachine.test.ts
git commit -m "feat: add TALK state machine (STANDBY/LISTENING/PROCESSING/SPEAKING)"
```

---

### Task 2: TalkInput Component

Input row: transcript display, text field, send button (shown when text non-empty), mic button. Mic button pulses when LISTENING.

**Files:**
- Create: `frontend/src/components/talk/TalkInput.tsx`
- Create: `frontend/src/__tests__/TalkInput.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/TalkInput.test.tsx`:
```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import TalkInput from '../components/talk/TalkInput'
import type { TalkState } from '../hooks/useTalkMachine'

const defaultProps = {
  talkState: 'STANDBY' as TalkState,
  transcript: '',
  inputText: '',
  onInputChange: vi.fn(),
  onSend: vi.fn(),
  onMicToggle: vi.fn(),
}

describe('TalkInput', () => {
  it('renders text input', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('renders mic button', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument()
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

  it('calls onMicToggle when mic button clicked', () => {
    const onMicToggle = vi.fn()
    render(<TalkInput {...defaultProps} onMicToggle={onMicToggle} />)
    fireEvent.click(screen.getByRole('button', { name: /mic/i }))
    expect(onMicToggle).toHaveBeenCalled()
  })

  it('renders transcript text when provided', () => {
    render(<TalkInput {...defaultProps} transcript="Here is what KOS said." />)
    expect(screen.getByText('Here is what KOS said.')).toBeInTheDocument()
  })

  it('applies animate-pulse class on mic button when LISTENING', () => {
    render(<TalkInput {...defaultProps} talkState="LISTENING" />)
    const micBtn = screen.getByRole('button', { name: /mic/i })
    expect(micBtn.className).toContain('animate-pulse')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/TalkInput.test.tsx
```
Expected: FAIL — module not found

- [ ] **Step 3: Create TalkInput.tsx**

```bash
mkdir -p frontend/src/components/talk
```

Create `frontend/src/components/talk/TalkInput.tsx`:
```tsx
import { KeyboardEvent } from 'react'
import { Mic, Send } from 'lucide-react'
import type { TalkState } from '../../hooks/useTalkMachine'

interface TalkInputProps {
  talkState: TalkState
  transcript: string
  inputText: string
  onInputChange: (text: string) => void
  onSend: (text: string) => void
  onMicToggle: () => void
}

export default function TalkInput({
  talkState,
  transcript,
  inputText,
  onInputChange,
  onSend,
  onMicToggle,
}: TalkInputProps) {
  const isListening = talkState === 'LISTENING'

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

        <button
          aria-label="mic toggle"
          onClick={onMicToggle}
          className={[
            'w-[50px] h-[50px] rounded-full flex items-center justify-center shrink-0',
            isListening ? 'animate-pulse' : '',
          ].join(' ')}
          style={{
            background: isListening ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
            boxShadow: isListening ? '0 0 20px rgba(139,92,246,0.6)' : 'none',
          }}
        >
          <Mic size={20} color={isListening ? '#c4b5fd' : '#8b5cf6'} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/TalkInput.test.tsx
```
Expected: 9 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/components/talk/TalkInput.tsx src/__tests__/TalkInput.test.tsx
git commit -m "feat: add TalkInput component (transcript, text field, mic button)"
```

---

### Task 3: StarfieldCanvas

Full-viewport canvas. 130 micro-stars drawn once on mount. Stars are static (no rAF) — opacity and position set at paint time.

**Files:**
- Create: `frontend/src/components/talk/StarfieldCanvas.tsx`

No unit test — canvas drawing has no meaningful assertions in jsdom. Validated visually in Task 10 smoke test.

- [ ] **Step 1: Create StarfieldCanvas.tsx**

Create `frontend/src/components/talk/StarfieldCanvas.tsx`:
```tsx
import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  r: number
  opacity: number
}

function generateStars(count: number, width: number, height: number): Star[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.2 + 0.3,
    opacity: Math.random() * 0.5 + 0.15,
  }))
}

export default function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    const stars = generateStars(130, w, h)
    ctx.clearRect(0, 0, w, h)
    for (const star of stars) {
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(196,181,253,${star.opacity})`
      ctx.fill()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/components/talk/StarfieldCanvas.tsx
git commit -m "feat: add StarfieldCanvas (130 stars, full viewport)"
```

---

### Task 4: HUDRingsSVG

4 concentric rotating rings. Each ring uses CSS `animation` for rotation. Radii and speeds scale with `size / 480`. Ring speed is multiplied by `ringSpeed` from visual params (applied as CSS `animationDuration`).

Ring specs (at 480px visualizer):
- r=72: 5s CCW, `strokeDasharray="4 6.3"`, σ=4 glow
- r=100: 10s CW, `strokeDasharray="6 4"`, σ=2.5 glow
- r=130: 20s CCW, `strokeDasharray="2 8.2"`, σ=1.5 glow
- r=158: 30s CW, `strokeDasharray="3 14.5"`, σ=1.5 glow

**Files:**
- Create: `frontend/src/components/talk/HUDRingsSVG.tsx`

- [ ] **Step 1: Create HUDRingsSVG.tsx**

Create `frontend/src/components/talk/HUDRingsSVG.tsx`:
```tsx
interface HUDRingsSVGProps {
  ringSpeed: number  // visual param (0.8 → 3.5)
  size: number       // visualizer diameter in px
}

const BASE_RINGS = [
  { r: 72,  baseDuration: 5,  cw: false, dash: '4 6.3',  glow: 4   },
  { r: 100, baseDuration: 10, cw: true,  dash: '6 4',    glow: 2.5 },
  { r: 130, baseDuration: 20, cw: false, dash: '2 8.2',  glow: 1.5 },
  { r: 158, baseDuration: 30, cw: true,  dash: '3 14.5', glow: 1.5 },
]

export default function HUDRingsSVG({ ringSpeed, size }: HUDRingsSVGProps) {
  const scale = size / 480
  const cx = size / 2
  const cy = size / 2

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    >
      <defs>
        {BASE_RINGS.map((ring, i) => (
          <filter
            key={`glow-${i}`}
            id={`ring-glow-${i}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation={ring.glow} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {BASE_RINGS.map((ring, i) => {
        const r = ring.r * scale
        const duration = ring.baseDuration / ringSpeed
        const animName = ring.cw ? 'spin-cw' : 'spin-ccw'
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(139,92,246,0.35)"
            strokeWidth="1"
            strokeDasharray={ring.dash}
            filter={`url(#ring-glow-${i})`}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: `${animName} ${duration}s linear infinite`,
            }}
          />
        )
      })}

      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
      `}</style>
    </svg>
  )
}
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/components/talk/HUDRingsSVG.tsx
git commit -m "feat: add HUDRingsSVG (4 concentric rings, CSS rotation, scales with size)"
```

---

### Task 5: useAudioAnalyser Hook

Web Audio API: requests mic permission, creates `AnalyserNode`, exposes `getAmplitude()` — average of `getByteFrequencyData` normalized 0.0–1.0.

**Files:**
- Create: `frontend/src/hooks/useAudioAnalyser.ts`
- Create: `frontend/src/__tests__/useAudioAnalyser.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/useAudioAnalyser.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useAudioAnalyser } from '../hooks/useAudioAnalyser'

const mockGetByteFrequencyData = vi.fn((arr: Uint8Array) => arr.fill(128))
const mockAnalyser = {
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: mockGetByteFrequencyData,
  connect: vi.fn(),
}
const mockSource = { connect: vi.fn() }
const mockStream = { getTracks: () => [{ stop: vi.fn() }] }
const mockAudioContext = {
  createAnalyser: vi.fn(() => mockAnalyser),
  createMediaStreamSource: vi.fn(() => mockSource),
  close: vi.fn(),
}

beforeEach(() => {
  vi.stubGlobal('AudioContext', vi.fn(() => mockAudioContext))
  Object.defineProperty(globalThis, 'navigator', {
    value: {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    },
    configurable: true,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAudioAnalyser', () => {
  it('starts inactive', () => {
    const { result } = renderHook(() => useAudioAnalyser())
    expect(result.current.isActive).toBe(false)
  })

  it('getAmplitude returns 0 when inactive', () => {
    const { result } = renderHook(() => useAudioAnalyser())
    expect(result.current.getAmplitude()).toBe(0)
  })

  it('start returns true on success', async () => {
    const { result } = renderHook(() => useAudioAnalyser())
    let success = false
    await act(async () => {
      success = await result.current.start()
    })
    expect(success).toBe(true)
    expect(result.current.isActive).toBe(true)
  })

  it('getAmplitude returns value between 0 and 1 when active', async () => {
    const { result } = renderHook(() => useAudioAnalyser())
    await act(async () => { await result.current.start() })
    const amp = result.current.getAmplitude()
    expect(amp).toBeGreaterThanOrEqual(0)
    expect(amp).toBeLessThanOrEqual(1)
  })

  it('stop deactivates', async () => {
    const { result } = renderHook(() => useAudioAnalyser())
    await act(async () => { await result.current.start() })
    act(() => result.current.stop())
    expect(result.current.isActive).toBe(false)
  })

  it('start returns false when getUserMedia rejects', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        mediaDevices: {
          getUserMedia: vi.fn().mockRejectedValue(new Error('denied')),
        },
      },
      configurable: true,
    })
    const { result } = renderHook(() => useAudioAnalyser())
    let success = true
    await act(async () => { success = await result.current.start() })
    expect(success).toBe(false)
    expect(result.current.isActive).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/useAudioAnalyser.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create useAudioAnalyser.ts**

Create `frontend/src/hooks/useAudioAnalyser.ts`:
```ts
import { useRef, useState, useCallback } from 'react'

interface UseAudioAnalyserReturn {
  isActive: boolean
  start: () => Promise<boolean>
  stop: () => void
  getAmplitude: () => number
}

export function useAudioAnalyser(): UseAudioAnalyserReturn {
  const [isActive, setIsActive] = useState(false)
  const contextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const activeRef = useRef(false)

  const getAmplitude = useCallback((): number => {
    if (!analyserRef.current || !dataArrayRef.current || !activeRef.current) return 0
    analyserRef.current.getByteFrequencyData(dataArrayRef.current)
    const sum = dataArrayRef.current.reduce((a, b) => a + b, 0)
    return sum / (dataArrayRef.current.length * 255)
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new AudioContext()
      contextRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount)
      const source = ctx.createMediaStreamSource(stream)
      source.connect(analyser)
      activeRef.current = true
      setIsActive(true)
      return true
    } catch {
      return false
    }
  }, [])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    contextRef.current?.close()
    contextRef.current = null
    analyserRef.current = null
    dataArrayRef.current = null
    activeRef.current = false
    setIsActive(false)
  }, [])

  return { isActive, start, stop, getAmplitude }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/useAudioAnalyser.test.ts
```
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/hooks/useAudioAnalyser.ts src/__tests__/useAudioAnalyser.test.ts
git commit -m "feat: add useAudioAnalyser hook (Web Audio API, mic → amplitude 0-1)"
```

---

### Task 6: FreqBarsCanvas

64 radial bars. Inner radius `80 * scale`, max bar height `48 * scale` (where `scale = size / 480`). Bar color: `rgb(109 + v×123, 40 + v×141, 217 + v×38)`. Tip dot at bar end when `v > 0.4`. Imperative `draw(amplitude, freqBaseline)` called from rAF.

**Files:**
- Create: `frontend/src/components/talk/FreqBarsCanvas.tsx`

- [ ] **Step 1: Create FreqBarsCanvas.tsx**

Create `frontend/src/components/talk/FreqBarsCanvas.tsx`:
```tsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const NUM_BARS = 64
const TIP_THRESHOLD = 0.4

export interface FreqBarsHandle {
  draw: (amplitude: number, freqBaseline: number) => void
}

interface FreqBarsCanvasProps {
  size: number
}

const FreqBarsCanvas = forwardRef<FreqBarsHandle, FreqBarsCanvasProps>(
  function FreqBarsCanvas({ size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const barsRef = useRef<number[]>(Array.from({ length: NUM_BARS }, () => Math.random() * 0.1))

    const scale = size / 480
    const INNER_R = 80 * scale
    const MAX_BAR_H = 48 * scale

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, freqBaseline: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        for (let i = 0; i < NUM_BARS; i++) {
          const target = Math.min(freqBaseline + amplitude * (0.3 + Math.random() * 0.4), 1)
          barsRef.current[i] += (target - barsRef.current[i]) * 0.12
          const v = barsRef.current[i]
          const angle = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2
          const barH = v * MAX_BAR_H * dpr
          const innerR = INNER_R * dpr

          const x1 = cx + Math.cos(angle) * innerR
          const y1 = cy + Math.sin(angle) * innerR
          const x2 = cx + Math.cos(angle) * (innerR + barH)
          const y2 = cy + Math.sin(angle) * (innerR + barH)

          const r = Math.round(109 + v * 123)
          const g = Math.round(40 + v * 141)
          const b = Math.round(217 + v * 38)
          ctx.strokeStyle = `rgb(${r},${g},${b})`
          ctx.lineWidth = 2 * dpr
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          if (v > TIP_THRESHOLD) {
            ctx.beginPath()
            ctx.arc(x2, y2, 1.5 * dpr, 0, Math.PI * 2)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fill()
          }
        }
      },
    }), [size, INNER_R, MAX_BAR_H])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }, [size])

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3 }}
      />
    )
  }
)

export default FreqBarsCanvas
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/components/talk/FreqBarsCanvas.tsx
git commit -m "feat: add FreqBarsCanvas (64 radial bars, amplitude-driven, dpr-scaled)"
```

---

### Task 7: ParticleNebulaCanvas

44 particles in 3 orbital bands (base radii 8/17/27 × `scale`). Per-particle: angle, speed (±), breathe phase, drift rate, size (0.7–2.2px), alpha (0.35–0.85), purple spectrum color. Central radial glow breathes with amplitude. Imperative `draw(amplitude, particleSpeed, t)`.

**Files:**
- Create: `frontend/src/components/talk/ParticleNebulaCanvas.tsx`

- [ ] **Step 1: Create ParticleNebulaCanvas.tsx**

Create `frontend/src/components/talk/ParticleNebulaCanvas.tsx`:
```tsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const BANDS = [
  { count: 16, baseR: 8 },
  { count: 16, baseR: 17 },
  { count: 12, baseR: 27 },
]

const PURPLE_COLORS: [number, number, number][] = [
  [139, 92, 246],
  [167, 139, 250],
  [196, 181, 253],
  [109, 40, 217],
]

interface Particle {
  angle: number
  speed: number
  breathePhase: number
  driftRate: number
  size: number
  alpha: number
  color: [number, number, number]
  bandR: number
}

function createParticles(scale: number): Particle[] {
  const particles: Particle[] = []
  for (const { count, baseR } of BANDS) {
    for (let i = 0; i < count; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        breathePhase: Math.random() * Math.PI * 2,
        driftRate: Math.random() * 0.003 + 0.001,
        size: Math.random() * 1.5 + 0.7,
        alpha: Math.random() * 0.5 + 0.35,
        color: PURPLE_COLORS[Math.floor(Math.random() * PURPLE_COLORS.length)],
        bandR: (baseR + Math.random() * 6) * scale,
      })
    }
  }
  return particles
}

export interface ParticleNebulaHandle {
  draw: (amplitude: number, particleSpeed: number, t: number) => void
}

interface ParticleNebulaCanvasProps {
  size: number
}

const ParticleNebulaCanvas = forwardRef<ParticleNebulaHandle, ParticleNebulaCanvasProps>(
  function ParticleNebulaCanvas({ size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scale = size / 480
    const particlesRef = useRef<Particle[]>(createParticles(scale))

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, particleSpeed: number, t: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        // Central glow
        const glowR = (30 + amplitude * 40) * scale * dpr
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
        grad.addColorStop(0, `rgba(139,92,246,${0.15 + amplitude * 0.25})`)
        grad.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Particles
        for (const p of particlesRef.current) {
          p.angle += p.speed * particleSpeed * (1 + amplitude * 2)
          const breathe = Math.sin(t * p.driftRate * 60 + p.breathePhase)
          const r = p.bandR * (1 + breathe * 0.15)
          const x = (size / 2) + Math.cos(p.angle) * r
          const y = (size / 2) + Math.sin(p.angle) * r
          const alpha = Math.min(p.alpha * (0.7 + amplitude * 0.5), 1)

          ctx.beginPath()
          ctx.arc(x * dpr, y * dpr, p.size * scale * dpr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha})`
          ctx.fill()
        }
      },
    }), [size, scale])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }, [size])

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 4 }}
      />
    )
  }
)

export default ParticleNebulaCanvas
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/components/talk/ParticleNebulaCanvas.tsx
git commit -m "feat: add ParticleNebulaCanvas (44 particles, 3 orbital bands, amplitude-driven)"
```

---

### Task 8: WaveCanvas

5 overlapping sine wave curves drawn radially. Base radius `122 * scale` from center. Amplitude scaled by `waveAmp` from visual params. Imperative `draw(amplitude, waveAmp, t)`.

**Files:**
- Create: `frontend/src/components/talk/WaveCanvas.tsx`

- [ ] **Step 1: Create WaveCanvas.tsx**

Create `frontend/src/components/talk/WaveCanvas.tsx`:
```tsx
import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const WAVE_COUNT = 5
const WAVE_COLORS = [
  'rgba(139,92,246,',
  'rgba(167,139,250,',
  'rgba(109,40,217,',
  'rgba(196,181,253,',
  'rgba(124,58,237,',
]

export interface WaveCanvasHandle {
  draw: (amplitude: number, waveAmp: number, t: number) => void
}

interface WaveCanvasProps {
  size: number
}

const WaveCanvas = forwardRef<WaveCanvasHandle, WaveCanvasProps>(
  function WaveCanvas({ size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scale = size / 480
    const BASE_RADIUS = 122 * scale

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, waveAmp: number, t: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr
        const steps = 180

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        for (let wi = 0; wi < WAVE_COUNT; wi++) {
          const phaseOffset = (wi / WAVE_COUNT) * Math.PI * 2
          const amp = BASE_RADIUS * waveAmp * (0.06 + amplitude * 0.14) * dpr
          const freq = 3 + wi * 0.7

          ctx.beginPath()
          for (let step = 0; step <= steps; step++) {
            const theta = (step / steps) * Math.PI * 2
            const wave = amp * Math.sin(freq * theta + t * 1.5 + phaseOffset)
            const r = BASE_RADIUS * dpr + wave
            const x = cx + Math.cos(theta) * r
            const y = cy + Math.sin(theta) * r
            if (step === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = `${WAVE_COLORS[wi]}${0.25 + amplitude * 0.35})`
          ctx.lineWidth = 1.5 * dpr
          ctx.stroke()
        }
      },
    }), [size, scale, BASE_RADIUS])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }, [size])

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    )
  }
)

export default WaveCanvas
```

- [ ] **Step 2: Commit**

```bash
cd frontend && git add src/components/talk/WaveCanvas.tsx
git commit -m "feat: add WaveCanvas (5 Siri-style sine wave curves, radial, scales with size)"
```

---

### Task 9: useSpeechRecognition Hook

Web Speech API wrapper. Returns `transcript` (accumulated final results). Falls back gracefully when unsupported.

**Files:**
- Create: `frontend/src/hooks/useSpeechRecognition.ts`
- Create: `frontend/src/__tests__/useSpeechRecognition.test.ts`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/useSpeechRecognition.test.ts`:
```ts
import { renderHook, act } from '@testing-library/react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'

const mockRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null as any,
  onerror: null as any,
  onend: null as any,
}

beforeEach(() => {
  vi.stubGlobal('SpeechRecognition', vi.fn(() => mockRecognition))
  vi.stubGlobal('webkitSpeechRecognition', vi.fn(() => mockRecognition))
  mockRecognition.start.mockClear()
  mockRecognition.stop.mockClear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useSpeechRecognition', () => {
  it('isSupported is true when SpeechRecognition available', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    expect(result.current.isSupported).toBe(true)
  })

  it('calls start on startListening', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    expect(mockRecognition.start).toHaveBeenCalled()
  })

  it('calls stop on stopListening', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    act(() => result.current.stopListening())
    expect(mockRecognition.stop).toHaveBeenCalled()
  })

  it('updates transcript from final onresult', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    act(() => {
      mockRecognition.onresult({
        results: [[{ transcript: 'hello world', isFinal: true }]],
        resultIndex: 0,
      } as any)
    })
    expect(result.current.transcript).toBe('hello world')
  })

  it('accumulates multiple final results', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    act(() => {
      mockRecognition.onresult({
        results: [[{ transcript: 'hello ', isFinal: true }]],
        resultIndex: 0,
      } as any)
    })
    act(() => {
      mockRecognition.onresult({
        results: [
          [{ transcript: 'hello ', isFinal: true }],
          [{ transcript: 'world', isFinal: true }],
        ],
        resultIndex: 1,
      } as any)
    })
    expect(result.current.transcript).toBe('hello world')
  })

  it('clearTranscript resets to empty string', () => {
    const { result } = renderHook(() => useSpeechRecognition())
    act(() => result.current.startListening())
    act(() => {
      mockRecognition.onresult({
        results: [[{ transcript: 'hello', isFinal: true }]],
        resultIndex: 0,
      } as any)
    })
    act(() => result.current.clearTranscript())
    expect(result.current.transcript).toBe('')
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/useSpeechRecognition.test.ts
```
Expected: FAIL — module not found

- [ ] **Step 3: Create useSpeechRecognition.ts**

Create `frontend/src/hooks/useSpeechRecognition.ts`:
```ts
import { useState, useRef, useCallback } from 'react'

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
      : null

  const isSupported = SpeechRecognitionAPI !== null

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final) setTranscript(prev => prev + final)
    }

    recognition.onerror = () => { recognitionRef.current = null }
    recognition.onend = () => { recognitionRef.current = null }

    recognitionRef.current = recognition
    recognition.start()
  }, [SpeechRecognitionAPI])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return { isSupported, transcript, startListening, stopListening, clearTranscript }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
cd frontend && npm run test:run -- src/__tests__/useSpeechRecognition.test.ts
```
Expected: 6 tests pass

- [ ] **Step 5: Commit**

```bash
cd frontend && git add src/hooks/useSpeechRecognition.ts src/__tests__/useSpeechRecognition.test.ts
git commit -m "feat: add useSpeechRecognition hook (Web Speech API wrapper)"
```

---

### Task 10: Wire TalkPage + API Integration

TalkPage owns the single rAF loop. It wires all hooks + canvas components and calls `POST /api/talk` for AI responses.

The backend endpoint must accept `POST /api/talk` with body `{ message: string }` and return `{ response: string }`. If not yet implemented, TalkPage catches the error and calls `streamComplete()` gracefully — the UI stays functional.

**Files:**
- Modify: `frontend/src/pages/TalkPage.tsx`
- Create: `frontend/src/__tests__/TalkPage.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `frontend/src/__tests__/TalkPage.test.tsx`:
```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KOSProvider } from '../context/KOSContext'
import TalkPage from '../pages/TalkPage'

global.fetch = vi.fn()

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <KOSProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </KOSProvider>
    </QueryClientProvider>
  )
}

describe('TalkPage', () => {
  it('renders the text input', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('renders the mic button', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument()
  })

  it('renders STANDBY status label', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText('STANDBY')).toBeInTheDocument()
  })

  it('sends POST /api/talk on Enter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Hello from KOS' }),
    })
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'What is this?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/talk',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('handles API error gracefully (no crash)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    // Should not throw — waits for streamComplete() to be called
    await waitFor(() => {
      expect(screen.getByText('STANDBY')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd frontend && npm run test:run -- src/__tests__/TalkPage.test.tsx
```
Expected: FAIL — TalkPage is still the stub

- [ ] **Step 3: Replace TalkPage stub**

Read current `frontend/src/pages/TalkPage.tsx`, then replace its entire contents with:
```tsx
import { useEffect, useRef, useCallback } from 'react'
import { useTalkMachine } from '../hooks/useTalkMachine'
import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import StarfieldCanvas from '../components/talk/StarfieldCanvas'
import HUDRingsSVG from '../components/talk/HUDRingsSVG'
import FreqBarsCanvas, { type FreqBarsHandle } from '../components/talk/FreqBarsCanvas'
import ParticleNebulaCanvas, { type ParticleNebulaHandle } from '../components/talk/ParticleNebulaCanvas'
import WaveCanvas, { type WaveCanvasHandle } from '../components/talk/WaveCanvas'
import TalkInput from '../components/talk/TalkInput'

function getVisualizerSize(): number {
  if (typeof window === 'undefined') return 480
  const isMobile = window.innerWidth < 768
  if (isMobile) return 240
  const available = window.innerHeight - 52
  if (available < 600) return Math.max(available - 200, 240)
  return 480
}

export default function TalkPage() {
  const machine = useTalkMachine()
  const { talkState, visualParams, transcript, inputText, setInputText, setTranscript,
          activateMic, send, firstTokenReceived, streamComplete } = machine
  const { isActive: micActive, start: startMic, stop: stopMic, getAmplitude } = useAudioAnalyser()
  const { isSupported: speechSupported, transcript: speechTranscript,
          startListening, stopListening, clearTranscript } = useSpeechRecognition()

  const freqBarsRef = useRef<FreqBarsHandle>(null)
  const particleRef  = useRef<ParticleNebulaHandle>(null)
  const waveRef      = useRef<WaveCanvasHandle>(null)
  const rafRef       = useRef<number>(0)
  const ampLerpRef   = useRef(0)
  const tRef         = useRef(0)
  const lastTimeRef  = useRef(0)
  // Keep latest visualParams accessible in rAF without re-creating the callback
  const visualParamsRef = useRef(visualParams)
  useEffect(() => { visualParamsRef.current = visualParams }, [visualParams])

  const vizSize = getVisualizerSize()

  // Sync speech transcript into text input
  useEffect(() => {
    if (speechTranscript) setInputText(speechTranscript)
  }, [speechTranscript, setInputText])

  // Single rAF loop
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

  async function handleSend(text: string) {
    if (!text.trim()) return
    send(text)
    clearTranscript()
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      firstTokenReceived()
      const data = await res.json()
      setTranscript(data.response ?? '')
      streamComplete()
    } catch {
      streamComplete()
    }
  }

  async function handleMicToggle() {
    if (micActive) {
      stopMic()
      stopListening()
      if (inputText.trim()) await handleSend(inputText)
    } else {
      const ok = await startMic()
      if (ok) {
        activateMic()
        if (speechSupported) startListening()
      }
    }
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      <StarfieldCanvas />

      {/* Visualizer container */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: vizSize, height: vizSize }}
      >
        <WaveCanvas ref={waveRef} size={vizSize} />
        <ParticleNebulaCanvas ref={particleRef} size={vizSize} />
        <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
        <HUDRingsSVG ringSpeed={visualParams.ringSpeed} size={vizSize} />
      </div>

      {/* State label */}
      <p
        className="font-mono text-[10px] tracking-[3px] uppercase mt-3 mb-6 z-10"
        style={{ color: 'rgba(196,181,253,0.5)' }}
      >
        {talkState}
      </p>

      <div className="z-10 w-full">
        <TalkInput
          talkState={talkState}
          transcript={transcript}
          inputText={inputText}
          onInputChange={setInputText}
          onSend={handleSend}
          onMicToggle={handleMicToggle}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run TalkPage tests**

```bash
cd frontend && npm run test:run -- src/__tests__/TalkPage.test.tsx
```
Expected: 5 tests pass

- [ ] **Step 5: Run all tests — confirm no regressions**

```bash
cd frontend && npm run test:run
```
Expected: All tests pass

- [ ] **Step 6: Type-check**

```bash
cd frontend && npm run type-check
```
Expected: No TypeScript errors

- [ ] **Step 7: Visual smoke test**

```bash
cd frontend && npm run dev
```
Open `http://localhost:5173`. Verify:
- Deep purple-black background, starfield visible
- Rotating HUD rings at center
- Purple particle nebula and central glow
- 5 sine wave curves around the rings
- 64 frequency bars emanating outward
- "STANDBY" label below visualizer
- Input row with text field + mic button
- Type text + Enter → state goes PROCESSING (if backend not running, returns to STANDBY gracefully)
- Click mic → prompts for mic permission → state goes LISTENING → rings + particles speed up
- On mobile (<768px): visualizer is 240px, same layout

- [ ] **Step 8: Commit**

```bash
cd frontend && git add src/pages/TalkPage.tsx src/__tests__/TalkPage.test.tsx
git commit -m "feat: wire TalkPage with canvas visualizer, rAF loop, audio, speech, API"
```

---

## Done

After all 10 tasks:
- `cd frontend && npm run test:run` — all tests pass
- `cd frontend && npm run type-check` — no errors
- `cd frontend && npm run dev` — TALK mode fully functional at `/`

**Backend dependency:** `POST /api/talk` with `{ message: string }` → `{ response: string }`. TalkPage handles errors gracefully if not yet implemented.

**Next plans:**
- `2026-03-28-kos-explore-mode.md` — EXPLORE graph canvas, pan/zoom, detail panel
- `2026-03-28-kos-build-mode.md` — BUILD home grid, 5 workspaces, localStorage sessions
