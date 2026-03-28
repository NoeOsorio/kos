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

  it('renders the mic button', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByRole('button', { name: /mic/i })).toBeInTheDocument()
  })

  it('renders STANDBY status label', () => {
    render(<Wrapper><TalkPage /></Wrapper>)
    expect(screen.getByText('STANDBY')).toBeInTheDocument()
  })

  it('sends POST /api/talk on Enter', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ response: 'Hello from KOS' }),
    })
    global.fetch = mockFetch

    render(<Wrapper><TalkPage /></Wrapper>)
    const input = screen.getByPlaceholderText(/ask/i)
    fireEvent.change(input, { target: { value: 'What is this?' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/talk',
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
})
