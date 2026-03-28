import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import PillGroup from '../components/build/PillGroup'

describe('PillGroup', () => {
  it('renders all options as buttons', () => {
    render(<PillGroup options={['A', 'B', 'C']} value="A" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument()
  })

  it('renders label when provided', () => {
    render(<PillGroup label="Format" options={['A']} value="A" onChange={() => {}} />)
    expect(screen.getByText('Format')).toBeInTheDocument()
  })

  it('calls onChange with clicked option', async () => {
    const onChange = vi.fn()
    render(<PillGroup options={['A', 'B']} value="A" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(onChange).toHaveBeenCalledWith('B')
  })

  it('active pill has aria-pressed=true', () => {
    render(<PillGroup options={['A', 'B']} value="B" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'false')
  })
})
