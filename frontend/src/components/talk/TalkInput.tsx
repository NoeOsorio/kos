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
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [inputText])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, transcript])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && inputText.trim()) {
      e.preventDefault()
      onSend(inputText.trim())
    }
  }

  return (
    <div className="flex flex-col w-full" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
      {/* Message history */}
      {messages.length > 0 && (
        <div
          className="flex flex-col gap-3 px-4 py-3 overflow-y-auto"
          style={{ maxHeight: '220px' }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <p
                className="text-sm leading-relaxed px-4 py-2 rounded-2xl max-w-[80%]"
                style={
                  msg.role === 'user'
                    ? { background: 'rgba(139,92,246,0.25)', color: '#f0eeff' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.8)' }
                }
              >
                {msg.content}
              </p>
            </div>
          ))}
          {/* Streaming assistant response */}
          {transcript && (
            <div className="flex justify-start">
              <p
                className="text-sm leading-relaxed px-4 py-2 rounded-2xl max-w-[80%] italic"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(240,238,255,0.6)' }}
              >
                {transcript}
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Streaming transcript when no history yet */}
      {messages.length === 0 && transcript && (
        <p
          className="px-4 py-3 text-sm italic text-center leading-relaxed"
          style={{ color: 'rgba(240,238,255,0.6)' }}
        >
          {transcript}
        </p>
      )}

      {/* Input row */}
      <div className="flex items-end gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOS anything…"
          className="flex-1 rounded-2xl px-4 py-3 text-sm bg-transparent outline-none resize-none leading-relaxed"
          style={{
            border: '1px solid rgba(139,92,246,0.35)',
            color: '#f0eeff',
            minHeight: '44px',
          }}
        />

        {inputText.trim() && (
          <button
            aria-label="send"
            onClick={() => onSend(inputText.trim())}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mb-0.5"
            style={{ background: 'rgba(139,92,246,0.4)' }}
          >
            <Send size={15} color="#a78bfa" />
          </button>
        )}
      </div>
    </div>
  )
}
