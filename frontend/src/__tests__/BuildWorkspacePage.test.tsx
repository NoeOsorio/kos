import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { KOSProvider } from '../context/KOSContext'
import BuildWorkspacePage from '../pages/BuildWorkspacePage'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

function renderAt(path: string) {
  return render(
    <KOSProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/build/:appType" element={<BuildWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    </KOSProvider>
  )
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => vi.useRealTimers())

describe('BuildWorkspacePage', () => {
  it('renders sidebar and draft area on desktop', () => {
    renderAt('/build/script')
    expect(screen.getByPlaceholderText(/what is the topic/i)).toBeInTheDocument()
    expect(screen.getByText(/configure your settings/i)).toBeInTheDocument()
  })

  it('renders Build button', () => {
    renderAt('/build/script')
    expect(screen.getByRole('button', { name: /build/i })).toBeInTheDocument()
  })

  it('shows Generating state after clicking Build', async () => {
    renderAt('/build/script')
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /build/i }))
    })
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })

  it('shows draft content after generation completes', async () => {
    renderAt('/build/script')
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /build/i }))
    })
    await act(async () => {
      vi.runAllTimers()
    })
    vi.useRealTimers()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: /generating/i })).not.toBeInTheDocument()
    )
    expect(screen.getByRole('button', { name: /build/i })).not.toBeDisabled()
  })

  it('saves session to localStorage after generation', async () => {
    renderAt('/build/script')
    const textarea = screen.getByPlaceholderText(/what is the topic/i)
    fireEvent.change(textarea, { target: { value: 'Productivity' } })
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /build/i }))
    })
    await act(async () => {
      vi.runAllTimers()
    })
    vi.useRealTimers()
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('kos_build_sessions') ?? '[]')
      expect(stored).toHaveLength(1)
      expect(stored[0].topic).toBe('Productivity')
    })
  })

  it('restores session from localStorage via ?session= param', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([{
      id: 's1', appType: 'script', topic: 'Restored Topic', format: 'Educational',
      length: '3 min', sourceIds: [], externalSources: [],
      draft: { type: 'script', text: 'Restored text' }, updatedAt: new Date().toISOString(),
    }]))
    renderAt('/build/script?session=s1')
    expect(screen.getByDisplayValue('Restored Topic')).toBeInTheDocument()
  })

  it('shows mobile Configure button on small screens', () => {
    renderAt('/build/ask')
    expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument()
  })
})
