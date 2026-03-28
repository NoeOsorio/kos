import { useState, useCallback } from 'react'

export type TalkState = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'

export interface VisualParams {
  particleSpeed: number
  waveAmp: number
  ringSpeed: number
  freqBaseline: number
}

export const VISUAL_PARAMS: Record<TalkState, VisualParams> = {
  STANDBY:    { particleSpeed: 0.6, waveAmp: 0.18, ringSpeed: 0.8, freqBaseline: 0.06 },
  LISTENING:  { particleSpeed: 1.4, waveAmp: 0.72, ringSpeed: 1.5, freqBaseline: 0.42 },
  PROCESSING: { particleSpeed: 2.2, waveAmp: 0.38, ringSpeed: 2.5, freqBaseline: 0.35 },
  SPEAKING:   { particleSpeed: 3.0, waveAmp: 1.0,  ringSpeed: 3.5, freqBaseline: 0.65 },
}

export interface UseTalkMachineReturn {
  talkState: TalkState
  visualParams: VisualParams
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  /** Transition STANDBY → LISTENING. No-op from any other state. */
  activateMic: () => void
  /** Transition STANDBY | LISTENING → PROCESSING. Caller is responsible for sending text to the API. No-op from any other state. */
  send: () => void
  /** Transition PROCESSING → SPEAKING. No-op from any other state. */
  firstTokenReceived: () => void
  /** Transition SPEAKING | PROCESSING → STANDBY. No-op from any other state. */
  streamComplete: () => void
  /** Transition SPEAKING → PROCESSING. No-op from any other state. */
  followUp: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [talkState, setTalkState] = useState<TalkState>('STANDBY')
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const activateMic = useCallback(() => {
    setTalkState(s => s === 'STANDBY' ? 'LISTENING' : s)
  }, [])

  const send = useCallback(() => {
    setInputText('')
    setTalkState(s => {
      if (s === 'STANDBY' || s === 'LISTENING') return 'PROCESSING'
      return s
    })
  }, [])

  const firstTokenReceived = useCallback(() => {
    setTalkState(s => s === 'PROCESSING' ? 'SPEAKING' : s)
  }, [])

  const streamComplete = useCallback(() => {
    setTalkState(s => (s === 'SPEAKING' || s === 'PROCESSING') ? 'STANDBY' : s)
  }, [])

  const followUp = useCallback(() => {
    setTalkState(s => s === 'SPEAKING' ? 'PROCESSING' : s)
  }, [])

  return {
    talkState,
    visualParams: VISUAL_PARAMS[talkState],
    transcript,
    inputText,
    setInputText,
    setTranscript,
    activateMic,
    send,
    firstTokenReceived,
    streamComplete,
    followUp,
  }
}
