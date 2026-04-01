import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KOSProvider } from '../context/KOSContext'
import TalkPage from '../pages/TalkPage'

global.fetch = vi.fn()

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

describe('TalkPage', () => {
  it('renders the text input', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('renders the hold-to-talk hint', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText(/hold to talk/i)).toBeInTheDocument()
  })

  it('renders STANDBY status label', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText('STANDBY')).toBeInTheDocument()
  })

  it('sends POST /api/chat on Enter', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: Hello\n\ndata: [DONE]\n\n'))
        c.close()
      },
    })
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, body: stream })
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'What is this?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/chat',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('handles API error gracefully (no crash)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'))

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(screen.getByText('STANDBY')).toBeInTheDocument()
    })
  })

  it('calls /api/analyze after a successful /api/chat response', async () => {
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: Tell me more\n\ndata: [DONE]\n\n'))
        c.close()
      },
    })
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, body: stream })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ new_topics: [], similar: [] }),
      })
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'I read about Stoicism' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      const calls = (mockFetch.mock.calls as [string][]).map(c => c[0])
      expect(calls).toContain('/api/analyze')
    })
  })
})
