import { useState, useEffect, useRef, useCallback } from 'react'
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

  const [showRipple, setShowRipple] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const freqBarsRef = useRef<FreqBarsHandle>(null)
  const particleRef  = useRef<ParticleNebulaHandle>(null)
  const waveRef      = useRef<WaveCanvasHandle>(null)
  const rafRef       = useRef<number>(0)
  const ampLerpRef   = useRef(0)
  const tRef         = useRef(0)
  const lastTimeRef  = useRef(0)
  const visualParamsRef = useRef(visualParams)
  useEffect(() => { visualParamsRef.current = visualParams }, [visualParams])

  // Cancel any in-flight request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

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
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller
    send()
    clearTranscript()
    try {
      const res = await fetch('/api/talk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: controller.signal,
      })
      firstTokenReceived()
      const data = await res.json()
      setTranscript(data.response ?? '')
      streamComplete()
    } catch (err) {
      // Don't call streamComplete if the request was intentionally aborted
      if (err instanceof Error && err.name !== 'AbortError') {
        streamComplete()
      }
    }
  }

  async function handleNebulaPointerDown() {
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 400)
    const ok = await startMic()
    if (ok) {
      activateMic()
      if (speechSupported) startListening()
    }
  }

  async function handleNebulaPointerUp() {
    stopMic()
    stopListening()
    const text = (speechTranscript || inputText).trim()
    if (text) await handleSend(text)
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
        <ParticleNebulaCanvas
          ref={particleRef}
          size={vizSize}
          onPointerDown={handleNebulaPointerDown}
          onPointerUp={handleNebulaPointerUp}
          onPointerCancel={handleNebulaPointerUp}
        />
        <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
        <HUDRingsSVG ringSpeed={visualParams.ringSpeed} size={vizSize} />

        {/* REC indicator — visible only during LISTENING */}
        {talkState === 'LISTENING' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <div className="flex items-center gap-1">
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(220,38,38,0.9)', boxShadow: '0 0 8px rgba(220,38,38,0.7)' }} />
              <span style={{ fontSize: '10px', color: 'rgba(196,181,253,0.85)', letterSpacing: '2px', fontFamily: 'monospace' }}>REC</span>
            </div>
          </div>
        )}

        {/* Dashed spinning ring — visible during PROCESSING */}
        {talkState === 'PROCESSING' && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <div
              style={{
                width: vizSize * 0.7,
                height: vizSize * 0.7,
                borderRadius: '50%',
                border: '2px dashed rgba(139,92,246,0.5)',
                borderTopColor: 'rgba(139,92,246,0.9)',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        )}

        {/* Ripple burst — one-shot on press */}
        {showRipple && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 9 }}
          >
            <div
              style={{
                width: vizSize * 0.6,
                height: vizSize * 0.6,
                borderRadius: '50%',
                border: '2px solid rgba(139,92,246,0.7)',
                animation: 'ripple-out 0.4s ease-out forwards',
              }}
            />
          </div>
        )}
      </div>

      {/* State label */}
      <p
        className="font-mono text-[10px] tracking-[3px] uppercase mt-3 z-10"
        style={{ color: 'rgba(196,181,253,0.5)' }}
      >
        {talkState}
      </p>
      <p
        className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10"
        style={{ color: 'rgba(196,181,253,0.2)' }}
      >
        Hold to talk · Release to send
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
