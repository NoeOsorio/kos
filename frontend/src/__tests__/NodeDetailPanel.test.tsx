import { render, screen, fireEvent } from '@testing-library/react'
import NodeDetailPanel from '../components/explore/NodeDetailPanel'
import type { KOSNode } from '../types/kos'

const node: KOSNode = {
  id: '1', label: 'Deep Work', cluster: 0,
  connections: ['2', '3'],
  insight: 'Concentrated work produces rare results.',
  date: '2024-01-15', x: 100, y: 100, r: 12, floatPhase: 0,
}

describe('NodeDetailPanel', () => {
  it('renders node label', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Deep Work')).toBeInTheDocument()
  })

  it('renders node insight', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Concentrated work produces rare results.')).toBeInTheDocument()
  })

  it('renders cluster name', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('Productivity')).toBeInTheDocument()
  })

  it('renders plural "connections" for count > 1', () => {
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('2 connections')).toBeInTheDocument()
  })

  it('renders singular "connection" for count === 1', () => {
    const single = { ...node, connections: ['x'] }
    render(<NodeDetailPanel node={single} onClose={() => {}} onTalk={() => {}} />)
    expect(screen.getByText('1 connection')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<NodeDetailPanel node={node} onClose={onClose} onTalk={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onTalk with the node when discuss button clicked', () => {
    const onTalk = vi.fn()
    render(<NodeDetailPanel node={node} onClose={() => {}} onTalk={onTalk} />)
    fireEvent.click(screen.getByRole('button', { name: /discuss/i }))
    expect(onTalk).toHaveBeenCalledWith(node)
  })
})
