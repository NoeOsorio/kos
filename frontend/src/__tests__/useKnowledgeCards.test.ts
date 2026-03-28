import { renderHook, act } from '@testing-library/react'
import { useKnowledgeCards } from '../hooks/useKnowledgeCards'

describe('useKnowledgeCards', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('starts with no cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    expect(result.current.cards).toHaveLength(0)
  })

  it('addCards adds new topic and similar cards', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [{ id: 'node-mm', title: 'Mental Models', excerpt: 'Patterns across disciplines' }],
      )
    })
    expect(result.current.cards).toHaveLength(2)
    expect(result.current.cards[0]).toMatchObject({ type: 'new', name: 'Stoicism' })
    expect(result.current.cards[1]).toMatchObject({ type: 'similar', title: 'Mental Models' })
  })

  it('dismiss removes a card by id', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [],
      )
    })
    const id = result.current.cards[0].id
    act(() => { result.current.dismiss(id) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('cards auto-dismiss after 8 seconds', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [{ name: 'Stoicism', description: 'Philosophy of virtue' }],
        [],
      )
    })
    expect(result.current.cards).toHaveLength(1)
    act(() => { vi.advanceTimersByTime(8000) })
    expect(result.current.cards).toHaveLength(0)
  })

  it('caps visible cards at 3, dismissing oldest first', () => {
    const { result } = renderHook(() => useKnowledgeCards())
    act(() => {
      result.current.addCards(
        [
          { name: 'Topic A', description: 'Desc A' },
          { name: 'Topic B', description: 'Desc B' },
          { name: 'Topic C', description: 'Desc C' },
          { name: 'Topic D', description: 'Desc D' },
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
        [{ name: 'A', description: 'a' }, { name: 'B', description: 'b' }],
        [],
      )
    })
    act(() => { result.current.clearAll() })
    expect(result.current.cards).toHaveLength(0)
  })
})
