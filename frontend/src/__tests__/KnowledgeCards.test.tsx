import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import KnowledgeCards from '../components/talk/KnowledgeCards'
import type { KnowledgeCard, NewTopicCard } from '../hooks/useKnowledgeCards'

const newCard: KnowledgeCard = {
  id: 'new-stoicism-1',
  type: 'new',
  topicKey: 'stoicism',
  name: 'Stoicism',
  synthesis: 'You connected Stoicism to your daily decisions while reading Marcus Aurelius.',
}

const similarCard: KnowledgeCard = {
  id: 'similar-node-mm-1',
  type: 'similar',
  insightId: 'node-mm',
  title: 'Mental Models',
  excerpt: 'Patterns across disciplines',
}

const savedCard: NewTopicCard = {
  id: 'new-deep-work-1',
  type: 'new',
  topicKey: 'deep-work',
  name: 'Deep Work',
  synthesis: 'You recognized the value of deep work sessions during your morning routine.',
}

const noop = vi.fn()

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('KnowledgeCards', () => {
  it('renders nothing when cards and savedCards are both empty', () => {
    const { container } = wrap(
      <KnowledgeCards cards={[]} savedCards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a new topic card with name and synthesis', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText(/connected Stoicism/)).toBeInTheDocument()
  })

  it('renders "Save to brain" button on new topic card', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByRole('button', { name: /save to brain/i })).toBeInTheDocument()
  })

  it('calls onSave with card when save button clicked', () => {
    const onSave = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save to brain/i }))
    expect(onSave).toHaveBeenCalledWith(newCard)
  })

  it('calls onDismiss with card id when dismiss button clicked', () => {
    const onDismiss = vi.fn()
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={onDismiss} onSave={noop} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledWith('new-stoicism-1')
  })

  it('renders a similar card with title and excerpt', () => {
    wrap(<KnowledgeCards cards={[similarCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
    expect(screen.getByText('Patterns across disciplines')).toBeInTheDocument()
  })

  it('renders multiple cards', () => {
    wrap(
      <KnowledgeCards cards={[newCard, similarCard]} savedCards={[]} onDismiss={noop} onSave={noop} />
    )
    expect(screen.getByText('Stoicism')).toBeInTheDocument()
    expect(screen.getByText('Mental Models')).toBeInTheDocument()
  })

  it('renders "KNOWLEDGE DETECTED" header when cards are present', () => {
    wrap(<KnowledgeCards cards={[newCard]} savedCards={[]} onDismiss={noop} onSave={noop} />)
    expect(screen.getByText(/knowledge detected/i)).toBeInTheDocument()
  })
})
