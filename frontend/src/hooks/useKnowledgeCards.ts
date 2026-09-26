import { useState, useCallback } from 'react'

export interface NewTopicCard {
  id: string
  type: 'new'
  topicKey: string
  name: string
  synthesis: string
}

export interface SimilarCard {
  id: string
  type: 'similar'
  insightId: string
  title: string
  excerpt: string
}

export type KnowledgeCard = NewTopicCard | SimilarCard

interface TopicItem { topicKey: string; name: string; synthesis: string }
interface SimilarItem { id: string; title: string; excerpt: string }

const MAX_CARDS = 3

export function useKnowledgeCards() {
  const [cards, setCards] = useState<KnowledgeCard[]>([])
  const [savedCards, setSavedCards] = useState<NewTopicCard[]>([])

  const dismiss = useCallback((id: string) => {
    setCards(prev => prev.filter(c => c.id !== id))
  }, [])

  const save = useCallback((card: NewTopicCard) => {
    setCards(prev => prev.filter(c => c.id !== card.id))
    setSavedCards(prev => [...prev, card])
  }, [])

  const addCards = useCallback((
    newTopics: TopicItem[],
    similar: SimilarItem[],
  ) => {
    const incomingSimilar: SimilarCard[] = similar.map(s => ({
      id: `similar-${s.id}-${Date.now()}`,
      type: 'similar',
      insightId: s.id,
      title: s.title,
      excerpt: s.excerpt,
    }))

    setCards(prev => {
      let updated = [...prev]

      // Hydrate or add new topic cards
      for (const t of newTopics) {
        const existingIdx = updated.findIndex(c => c.type === 'new' && (c as NewTopicCard).topicKey === t.topicKey)
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], synthesis: t.synthesis } as NewTopicCard
        } else {
          updated.push({
            id: `new-${t.topicKey}-${Date.now()}`,
            type: 'new',
            topicKey: t.topicKey,
            name: t.name,
            synthesis: t.synthesis,
          })
        }
      }

      // Add similar cards
      updated = [...updated, ...incomingSimilar]

      // Cap at MAX_CARDS (keep newest)
      return updated.slice(-MAX_CARDS)
    })
  }, [])

  const clearAll = useCallback(() => {
    setCards([])
  }, [])

  return { cards, savedCards, addCards, dismiss, save, clearAll }
}
