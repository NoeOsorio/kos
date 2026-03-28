import { useState, useCallback } from 'react'

export type TalkState = 'STANDBY' | 'LISTENING' | 'PROCESSING' | 'SPEAKING'

export interface VisualParams {
  particleSpeed: number
  waveAmp: number
  ringSpeed: number
  freqBaseline: number
}

const VISUAL_PARAMS: Record<TalkState, VisualParams> = {
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
  activateMic: () => void
  send: (text: string) => void
  firstTokenReceived: () => void
  streamComplete: () => void
  followUp: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [talkState, setTalkState] = useState<TalkState>('STANDBY')
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const activateMic = useCallback(() => setTalkState('LISTENING'), [])
  const send = useCallback((_text: string) => {
    setInputText('')
    setTalkState('PROCESSING')
  }, [])
  const firstTokenReceived = useCallback(() => setTalkState('SPEAKING'), [])
  const streamComplete = useCallback(() => setTalkState('STANDBY'), [])
  const followUp = useCallback(() => setTalkState('PROCESSING'), [])

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
