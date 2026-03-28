import { useState, useRef, useCallback } from 'react'

interface UseSpeechRecognitionReturn {
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
}

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
      : null

  const isSupported = SpeechRecognitionAPI !== null

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) return
    const recognition = new SpeechRecognitionAPI() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const isFinal = result.isFinal ?? (result[0] as any)?.isFinal
        if (isFinal) {
          final += result[0].transcript
        }
      }
      if (final) setTranscript(prev => prev + final)
    }

    recognition.onerror = () => { recognitionRef.current = null }
    recognition.onend = () => { recognitionRef.current = null }

    recognitionRef.current = recognition
    recognition.start()
  }, [SpeechRecognitionAPI])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return { isSupported, transcript, startListening, stopListening, clearTranscript }
}
