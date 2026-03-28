import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import KnowledgeSources from '../components/build/KnowledgeSources'

describe('KnowledgeSources', () => {
  it('shows section label', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByText(/knowledge sources/i)).toBeInTheDocument()
  })

  it('shows empty state when no sources', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByText(/no sources added/i)).toBeInTheDocument()
  })

  it('shows Add source button', () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    expect(screen.getByRole('button', { name: /add source/i })).toBeInTheDocument()
  })

  it('shows source count when sources are present', () => {
    render(<KnowledgeSources sourceIds={['a', 'b']} onToggle={() => {}} />)
    expect(screen.getByText(/2/)).toBeInTheDocument()
  })

  it('clicking Add source shows URL input', async () => {
    render(<KnowledgeSources sourceIds={[]} onToggle={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /add source/i }))
    expect(screen.getByPlaceholderText(/paste url or search/i)).toBeInTheDocument()
  })
})
