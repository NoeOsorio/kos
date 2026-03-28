import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { KnowledgeCard, NewTopicCard, SimilarCard } from '../../hooks/useKnowledgeCards'

interface KnowledgeCardsProps {
  cards: KnowledgeCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}

function NewTopicCardView({
  card,
  onDismiss,
  onSave,
}: {
  card: NewTopicCard
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  return (
    <div
      className="animate-slide-in-right"
      style={{
        background: 'rgba(8,8,20,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139,92,246,0.55)',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: '0 6px 24px rgba(139,92,246,0.25)',
        width: '185px',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '8px', color: 'rgba(139,92,246,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          New topic
        </span>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(139,92,246,0.9)', boxShadow: '0 0 5px rgba(139,92,246,0.7)' }} />
      </div>
      <p style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(240,238,255,0.98)', marginBottom: '3px' }}>{card.name}</p>
      <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.55)', marginBottom: '10px', lineHeight: 1.4 }}>{card.description}</p>
      <div className="flex gap-1">
        <button
          aria-label="save to brain"
          onClick={() => onSave(card)}
          style={{
            flex: 1, padding: '5px 0',
            background: 'rgba(139,92,246,0.35)',
            border: '1px solid rgba(139,92,246,0.6)',
            borderRadius: '8px',
            fontSize: '10px', color: 'rgba(196,181,253,1.0)', fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Save to brain
        </button>
        <button
          aria-label="dismiss"
          onClick={() => onDismiss(card.id)}
          style={{
            width: '28px', height: '28px',
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '8px',
            fontSize: '11px', color: 'rgba(196,181,253,0.35)',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

function SimilarCardView({
  card,
  onDismiss,
}: {
  card: SimilarCard
  onDismiss: (id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div
      className="animate-slide-in-right"
      style={{
        background: 'rgba(8,8,20,0.87)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(109,40,217,0.38)',
        borderRadius: '12px',
        padding: '10px 12px',
        boxShadow: '0 4px 16px rgba(109,40,217,0.12)',
        width: '185px',
        cursor: 'pointer',
      }}
      onClick={() => navigate('/explore')}
    >
      <div className="flex items-center justify-between mb-1">
        <span style={{ fontSize: '8px', color: 'rgba(109,40,217,0.85)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          In your brain
        </span>
        <button
          aria-label="dismiss"
          onClick={e => { e.stopPropagation(); onDismiss(card.id) }}
          style={{ background: 'none', border: 'none', fontSize: '10px', color: 'rgba(196,181,253,0.25)', cursor: 'pointer', padding: 0 }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(240,238,255,0.88)', marginBottom: '3px' }}>{card.title}</p>
      <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.5)', fontStyle: 'italic', lineHeight: 1.4 }}>{card.excerpt}</p>
      <p style={{ marginTop: '6px', fontSize: '8px', color: 'rgba(109,40,217,0.6)' }}>Tap to explore →</p>
    </div>
  )
}

export default function KnowledgeCards({ cards, onDismiss, onSave }: KnowledgeCardsProps) {
  const isMobile = useIsMobile()

  if (cards.length === 0) return null

  const cardList = (
    <div className="flex flex-col gap-2">
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )

  if (isMobile) {
    return (
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(8,8,20,0.97)',
          borderTop: '1px solid rgba(139,92,246,0.3)',
          borderRadius: '12px 12px 0 0',
          padding: '12px 16px 20px',
        }}
      >
        <div style={{ width: '28px', height: '3px', borderRadius: '2px', background: 'rgba(139,92,246,0.3)', margin: '0 auto 12px' }} />
        {cardList}
      </div>
    )
  }

  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2">
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )
}
