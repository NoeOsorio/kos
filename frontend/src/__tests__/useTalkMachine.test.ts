import { renderHook, act } from '@testing-library/react'
import { useTalkMachine, VISUAL_PARAMS } from '../hooks/useTalkMachine'

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
    act(() => result.current.send())
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('transitions PROCESSING → SPEAKING on firstTokenReceived', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    expect(result.current.talkState).toBe('SPEAKING')
  })

  it('transitions SPEAKING → STANDBY on streamComplete', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('STANDBY')
  })

  it('transitions SPEAKING → PROCESSING on followUp', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send())
    act(() => result.current.firstTokenReceived())
    act(() => result.current.followUp())
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('returns correct visual params for STANDBY', () => {
    const { result } = renderHook(() => useTalkMachine())
    expect(result.current.visualParams).toEqual(VISUAL_PARAMS['STANDBY'])
  })

  it('returns correct visual params for LISTENING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    expect(result.current.visualParams).toEqual(VISUAL_PARAMS['LISTENING'])
  })

  it('setInputText updates inputText', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.setInputText('hello'))
    expect(result.current.inputText).toBe('hello')
  })

  it('send clears inputText', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.setInputText('hello'))
    act(() => result.current.send())
    expect(result.current.inputText).toBe('')
  })

  it('setTranscript updates transcript', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.setTranscript('KOS says: hi'))
    expect(result.current.transcript).toBe('KOS says: hi')
  })

  // Guard tests — illegal transitions are no-ops
  it('activateMic is no-op when already LISTENING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    expect(result.current.talkState).toBe('LISTENING')
    act(() => result.current.activateMic())
    expect(result.current.talkState).toBe('LISTENING')
  })

  it('transitions STANDBY → PROCESSING on send (text input path)', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.send())
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('send is no-op when SPEAKING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.send())              // → PROCESSING
    act(() => result.current.firstTokenReceived()) // → SPEAKING
    act(() => result.current.send())              // should be no-op
    expect(result.current.talkState).toBe('SPEAKING')
  })

  it('send is no-op when PROCESSING', () => {
    const { result } = renderHook(() => useTalkMachine())
    act(() => result.current.activateMic())
    act(() => result.current.send())  // → PROCESSING
    act(() => result.current.send())  // should be no-op
    expect(result.current.talkState).toBe('PROCESSING')
  })

  it('streamComplete is no-op when not SPEAKING', () => {
    const { result } = renderHook(() => useTalkMachine())
    // From STANDBY
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('STANDBY')
    // From LISTENING
    act(() => result.current.activateMic())
    act(() => result.current.streamComplete())
    expect(result.current.talkState).toBe('LISTENING')
  })
})
