import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { KOSProvider } from '../context/KOSContext'
import BuildPage from '../pages/BuildPage'

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <KOSProvider>
      <MemoryRouter>{children}</MemoryRouter>
    </KOSProvider>
  )
}

beforeEach(() => localStorage.clear())

describe('BuildPage', () => {
  it('shows the main heading', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/what do you want to build/i)).toBeInTheDocument()
  })

  it('renders all 5 app cards', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('Video Script')).toBeInTheDocument()
    expect(screen.getByText('Self Exam')).toBeInTheDocument()
    expect(screen.getByText('Ask Your Brain')).toBeInTheDocument()
    expect(screen.getByText('Topic Summary')).toBeInTheDocument()
    expect(screen.getByText('Thread / Post')).toBeInTheDocument()
  })

  it('renders a Coming Soon placeholder card', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('coming soon')).toBeInTheDocument()
  })

  it('shows RECENT section header', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/recent/i)).toBeInTheDocument()
  })

  it('shows empty recent state when no sessions', () => {
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText(/no recent sessions/i)).toBeInTheDocument()
  })

  it('shows a saved session in the recent list', () => {
    localStorage.setItem('kos_build_sessions', JSON.stringify([{
      id: 's1', appType: 'script', topic: 'My Topic', format: 'Personal',
      sourceIds: [], externalSources: [], draft: { type: 'script', text: '' },
      updatedAt: new Date().toISOString(),
    }]))
    render(<Wrapper><BuildPage /></Wrapper>)
    expect(screen.getByText('My Topic')).toBeInTheDocument()
  })
})
