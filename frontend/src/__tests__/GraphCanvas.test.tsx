import { render, fireEvent } from '@testing-library/react'
import GraphCanvas from '../components/explore/GraphCanvas'
import type { KOSNode, GraphEdge } from '../types/kos'

const mockCtx = {
  clearRect: vi.fn(), beginPath: vi.fn(), arc: vi.fn(),
  fill: vi.fn(), stroke: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  fillText: vi.fn(), save: vi.fn(), restore: vi.fn(),
  scale: vi.fn(), translate: vi.fn(),
  createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(
    () => mockCtx as unknown as CanvasRenderingContext2D,
  )
})

const node = (id: string, x = 100, y = 100): KOSNode => ({
  id, label: id, cluster: 0, connections: [],
  insight: 'test', date: '2024-01-01',
  x, y, r: 10, floatPhase: 0,
})

const nodes: KOSNode[] = [node('a', 100, 100), node('b', 200, 200)]
const edges: GraphEdge[] = [{ source: 'a', target: 'b', weight: 1.0 }]

describe('GraphCanvas', () => {
  it('renders a canvas element', () => {
    const { container } = render(
      <GraphCanvas nodes={nodes} edges={edges} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('canvas')).toBeInTheDocument()
  })

  it('canvas has aria-label "Knowledge graph"', () => {
    const { container } = render(
      <GraphCanvas nodes={nodes} edges={edges} selectedId={null} onSelect={() => {}} />,
    )
    expect(container.querySelector('canvas')?.getAttribute('aria-label')).toBe('Knowledge graph')
  })

  it('calls onSelect(null) when clicking empty area', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <GraphCanvas nodes={[]} edges={[]} selectedId={null} onSelect={onSelect} />,
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.mouseDown(canvas, { clientX: 500, clientY: 500 })
    fireEvent.mouseUp(canvas, { clientX: 500, clientY: 500 })
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('does not call onSelect when drag ends', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <GraphCanvas nodes={[]} edges={[]} selectedId={null} onSelect={onSelect} />,
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 })
    fireEvent.mouseMove(window, { clientX: 120, clientY: 120 })
    fireEvent.mouseUp(window, { clientX: 120, clientY: 120 })
    expect(onSelect).not.toHaveBeenCalled()
  })
})
