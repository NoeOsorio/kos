import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGraph } from '../hooks/useGraph'

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const mockData = {
  nodes: [
    { id: '1', label: 'Deep Work', cluster: 0, connections: ['2'], insight: 'Focus deeply.', date: '2024-01-01' },
    { id: '2', label: 'Flow State', cluster: 0, connections: ['1'], insight: 'Enter the zone.', date: '2024-01-02' },
  ],
  edges: [{ source: '1', target: '2', weight: 1.0 }],
}

describe('useGraph', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response)
  })

  it('starts in loading state', () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    expect(result.current.isLoading).toBe(true)
  })

  it('calls /api/graph', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(global.fetch).toHaveBeenCalledWith('/api/graph')
  })

  it('returns laid-out nodes with x, y, r, floatPhase', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.nodes).toHaveLength(2)
    const n = result.current.nodes[0]
    expect(typeof n.x).toBe('number')
    expect(typeof n.y).toBe('number')
    expect(typeof n.r).toBe('number')
    expect(typeof n.floatPhase).toBe('number')
  })

  it('returns edges from API', async () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.edges).toHaveLength(1)
    expect(result.current.edges[0].source).toBe('1')
  })

  it('returns empty arrays before data arrives', () => {
    const { result } = renderHook(() => useGraph(), { wrapper })
    expect(result.current.nodes).toEqual([])
    expect(result.current.edges).toEqual([])
  })

  it('sets isError when fetch returns non-ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) } as Response)
    const { result } = renderHook(() => useGraph(), { wrapper })
    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})
