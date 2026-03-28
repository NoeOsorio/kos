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
