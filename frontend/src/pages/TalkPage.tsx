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
  const {
    talkState, visualParams, transcript, inputText,
    setInputText, setTranscript, activateMic, send,
    firstTokenReceived, streamComplete,
  } = machine
  const { isActive: micActive, start: startMic, stop: stopMic, getAmplitude } = useAudioAnalyser()
  const {
    isSupported: speechSupported, transcript: speechTranscript,
    startListening, stopListening, clearTranscript,
  } = useSpeechRecognition()

  const freqBarsRef = useRef<FreqBarsHandle>(null)
  const particleRef  = useRef<ParticleNebulaHandle>(null)
  const waveRef      = useRef<WaveCanvasHandle>(null)
  const rafRef       = useRef<number>(0)
  const ampLerpRef   = useRef(0)
  const tRef         = useRef(0)
  const lastTimeRef  = useRef(0)
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
    send()
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
