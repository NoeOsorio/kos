import { useState, useEffect, useRef, useCallback } from 'react'
import { useVoiceInteraction } from '../hooks/useVoiceInteraction'
import type { Message } from '../hooks/useVoiceInteraction'
import { useAudioAnalyser } from '../hooks/useAudioAnalyser'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'
import { useIsMobile } from '../hooks/useIsMobile'
import StarfieldCanvas from '../components/talk/StarfieldCanvas'
import HUDRingsSVG from '../components/talk/HUDRingsSVG'
import FreqBarsCanvas, { type FreqBarsHandle } from '../components/talk/FreqBarsCanvas'
import ParticleNebulaCanvas, { type ParticleNebulaHandle } from '../components/talk/ParticleNebulaCanvas'
import WaveCanvas, { type WaveCanvasHandle } from '../components/talk/WaveCanvas'
import TalkInput from '../components/talk/TalkInput'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { NewTopicCard } from '../hooks/useKnowledgeCards'

function getVisualizerSize(): number {
  if (typeof window === 'undefined') return 480
  const isMobile = window.innerWidth < 768
  if (isMobile) return 240
  const available = window.innerHeight - 52
  if (available < 600) return Math.max(available - 200, 240)
  return 480
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TalkPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const { cards, addCards, dismiss, save, clearAll, savedCards } = useKnowledgeCards()
  const voiceRef = useRef<ReturnType<typeof useVoiceInteraction> | null>(null)

  // handleSend is defined first but uses voiceRef to avoid circular dependency
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

      if (!res.ok) {
        voiceRef.current?.streamComplete()
        return
      }

      // SSE streaming path
      if (res.body) {
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let fullResponse = ''
        let buffer = ''
        let firstToken = true

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
            if (firstToken) { voiceRef.current?.firstTokenReceived(); firstToken = false }
            fullResponse += token
            voiceRef.current?.setTranscript(fullResponse)
          }
        }

        voiceRef.current?.streamComplete()
        setMessages(prev => [...prev, { role: 'assistant', content: fullResponse }])

        // Background: analyze topics (no auto-save)
        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, response: fullResponse }),
        })
          .then(r => r.json())
          .then(d => {
            addCards(d.new_topics ?? [], d.similar ?? [])
          })
          .catch(() => {})
      } else {
        // JSON fallback path (e.g. non-streaming responses)
        const data = await res.json()
        const responseText = data.response ?? ''
        voiceRef.current?.firstTokenReceived()
        voiceRef.current?.setTranscript(responseText)
        voiceRef.current?.streamComplete()
        setMessages(prev => [...prev, { role: 'assistant', content: responseText }])

        fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, response: responseText }),
        })
          .then(r => r.json())
          .then(d => {
            addCards(d.new_topics ?? [], d.similar ?? [])
          })
          .catch(() => {})
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') voiceRef.current?.streamComplete()
    }
  }, [clearAll, addCards, save])

  const voice = useVoiceInteraction({
    messages,
    onSend: handleSend,
    onInterrupt: () => abortControllerRef.current?.abort(),
  })
  // Keep voiceRef in sync so handleSend can call voice methods
  voiceRef.current = voice

  // Cancel in-flight request on unmount
  useEffect(() => {
    return () => { abortControllerRef.current?.abort() }
  }, [])

  const isMobile = useIsMobile()
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

  const [showRipple, setShowRipple] = useState(false)

  const handleNebulaPointerDown = () => {
    setShowRipple(true)
    setTimeout(() => setShowRipple(false), 400)
    voice.onPointerDown()
  }

  function handleSaveCard(card: NewTopicCard) {
    save(card)
    fetch('/api/insights/topic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: card.name, description: card.synthesis }),
    }).catch(() => {})
  }

  // Derive status label and hint from voice state
  const { talkState, mode, conversationTimeLeft } = voice
  const isConversation = mode === 'conversation'

  const statusLabel = talkState

  const hintText = isConversation
    ? (talkState === 'SPEAKING' ? 'Tap to interrupt · Tap to end' : 'Tap to end')
    : 'Hold to talk · Double-tap for conversation'

  return (
    <div className="relative flex h-full overflow-hidden">
      <StarfieldCanvas />

      {/* Left: talk machine — 2/3 on desktop when cards pending, full otherwise */}
      <div
        className="flex flex-col items-center justify-center transition-all duration-300"
        style={{ width: cards.length > 0 && !isMobile ? '66.666%' : '100%' }}
      >
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
            onPointerUp={voice.onPointerUp}
            onPointerCancel={voice.onPointerCancel}
          />
          <FreqBarsCanvas ref={freqBarsRef} size={vizSize} />
          <HUDRingsSVG ringSpeed={voice.visualParams.ringSpeed} size={vizSize} />

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
          {statusLabel}
        </p>

        {/* Conversation timer */}
        {isConversation && conversationTimeLeft > 0 && (
          <p
            className="font-mono text-[10px] tracking-[2px] z-10"
            style={{ color: 'rgba(139,92,246,0.6)' }}
          >
            {formatTime(conversationTimeLeft)}
          </p>
        )}

        <p
          className="font-mono text-[9px] tracking-[2px] uppercase mb-6 z-10"
          style={{ color: 'rgba(196,181,253,0.2)' }}
        >
          {hintText}
        </p>

        <div className="z-10 w-full flex flex-col items-center">
          <TalkInput
            transcript={voice.transcript}
            inputText={voice.inputText}
            messages={messages}
            onInputChange={voice.setInputText}
            onSend={(text) => voice.sendText(text)}
          />
        </div>
      </div>

      {/* Right: cards panel — desktop only, 1/3, only when pending cards exist */}
      {cards.length > 0 && !isMobile && (
        <div
          className="z-10 overflow-hidden transition-all duration-300"
          style={{
            width: '33.333%',
            borderLeft: '1px solid rgba(139,92,246,0.1)',
          }}
        >
          <KnowledgeCards
            cards={cards}
            savedCards={savedCards}
            onDismiss={dismiss}
            onSave={handleSaveCard}
          />
        </div>
      )}

      {/* Mobile drawer — always rendered when content exists (handles its own visibility) */}
      {isMobile && (
        <KnowledgeCards
          cards={cards}
          savedCards={savedCards}
          onDismiss={dismiss}
          onSave={handleSaveCard}
        />
      )}
    </div>
  )
}
