import { useRef, useState, useCallback, useEffect } from 'react'

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
    streamRef.current = null
    contextRef.current?.close()
    contextRef.current = null
    analyserRef.current = null
    dataArrayRef.current = null
    activeRef.current = false
    setIsActive(false)
  }, [])

  useEffect(() => {
    return () => {
      stop()
    }
  }, [stop])

  return { isActive, start, stop, getAmplitude }
}
