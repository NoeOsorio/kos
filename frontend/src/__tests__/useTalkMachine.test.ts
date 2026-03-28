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
