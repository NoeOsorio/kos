import { KeyboardEvent, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import type { Message } from '../../hooks/useVoiceInteraction'

interface TalkInputProps {
  transcript: string
  inputText: string
  messages: Message[]
  onInputChange: (text: string) => void
  onSend: (text: string) => void
}

export default function TalkInput({
  transcript,
  inputText,
  messages,
  onInputChange,
  onSend,
}: TalkInputProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript])

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && inputText.trim()) {
      onSend(inputText.trim())
    }
  }

  return (
    <div className="flex flex-col w-full" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
      {/* Message history */}
      {(messages.length > 0 || transcript) && (
        <div className="flex flex-col gap-2 px-4 py-3 overflow-y-auto" style={{ maxHeight: '200px' }}>
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p
                className="text-sm leading-relaxed px-3 py-2 rounded-2xl max-w-[80%]"
                style={
                  msg.role === 'user'
                    ? { background: 'rgba(139,92,246,0.25)', color: '#f0eeff' }
                    : { color: 'rgba(240,238,255,0.75)' }
                }
              >
                {msg.content}
              </p>
            </div>
          ))}
          {transcript && (
            <p className="text-sm italic px-3" style={{ color: 'rgba(240,238,255,0.5)' }}>
              {transcript}
            </p>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Chat input bar */}
      <div className="flex items-center gap-2 px-4 py-3">
        <input
          type="text"
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOS anything…"
          className="flex-1 rounded-full px-4 py-2.5 text-sm bg-transparent outline-none"
          style={{ border: '1px solid rgba(139,92,246,0.35)', color: '#f0eeff' }}
        />
        {inputText.trim() && (
          <button
            aria-label="send"
            onClick={() => onSend(inputText.trim())}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(139,92,246,0.4)' }}
          >
            <Send size={14} color="#a78bfa" />
          </button>
        )}
      </div>
    </div>
  )
}
