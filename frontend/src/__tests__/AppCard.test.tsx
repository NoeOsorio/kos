import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileText } from 'lucide-react'
import { describe, it, expect, vi } from 'vitest'
import AppCard from '../components/build/AppCard'

describe('AppCard', () => {
  it('renders name, description, and tag', () => {
    render(
      <AppCard
        Icon={FileText}
        name="Topic Summary"
        description="Synthesize a topic from your graph."
        tag="SYNTHESIS"
        onClick={() => {}}
      />
    )
    expect(screen.getByText('Topic Summary')).toBeInTheDocument()
    expect(screen.getByText('Synthesize a topic from your graph.')).toBeInTheDocument()
    expect(screen.getByText('SYNTHESIS')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<AppCard Icon={FileText} name="X" description="" tag="T" onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    render(<AppCard Icon={FileText} name="X" description="" tag="SOON" onClick={onClick} disabled />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('shows "coming soon" label when disabled', () => {
    render(<AppCard Icon={FileText} name="X" description="" tag="SOON" onClick={() => {}} disabled />)
    expect(screen.getByText('coming soon')).toBeInTheDocument()
  })
})
