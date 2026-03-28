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
        results: [Object.assign([{ transcript: 'hello world' }], { isFinal: true })],
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
        results: [Object.assign([{ transcript: 'hello ' }], { isFinal: true })],
        resultIndex: 0,
      } as any)
    })
    act(() => {
      mockRecognition.onresult({
        results: [
          Object.assign([{ transcript: 'hello ' }], { isFinal: true }),
          Object.assign([{ transcript: 'world' }], { isFinal: true }),
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
        results: [Object.assign([{ transcript: 'hello' }], { isFinal: true })],
        resultIndex: 0,
      } as any)
    })
    act(() => result.current.clearTranscript())
    expect(result.current.transcript).toBe('')
  })
})
