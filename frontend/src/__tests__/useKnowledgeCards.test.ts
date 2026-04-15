import { renderHook, act } from '@testing-library/react'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'
import { vi } from 'vitest'

describe('useKnowledgeCards', () => {
  it('starts with no cards and no saved cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    expect(result.current.cards).toHaveLength(0)
    expect(result.current.savedCards).toHaveLength(0)
  })

  it('addCards adds new topic and similar cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You connected Stoicism to your daily decisions.' }],
        [{ id: 'node-mm', title: 'Mental Models', excerpt: 'Patterns across disciplines' }],
      )
    })
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0]).toMatchObject({ type: 'new', name: 'Stoicism', topicKey: 'stoicism' })
    expect(result.current.cards[1]).toMatchObject({ type: 'similar', title: 'Mental Models' })
  })

  it('hydrates an existing card when same topicKey arrives again', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'First synthesis.' }],
        [],
      )
    })
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'Richer second synthesis.' }],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(1)
    expect((result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard).synthesis).toBe('Richer second synthesis.')
  })

  it('cards do NOT auto-dismiss after 8 seconds', () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    act(() => { vi.advanceTimersByTime(10000) })
    expect(result.current.cards).toHaveLength(1)
    vi.useRealTimers()
  })

  it('dismiss removes a card by id', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    const id = result.current.cards[0].id
    act(() => { result.current.dismiss(id) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('save moves card from cards to savedCards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'stoicism', name: 'Stoicism', synthesis: 'You explored Stoicism.' }],
        [],
      )
    })
    const card = result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard
    act(() => { result.current.save(card) })
    expect(result.current.cards).toHaveLength(0)
    expect(result.current.savedCards).toHaveLength(1)
    expect(result.current.savedCards[0].topicKey).toBe('stoicism')
  })

  it('caps visible cards at 3, keeping newest', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [
          { topicKey: 'a', name: 'Topic A', synthesis: 'Synthesis A' },
          { topicKey: 'b', name: 'Topic B', synthesis: 'Synthesis B' },
          { topicKey: 'c', name: 'Topic C', synthesis: 'Synthesis C' },
          { topicKey: 'd', name: 'Topic D', synthesis: 'Synthesis D' },
        ],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(3)
    expect((result.current.cards[0] as import('../hooks/useKnowledgeCards').NewTopicCard).name).toBe('Topic B')
  })

  it('clearAll removes all cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ topicKey: 'a', name: 'A', synthesis: 'Synthesis A' }, { topicKey: 'b', name: 'B', synthesis: 'Synthesis B' }],
        [],
      )
    })
    act(() => { result.current.clearAll() })
    expect(result.current.cards).toHaveLength(0)
  })
})
