import { KeyboardEvent, useRef, useEffect, useState } from 'react'
import { Send, ChevronUp, ChevronDown } from 'lucide-react'
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
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (showHistory) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showHistory])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [inputText])

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && inputText.trim()) {
      e.preventDefault()
      onSend(inputText.trim())
    }
  }

  const hasHistory = messages.length > 0
  // Latest assistant message or streaming transcript
  const latestAssistant = transcript || (messages.length > 0
    ? [...messages].reverse().find(m => m.role === 'assistant')?.content
    : undefined)

  return (
    <div className="flex flex-col items-center w-full">

      {/* Collapsed view: show only latest answer */}
      {!showHistory && latestAssistant && (
        <p
          className="text-sm leading-relaxed px-6 py-2 w-full max-w-xl text-center"
          style={{ color: 'rgba(240,238,255,0.7)' }}
        >
          {latestAssistant}
        </p>
      )}

      {/* Expanded history */}
      {showHistory && hasHistory && (
        <div
          className="flex flex-col gap-2 px-4 py-3 overflow-y-auto w-full max-w-xl"
          style={{ maxHeight: '220px' }}
        >
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
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar + history toggle */}
      <div className="flex items-end gap-2 px-4 py-3 w-full max-w-xl">
        {hasHistory && (
          <button
            aria-label={showHistory ? 'hide history' : 'show history'}
            onClick={() => setShowHistory(v => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mb-0.5"
            style={{ border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(167,139,250,0.6)' }}
          >
            {showHistory ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        )}
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask KOS anything…"
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm bg-transparent outline-none resize-none overflow-hidden"
          style={{ border: '1px solid rgba(139,92,246,0.35)', color: '#f0eeff', minHeight: '42px', maxHeight: '160px' }}
        />
        {inputText.trim() && (
          <button
            aria-label="send"
            onClick={() => onSend(inputText.trim())}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mb-0.5"
            style={{ background: 'rgba(139,92,246,0.4)' }}
          >
            <Send size={14} color="#a78bfa" />
          </button>
        )}
      </div>
    </div>
  )
}
