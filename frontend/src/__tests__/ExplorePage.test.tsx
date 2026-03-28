import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KOSProvider } from '../context/KOSContext'
import ExplorePage from '../pages/ExplorePage'

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

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return (
    <QueryClientProvider client={qc}>
      <KOSProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </KOSProvider>
    </QueryClientProvider>
  )
}

describe('ExplorePage', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        nodes: [
          { id: '1', label: 'Deep Work', cluster: 0, connections: [], insight: 'Focus.', date: '2024-01-01' },
        ],
        edges: [],
      }),
    } as Response)
  })

  it('shows loading state while fetching', () => {
    render(<Wrapper><ExplorePage /></Wrapper>)
    expect(screen.getByText(/loading graph/i)).toBeInTheDocument()
  })

  it('renders canvas after data loads', async () => {
    const { container } = render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(container.querySelector('canvas')).toBeInTheDocument())
  })

  it('does not show NodeDetailPanel when no node selected', async () => {
    render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(screen.queryByText(/connections/)).not.toBeInTheDocument()
  })

  it('shows error state when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    render(<Wrapper><ExplorePage /></Wrapper>)
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument())
  })
})
