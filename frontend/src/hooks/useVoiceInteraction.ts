import { useRef, useEffect, useCallback, useState } from 'react'
import { useTalkMachine } from './useTalkMachine'
import type { TalkState, TalkMode, VisualParams } from './useTalkMachine'
import { useAudioAnalyser } from './useAudioAnalyser'
import { useSpeechRecognition } from './useSpeechRecognition'

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface UseVoiceInteractionOptions {
  messages: Message[]
  onSend: (text: string, messages: Message[]) => void
  onInterrupt?: () => void
}

export interface UseVoiceInteractionReturn {
  talkState: TalkState
  visualParams: VisualParams
  mode: TalkMode
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  streamComplete: () => void
  firstTokenReceived: () => void
  conversationTimeLeft: number
  onPointerDown: () => void
  onPointerUp: () => void
  onPointerCancel: () => void
  sendText: (text: string) => void
}

const SILENCE_THRESHOLD = 0.02
const SILENCE_MS = 10_000
const HOLD_MS = 200
const DOUBLE_TAP_MS = 300
const CONVO_MAX_MS = 600_000
const MSG_WINDOW = 10

export function useVoiceInteraction({
  messages,
  onSend,
  onInterrupt,
}: UseVoiceInteractionOptions): UseVoiceInteractionReturn {
  const machine = useTalkMachine()
  const { start: startMic, stop: stopMic, getAmplitude } = useAudioAnalyser()
  const {
    transcript: speechTranscript,
    startListening,
    stopListening,
    clearTranscript,
  } = useSpeechRecognition()

  // Stable refs — avoid stale closures in timers/effects
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])
  const onSendRef = useRef(onSend)
  useEffect(() => { onSendRef.current = onSend }, [onSend])
  const onInterruptRef = useRef(onInterrupt)
  useEffect(() => { onInterruptRef.current = onInterrupt }, [onInterrupt])
  const doExitConversationRef = useRef<() => void>(() => {})
  const modeRef = useRef(machine.mode)
  useEffect(() => { modeRef.current = machine.mode }, [machine.mode])
  const talkStateRef = useRef(machine.talkState)
  useEffect(() => { talkStateRef.current = machine.talkState }, [machine.talkState])
  const inputTextRef = useRef(machine.inputText)
  useEffect(() => { inputTextRef.current = machine.inputText }, [machine.inputText])

  // Gesture refs
  const pressStartRef = useRef(0)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTapTimeRef = useRef(0)
  const doubleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoldingRef = useRef(false)

  // Conversation timer
  const [conversationTimeLeft, setConversationTimeLeft] = useState(0)
  const convoCapRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const convoCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Silence detection accumulator
  const silenceAccRef = useRef(0)
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync speech transcript → machine inputText
  useEffect(() => {
    if (speechTranscript) machine.setInputText(speechTranscript)
  }, [speechTranscript, machine.setInputText])

  // Core send: stop mic/speech, slice history window, dispatch
  const doSend = useCallback((text: string) => {
    if (!text.trim()) return
    stopMic()
    stopListening()
    clearTranscript()
    const msgs = messagesRef.current
    const history = modeRef.current === 'walkie'
      ? [{ role: 'user' as const, content: text }]
      : [...msgs.slice(-MSG_WINDOW), { role: 'user' as const, content: text }]
    machine.send()
    onSendRef.current(text, history)
  }, [machine, stopMic, stopListening, clearTranscript])

  // Conversation management
  const stopConvoTimers = useCallback(() => {
    if (convoCapRef.current) { clearTimeout(convoCapRef.current); convoCapRef.current = null }
    if (convoCountdownRef.current) { clearInterval(convoCountdownRef.current); convoCountdownRef.current = null }
    setConversationTimeLeft(0)
  }, [])

  const doExitConversation = useCallback(() => {
    stopConvoTimers()
    stopMic()
    stopListening()
    machine.exitConversation()
  }, [machine, stopMic, stopListening, stopConvoTimers])
  useEffect(() => { doExitConversationRef.current = doExitConversation }, [doExitConversation])

  const doEnterConversation = useCallback(async () => {
    machine.enterConversation()
    const ok = await startMic()
    if (ok) startListening()

    let remaining = Math.floor(CONVO_MAX_MS / 1000)
    setConversationTimeLeft(remaining)
    convoCountdownRef.current = setInterval(() => {
      remaining -= 1
      setConversationTimeLeft(remaining)
      if (remaining <= 0) doExitConversationRef.current()
    }, 1000)
    convoCapRef.current = setTimeout(() => doExitConversationRef.current(), CONVO_MAX_MS)
  }, [machine, startMic, startListening, doExitConversation])

  // Auto-restart mic after AI finishes speaking in conversation (SPEAKING → LISTENING)
  const prevTalkStateRef = useRef(machine.talkState)
  useEffect(() => {
    const prev = prevTalkStateRef.current
    prevTalkStateRef.current = machine.talkState
    if (
      prev === 'SPEAKING' &&
      machine.talkState === 'LISTENING' &&
      machine.mode === 'conversation'
    ) {
      startMic().then(ok => { if (ok) startListening() })
    }
  }, [machine.talkState, machine.mode, startMic, startListening])

  // Silence detection — only active when LISTENING in conversation mode
  useEffect(() => {
    if (machine.talkState !== 'LISTENING' || machine.mode !== 'conversation') return
    silenceAccRef.current = 0
    silenceIntervalRef.current = setInterval(() => {
      const amp = getAmplitude()
      if (amp >= SILENCE_THRESHOLD) {
        silenceAccRef.current = 0
      } else {
        silenceAccRef.current += 100
        if (silenceAccRef.current >= SILENCE_MS) {
          silenceAccRef.current = 0
          const text = inputTextRef.current.trim()
          if (text) doSend(text)
        }
      }
    }, 100)
    return () => {
      if (silenceIntervalRef.current) {
        clearInterval(silenceIntervalRef.current)
        silenceIntervalRef.current = null
      }
    }
  }, [machine.talkState, machine.mode, getAmplitude, doSend])

  // Single tap handler (fires after double-tap window expires without a second tap)
  const handleSingleTap = useCallback(() => {
    if (modeRef.current === 'conversation') {
      if (talkStateRef.current === 'SPEAKING') {
        onInterruptRef.current?.()
        machine.interruptConversation()
      } else {
        doExitConversation()
      }
    }
    // No-op from STANDBY idle — double-tap is needed to start conversation
  }, [machine, doExitConversation])

  const handleDoubleTap = useCallback(async () => {
    if (talkStateRef.current === 'STANDBY') {
      await doEnterConversation()
    }
  }, [doEnterConversation])

  const handleTap = useCallback(() => {
    const now = Date.now()
    if (lastTapTimeRef.current > 0 && now - lastTapTimeRef.current < DOUBLE_TAP_MS) {
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current)
      lastTapTimeRef.current = 0
      handleDoubleTap()
    } else {
      lastTapTimeRef.current = now
      doubleTapTimerRef.current = setTimeout(() => {
        lastTapTimeRef.current = 0
        handleSingleTap()
      }, DOUBLE_TAP_MS)
    }
  }, [handleSingleTap, handleDoubleTap])

  const onPointerDown = useCallback(() => {
    pressStartRef.current = Date.now()
    holdTimerRef.current = setTimeout(async () => {
      isHoldingRef.current = true
      machine.enterWalkie()
      const ok = await startMic()
      if (ok) startListening()
    }, HOLD_MS)
  }, [machine, startMic, startListening])

  const onPointerUp = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    const elapsed = Date.now() - pressStartRef.current
    if (isHoldingRef.current) {
      isHoldingRef.current = false
      const text = inputTextRef.current
      if (text.trim()) {
        doSend(text)
      } else {
        // Released with nothing captured — cancel walkie, return to STANDBY
        stopMic()
        stopListening()
        machine.exitConversation()
      }
    } else if (elapsed < HOLD_MS) {
      handleTap()
    }
  }, [doSend, handleTap, stopMic, stopListening, machine])

  const onPointerCancel = useCallback(() => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
    if (isHoldingRef.current) {
      isHoldingRef.current = false
      stopMic()
      stopListening()
      doExitConversationRef.current()
    }
  }, [stopMic, stopListening])

  const sendText = useCallback((text: string) => {
    doSend(text)
  }, [doSend])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMic()
      stopListening()
      if (convoCapRef.current) { clearTimeout(convoCapRef.current); convoCapRef.current = null }
      if (convoCountdownRef.current) { clearInterval(convoCountdownRef.current); convoCountdownRef.current = null }
      setConversationTimeLeft(0)
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current)
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (doubleTapTimerRef.current) clearTimeout(doubleTapTimerRef.current)
    }
  }, [stopMic, stopListening])

  return {
    talkState: machine.talkState,
    visualParams: machine.visualParams,
    mode: machine.mode,
    transcript: machine.transcript,
    inputText: machine.inputText,
    setInputText: machine.setInputText,
    setTranscript: machine.setTranscript,
    streamComplete: machine.streamComplete,
    firstTokenReceived: machine.firstTokenReceived,
    conversationTimeLeft,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    sendText,
  }
}
