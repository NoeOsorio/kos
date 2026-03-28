import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { KnowledgeCard } from '../hooks/useKnowledgeCards'

const newCard: KnowledgeCard = {
  id: 'new-stoicism-1',
  type: 'new',
  name: 'Stoicism',
  description: 'Philosophy of virtue and control',
}

const similarCard: KnowledgeCard = {
  id: 'similar-node-mm-1',
  type: 'similar',
  insightId: 'node-mm',
  title: 'Mental Models',
  excerpt: 'Patterns across disciplines',
}

const noop = vi.fn()

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('KnowledgeCards', () => {
  it('renders nothing when cards array is empty', () => {
    const { container } = wrap(
      <KnowledgeCards cards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a new topic card with topic name', () => {
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Philosophy of virtue and control')).toBeInTheDocument()
  })

  it('renders "Save to brain" button on new topic card', () => {
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByRole('button', { name: /save to brain/i })).toBeInTheDocument()
  })

  it('calls onSave with card when save button clicked', () => {
    const onSave = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={noop} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save to brain/i }))
    expect(onSave).toHaveBeenCalledWith(newCard)
  })

  it('calls onDismiss with card id when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} onDismiss={onDismiss} onSave={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledWith('new-stoicism-1')
  })

  it('renders a similar card with title and excerpt', () => {
    wrap(<KnowledgeCards cards={[similarCard]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
    expect(screen.getByText('Patterns across disciplines')).toBeInTheDocument()
  })

  it('renders multiple cards', () => {
    wrap(
      <KnowledgeCards cards={[newCard, similarCard]} onDismiss={noop} onSave={noop} />
    )
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
  })
})
