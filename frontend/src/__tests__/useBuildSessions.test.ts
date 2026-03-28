import { renderHook, act } from '@testing-library/react'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { BuildSession } from '../types/kos'

const SESSION: BuildSession = {
  id: 'abc',
  appType: 'script',
  topic: 'Productivity',
  format: 'Personal',
  sourceIds: [],
  externalSources: [],
  draft: { type: 'script', text: 'hello' },
  updatedAt: '2026-01-01T00:00:00Z',
}

beforeEach(() => localStorage.clear())

describe('useBuildSessions', () => {
  it('starts empty when localStorage is clean', () => {
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.sessions).toEqual([])
  })

  it('upsertSession adds a new session and persists it', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('abc')
    expect(JSON.parse(localStorage.getItem('kos_build_sessions')!)).toHaveLength(1)
  })

  it('upsertSession updates an existing session by id', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    act(() => result.current.upsertSession({ ...SESSION, topic: 'Deep Work' }))
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].topic).toBe('Deep Work')
  })

  it('getSession returns null for unknown id', () => {
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.getSession('unknown')).toBeNull()
  })

  it('getSession returns the session for a known id', () => {
    const { result } = renderHook(() => useBuildSessions())
    act(() => result.current.upsertSession(SESSION))
    expect(result.current.getSession('abc')).toEqual(SESSION)
  })

  it('hydrates from localStorage on mount', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([SESSION]))
    const { result } = renderHook(() => useBuildSessions())
    expect(result.current.sessions).toHaveLength(1)
    expect(result.current.sessions[0].id).toBe('abc')
  })
})
