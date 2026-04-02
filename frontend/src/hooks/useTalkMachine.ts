import { useReducer, useState, useCallback } from 'react'

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

interface MachineState {
  talkState: TalkState
  mode: TalkMode
}

type MachineAction =
  | { type: 'ACTIVATE_MIC' }
  | { type: 'ENTER_WALKIE' }
  | { type: 'ENTER_CONVERSATION' }
  | { type: 'EXIT_CONVERSATION' }
  | { type: 'INTERRUPT_CONVERSATION' }
  | { type: 'SEND' }
  | { type: 'FIRST_TOKEN' }
  | { type: 'STREAM_COMPLETE' }
  | { type: 'FOLLOW_UP' }

function machineReducer(state: MachineState, action: MachineAction): MachineState {
  const { talkState, mode } = state
  switch (action.type) {
    case 'ACTIVATE_MIC':
      return talkState === 'STANDBY' ? { ...state, talkState: 'LISTENING' } : state
    case 'ENTER_WALKIE':
      return talkState === 'STANDBY' ? { talkState: 'LISTENING', mode: 'walkie' } : state
    case 'ENTER_CONVERSATION':
      return talkState === 'STANDBY' ? { talkState: 'LISTENING', mode: 'conversation' } : state
    case 'EXIT_CONVERSATION':
      return { talkState: 'STANDBY', mode: 'idle' }
    case 'INTERRUPT_CONVERSATION':
      return talkState === 'SPEAKING' ? { ...state, talkState: 'LISTENING' } : state
    case 'SEND':
      return (talkState === 'STANDBY' || talkState === 'LISTENING')
        ? { ...state, talkState: 'PROCESSING' }
        : state
    case 'FIRST_TOKEN':
      return talkState === 'PROCESSING' ? { ...state, talkState: 'SPEAKING' } : state
    case 'STREAM_COMPLETE':
      if (talkState !== 'SPEAKING' && talkState !== 'PROCESSING') return state
      return mode === 'conversation'
        ? { talkState: 'LISTENING', mode: 'conversation' }
        : { talkState: 'STANDBY', mode: 'idle' }
    case 'FOLLOW_UP':
      return talkState === 'SPEAKING' ? { ...state, talkState: 'PROCESSING' } : state
    default:
      return state
  }
}

export interface UseTalkMachineReturn {
  talkState: TalkState
  mode: TalkMode
  visualParams: VisualParams
  transcript: string
  inputText: string
  setInputText: (text: string) => void
  setTranscript: (text: string) => void
  activateMic: () => void
  send: () => void
  firstTokenReceived: () => void
  streamComplete: () => void
  followUp: () => void
  enterWalkie: () => void
  enterConversation: () => void
  exitConversation: () => void
  interruptConversation: () => void
}

export function useTalkMachine(): UseTalkMachineReturn {
  const [{ talkState, mode }, dispatch] = useReducer(machineReducer, {
    talkState: 'STANDBY',
    mode: 'idle',
  })
  const [transcript, setTranscript] = useState('')
  const [inputText, setInputText] = useState('')

  const activateMic        = useCallback(() => dispatch({ type: 'ACTIVATE_MIC' }), [])
  const enterWalkie        = useCallback(() => dispatch({ type: 'ENTER_WALKIE' }), [])
  const enterConversation  = useCallback(() => {
    setTranscript('')
    setInputText('')
    dispatch({ type: 'ENTER_CONVERSATION' })
  }, [])
  const exitConversation   = useCallback(() => {
    setTranscript('')
    setInputText('')
    dispatch({ type: 'EXIT_CONVERSATION' })
  }, [])
  const interruptConversation = useCallback(() => dispatch({ type: 'INTERRUPT_CONVERSATION' }), [])
  const firstTokenReceived = useCallback(() => dispatch({ type: 'FIRST_TOKEN' }), [])
  const streamComplete     = useCallback(() => dispatch({ type: 'STREAM_COMPLETE' }), [])
  const followUp           = useCallback(() => dispatch({ type: 'FOLLOW_UP' }), [])

  const send = useCallback(() => {
    setInputText('')
    setTranscript('')
    dispatch({ type: 'SEND' })
  }, [])

  return {
    talkState, mode, visualParams: VISUAL_PARAMS[talkState],
    transcript, inputText, setInputText, setTranscript,
    activateMic, send, firstTokenReceived, streamComplete, followUp,
    enterWalkie, enterConversation, exitConversation, interruptConversation,
  }
}
