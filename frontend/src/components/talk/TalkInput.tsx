import { KeyboardEvent } from 'react'
import { Mic, Send } from 'lucide-react'
import type { TalkState } from '../../hooks/useTalkMachine'

interface TalkInputProps {
  talkState: TalkState
  transcript: string
  inputText: string
  onInputChange: (text: string) => void
  onSend: (text: string) => void
  onMicToggle: () => void
}

export default function TalkInput({
  talkState,
  transcript,
  inputText,
  onInputChange,
  onSend,
  onMicToggle,
}: TalkInputProps) {
  const isListening = talkState === 'LISTENING'

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputText.trim()) {
      onSend(inputText.trim())
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-[380px] mx-auto px-4">
      <p
        className="min-h-[48px] text-center italic text-sm leading-relaxed"
        style={{ color: 'rgba(240,238,255,0.7)' }}
      >
        {transcript}
      </p>

      <div className="flex items-center gap-3 w-full">
        <input
          type="text"
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOS anything…"
          className="flex-1 rounded-full px-4 py-2 text-sm bg-transparent outline-none"
          style={{
            border: '1px solid rgba(139,92,246,0.3)',
            color: '#f0eeff',
          }}
        />

        {inputText.trim() && (
          <button
            aria-label="send"
            onClick={() => onSend(inputText.trim())}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.3)' }}
          >
            <Send size={14} color="#a78bfa" />
          </button>
        )}

        <button
          aria-label="mic toggle"
          onClick={onMicToggle}
          className={[
            'w-[50px] h-[50px] rounded-full flex items-center justify-center shrink-0',
            isListening ? 'animate-pulse' : '',
          ].join(' ')}
          style={{
            background: isListening ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.2)',
            boxShadow: isListening ? '0 0 20px rgba(139,92,246,0.6)' : 'none',
          }}
        >
          <Mic size={20} color={isListening ? '#c4b5fd' : '#8b5cf6'} />
        </button>
      </div>
    </div>
  )
}
