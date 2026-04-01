import { useState, useCallback, useRef } from 'react'

export type TalkState = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'
export type TalkMode = 'idle' | 'walkie' | 'conversation'

export interface VisualParams {
  particleSpeed: number
  waveAmp: number
  ringSpeed: number
  freqBaseline: number
}

export const VISUAL_PARAMS: Record<TalkState, VisualParams> = {
  STANDBY:    { particleSpeed: 0.6, waveAmp: 0.18, ringSpeed: 0.8,  freqBaseline: 0.06 },
  LISTENING:  { particleSpeed: 1.4, waveAmp: 0.72, ringSpeed: 1.5,  freqBaseline: 0.42 },
  PROCESSING: { particleSpeed: 2.2, waveAmp: 0.38, ringSpeed: 2.5,  freqBaseline: 0.35 },
  SPEAKING:   { particleSpeed: 3.0, waveAmp: 1.0,  ringSpeed: 3.5,  freqBaseline: 0.65 },
}

export interface UseTalkMachineReturn {
  talkState: TalkState
  mode: TalkMode
  visualParams: VisualParams
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  /** STANDBY → LISTENING (legacy text-path, no mode change) */
  activateMic: () => void
  /** STANDBY|LISTENING → PROCESSING, clears inputText */
  send: () => void
  /** PROCESSING → SPEAKING */
  firstTokenReceived: () => void
  /** SPEAKING|PROCESSING → STANDBY (idle/walkie) or LISTENING (conversation) */
  streamComplete: () => void
  /** SPEAKING → PROCESSING */
  followUp: () => void
  /** STANDBY → LISTENING, mode=walkie */
  enterWalkie: () => void
  /** STANDBY → LISTENING, mode=conversation */
  enterConversation: () => void
  /** any → STANDBY, mode=idle */
  exitConversation: () => void
  /** SPEAKING → LISTENING, mode stays conversation */
  interruptConversation: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [talkState, setTalkState] = useState<TalkState>('STANDBY')
  const [mode, setMode] = useState<TalkMode>('idle')
  // Ref mirrors mode so streamComplete callback doesn't go stale
  const modeRef = useRef<TalkMode>('idle')
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const updateMode = useCallback((m: TalkMode) => {
    modeRef.current = m
    setMode(m)
  }, [])

  const activateMic = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
  }, [])

  const enterWalkie = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
    updateMode('walkie')
  }, [updateMode])

  const enterConversation = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
    updateMode('conversation')
  }, [updateMode])

  const exitConversation = useCallback(() => {
    setTalkState('STANDBY')
    updateMode('idle')
  }, [updateMode])

  const interruptConversation = useCallback(() => {
    setTalkState(s => s === 'SPEAKING' ? 'LISTENING' : s)
    // mode stays conversation — intentionally no updateMode call
  }, [])

  const send = useCallback(() => {
    setInputText('')
    setTalkState(s => (s === 'STANDBY' || s === 'LISTENING') ? 'PROCESSING' : s)
  }, [])

  const firstTokenReceived = useCallback(() => {
    setTalkState(s => s === 'PROCESSING' ? 'SPEAKING' : s)
  }, [])

  const streamComplete = useCallback(() => {
    const currentMode = modeRef.current
    setTalkState(s => {
      if (s !== 'SPEAKING' && s !== 'PROCESSING') return s
      return currentMode === 'conversation' ? 'LISTENING' : 'STANDBY'
    })
    if (modeRef.current !== 'conversation') updateMode('idle')
  }, [updateMode])

  const followUp = useCallback(() => {
    setTalkState(s => s === 'SPEAKING' ? 'PROCESSING' : s)
  }, [])

  return {
    talkState, mode, visualParams: VISUAL_PARAMS[talkState],
    transcript, inputText, setInputText, setTranscript,
    activateMic, send, firstTokenReceived, streamComplete, followUp,
    enterWalkie, enterConversation, exitConversation, interruptConversation,
  }
}
