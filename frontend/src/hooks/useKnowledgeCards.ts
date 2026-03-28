import { useState, useCallback, useRef } from 'react'

export interface NewTopicCard {
  id: string
  type: 'new'
  name: string
  description: string
}

export interface SimilarCard {
  id: string
  type: 'similar'
  insightId: string
  title: string
  excerpt: string
}

export type KnowledgeCard = NewTopicCard | SimilarCard

interface TopicItem { name: string; description: string }
interface SimilarItem { id: string; title: string; excerpt: string }

const MAX_CARDS = 3
const AUTO_DISMISS_MS = 8000

export function useKnowledgeCards() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) { clearTimeout(timer); timersRef.current.delete(id) }
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  const scheduleAutoDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
    timersRef.current.set(id, timer)
  }, [dismiss])

  const addCards = useCallback((
    newTopics: TopicItem[],
    similar: SimilarItem[],
  ) => {
    const incoming: KnowledgeCard[] = [
      ...newTopics.map((t): NewTopicCard => ({
        id: `new-${t.name}-${Date.now()}`,
        type: 'new',
        name: t.name,
        description: t.description,
      })),
      ...similar.map((s): SimilarCard => ({
        id: `similar-${s.id}-${Date.now()}`,
        type: 'similar',
        insightId: s.id,
        title: s.title,
        excerpt: s.excerpt,
      })),
    ]

    if (incoming.length === 0) return

    setCards(prev => {
      const combined = [...prev, ...incoming]
      const capped = combined.slice(-MAX_CARDS)
      // Cancel timers for dropped cards
      const keptIds = new Set(capped.map(c => c.id))
      combined.forEach(c => {
        if (!keptIds.has(c.id)) {
          const t = timersRef.current.get(c.id)
          if (t) { clearTimeout(t); timersRef.current.delete(c.id) }
        }
      })
      return capped
    })

    incoming.slice(-MAX_CARDS).forEach(c => scheduleAutoDismiss(c.id))
  }, [scheduleAutoDismiss])

  const clearAll = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current.clear()
    setCards([])
  }, [])

  return { cards, addCards, dismiss, clearAll }
}
