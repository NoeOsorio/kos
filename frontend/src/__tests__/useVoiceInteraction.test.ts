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
    machine = makeMachine({ mode: 'walkie', inputText: 'hello walkie' })
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

  it('single tap while SPEAKING in conversation calls onInterrupt and interruptConversation', async () => {
    machine = makeMachine({ talkState: 'SPEAKING', mode: 'conversation' })
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    const onInterrupt = vi.fn()

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend, onInterrupt })
    )
    act(() => result.current.onPointerDown())
    act(() => result.current.onPointerUp())
    await act(async () => { vi.advanceTimersByTime(310) })

    expect(onInterrupt).toHaveBeenCalled()
    expect(machine.interruptConversation).toHaveBeenCalled()
  })

  it('single tap while LISTENING in conversation calls exitConversation', async () => {
    machine = makeMachine({ talkState: 'LISTENING', mode: 'conversation' })
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

  it('silence for 10s in conversation mode triggers send', async () => {
    machine = makeMachine({ talkState: 'LISTENING', mode: 'conversation', inputText: 'some transcript' })
    audio = makeAudio()
    audio.getAmplitude.mockReturnValue(0.01)
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    vi.mocked(useAudioAnalyser).mockReturnValue(audio)

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

  it('silence detection does not trigger before 10s', async () => {
    machine = makeMachine({ talkState: 'LISTENING', mode: 'conversation', inputText: 'hello' })
    audio = makeAudio()
    audio.getAmplitude.mockReturnValue(0.01)
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    vi.mocked(useAudioAnalyser).mockReturnValue(audio)

    renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    await act(async () => { vi.advanceTimersByTime(9_000) })
    expect(onSend).not.toHaveBeenCalled()
  })

  it('silence detection is inactive when not in conversation mode', async () => {
    machine = makeMachine({ talkState: 'LISTENING', mode: 'idle', inputText: 'hello' })
    audio = makeAudio()
    audio.getAmplitude.mockReturnValue(0.01)
    vi.mocked(useTalkMachine).mockReturnValue(machine)
    vi.mocked(useAudioAnalyser).mockReturnValue(audio)

    renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    await act(async () => { vi.advanceTimersByTime(11_000) })
    expect(onSend).not.toHaveBeenCalled()
  })

  // --- Token window ---

  it('sendText passes rolling last 10 messages + current in idle mode', () => {
    machine = makeMachine({ mode: 'idle' })
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const history = Array.from({ length: 12 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `msg ${i}`,
    }))

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: history, onSend })
    )
    act(() => result.current.sendText('new message'))

    const passedMessages = onSend.mock.calls[0][1] as Array<{ role: string; content: string }>
    expect(passedMessages).toHaveLength(11) // 10 history + 1 current
    expect(passedMessages[10]).toEqual({ role: 'user', content: 'new message' })
    expect(passedMessages[0]).toEqual(history[2]) // first of last-10
  })

  it('sendText in walkie mode passes only current message', () => {
    machine = makeMachine({ mode: 'walkie' })
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [{ role: 'assistant', content: 'prev' }], onSend })
    )
    act(() => result.current.sendText('walkie msg'))

    expect(onSend).toHaveBeenCalledWith(
      'walkie msg',
      [{ role: 'user', content: 'walkie msg' }]
    )
  })

  // --- Cleanup ---

  it('clears transcript and calls machine.send after sendText', () => {
    machine = makeMachine({ mode: 'idle' })
    vi.mocked(useTalkMachine).mockReturnValue(machine)

    const { result } = renderHook(() =>
      useVoiceInteraction({ messages: [], onSend })
    )
    act(() => result.current.sendText('some text'))

    expect(speech.clearTranscript).toHaveBeenCalled()
    expect(machine.send).toHaveBeenCalled()
  })
})
