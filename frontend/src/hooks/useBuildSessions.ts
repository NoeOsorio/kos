import { useState, useCallback } from 'react'
import type { BuildSession } from '../types/kos'

const KEY = 'kos_build_sessions'

function load(): BuildSession[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(sessions: BuildSession[]): void {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

export function useBuildSessions() {
  const [sessions, setSessions] = useState<BuildSession[]>(load)

  const upsertSession = useCallback((session: BuildSession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === session.id)
      const next = idx >= 0
        ? prev.map((s, i) => (i === idx ? session : s))
        : [session, ...prev]
      persist(next)
      return next
    })
  }, [])

  const getSession = useCallback(
    (id: string) => sessions.find(s => s.id === id) ?? null,
    [sessions],
  )

  return { sessions, upsertSession, getSession }
}
