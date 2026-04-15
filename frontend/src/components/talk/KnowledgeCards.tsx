import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useIsMobile } from '../../hooks/useIsMobile'
import type { KnowledgeCard, NewTopicCard, SimilarCard } from '../../hooks/useKnowledgeCards'

interface KnowledgeCardsProps {
  cards: KnowledgeCard[]
  savedCards: NewTopicCard[]
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
      style={{
        background: 'rgba(8,8,20,0.94)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(139,92,246,0.55)',
        borderRadius: '12px',
        padding: '12px 14px',
        boxShadow: '0 6px 24px rgba(139,92,246,0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ fontSize: '8px', color: 'rgba(139,92,246,0.9)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          New insight
        </span>
        <button
          aria-label="dismiss"
          onClick={() => onDismiss(card.id)}
          style={{
            background: 'none', border: 'none',
            fontSize: '11px', color: 'rgba(196,181,253,0.35)',
            cursor: 'pointer', padding: 0,
          }}
        >
          ✕
        </button>
      </div>
      <p style={{ fontSize: '13px', fontWeight: 700, color: 'rgba(240,238,255,0.98)', marginBottom: '6px' }}>
        {card.name}
      </p>
      <p style={{ fontSize: '11px', color: 'rgba(196,181,253,0.65)', marginBottom: '12px', lineHeight: 1.5 }}>
        {card.synthesis}
      </p>
      <button
        aria-label="save to brain"
        onClick={() => onSave(card)}
        style={{
          width: '100%', padding: '6px 0',
          background: 'rgba(139,92,246,0.35)',
          border: '1px solid rgba(139,92,246,0.6)',
          borderRadius: '8px',
          fontSize: '10px', color: 'rgba(196,181,253,1.0)', fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Save to brain
      </button>
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
      style={{
        background: 'rgba(8,8,20,0.87)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(109,40,217,0.38)',
        borderRadius: '12px',
        padding: '12px 14px',
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

// Desktop: plain scrollable card list — parent (TalkPage) controls positioning
function DesktopPanel({
  cards,
  onDismiss,
  onSave,
}: {
  cards: KnowledgeCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto pt-8 px-4 pb-6 gap-3">
      <p
        style={{
          fontSize: '9px', color: 'rgba(139,92,246,0.5)',
          letterSpacing: '2.5px', textTransform: 'uppercase',
          fontFamily: 'monospace', marginBottom: '4px',
        }}
      >
        Knowledge detected
      </p>
      {cards.map(card =>
        card.type === 'new'
          ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
          : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
      )}
    </div>
  )
}

type DrawerState = 'closed' | 'open'

// Mobile: fixed bottom drawer with pull handle, swipe gesture, pending + saved sections
function MobileDrawer({
  cards,
  savedCards,
  onDismiss,
  onSave,
}: {
  cards: KnowledgeCard[]
  savedCards: NewTopicCard[]
  onDismiss: (id: string) => void
  onSave: (card: NewTopicCard) => void
}) {
  const [drawerState, setDrawerState] = useState<DrawerState>('closed')
  const touchStartYRef = useRef(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const delta = touchStartYRef.current - e.changedTouches[0].clientY
    if (delta > 50) setDrawerState('open')
    if (delta < -50) setDrawerState('closed')
  }, [])

  const pendingCount = cards.filter(c => c.type === 'new').length
  const drawerHeight = drawerState === 'open' ? '70vh' : '36px'

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex flex-col"
      style={{
        height: drawerHeight,
        transition: 'height 0.3s cubic-bezier(0.32,0.72,0,1)',
        background: 'rgba(8,8,20,0.97)',
        borderTop: '1px solid rgba(139,92,246,0.2)',
        borderRadius: '16px 16px 0 0',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull handle */}
      <button
        aria-label={drawerState === 'open' ? 'close knowledge drawer' : 'open knowledge drawer'}
        onClick={() => setDrawerState(s => s === 'open' ? 'closed' : 'open')}
        className="flex items-center justify-center gap-2 w-full shrink-0"
        style={{ height: '36px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div style={{ width: '32px', height: '3px', borderRadius: '2px', background: 'rgba(139,92,246,0.3)' }} />
        {pendingCount > 0 && (
          <span style={{
            fontSize: '9px', fontFamily: 'monospace',
            color: 'rgba(139,92,246,0.8)',
            background: 'rgba(139,92,246,0.15)',
            borderRadius: '8px', padding: '1px 6px',
          }}>
            {pendingCount}
          </span>
        )}
      </button>

      {/* Drawer content */}
      {drawerState === 'open' && (
        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {/* Pending section */}
          {cards.length > 0 && (
            <>
              <p style={{ fontSize: '9px', color: 'rgba(139,92,246,0.5)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '12px' }}>
                Pending
              </p>
              <div className="flex flex-col gap-3 mb-6">
                {cards.map(card =>
                  card.type === 'new'
                    ? <NewTopicCardView key={card.id} card={card} onDismiss={onDismiss} onSave={onSave} />
                    : <SimilarCardView key={card.id} card={card} onDismiss={onDismiss} />
                )}
              </div>
            </>
          )}

          {/* Saved this session section */}
          {savedCards.length > 0 && (
            <>
              <p style={{ fontSize: '9px', color: 'rgba(109,40,217,0.5)', letterSpacing: '2px', textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: '12px' }}>
                Saved this session
              </p>
              <div className="flex flex-col gap-2">
                {savedCards.map(card => (
                  <div key={card.id} style={{ borderBottom: '1px solid rgba(139,92,246,0.1)', paddingBottom: '8px' }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(240,238,255,0.7)', marginBottom: '2px' }}>{card.name}</p>
                    <p style={{ fontSize: '10px', color: 'rgba(196,181,253,0.4)', lineHeight: 1.4 }}>
                      {card.synthesis.length > 80 ? card.synthesis.slice(0, 80) + '…' : card.synthesis}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default function KnowledgeCards({ cards, savedCards, onDismiss, onSave }: KnowledgeCardsProps) {
  const isMobile = useIsMobile()

  const hasContent = cards.length > 0 || savedCards.length > 0
  if (!hasContent) return null

  if (isMobile) {
    return (
      <MobileDrawer
        cards={cards}
        savedCards={savedCards}
        onDismiss={onDismiss}
        onSave={onSave}
      />
    )
  }

  return (
    <DesktopPanel
      cards={cards}
      onDismiss={onDismiss}
      onSave={onSave}
    />
  )
}
