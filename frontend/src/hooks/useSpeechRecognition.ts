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

  const SpeechRecognitionAPIRef = useRef<typeof SpeechRecognition | null>(
    typeof window !== 'undefined'
      ? (window.SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null)
      : null
  )

  const isSupported = SpeechRecognitionAPIRef.current !== null

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPIRef.current) return
    const recognition = new SpeechRecognitionAPIRef.current() as SpeechRecognition
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final) setTranscript(prev => prev + final)
    }

    recognition.onerror = () => { recognitionRef.current = null }
    recognition.onend = () => { recognitionRef.current = null }

    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
  }, [])

  const clearTranscript = useCallback(() => setTranscript(''), [])

  return { isSupported, transcript, startListening, stopListening, clearTranscript }
}
