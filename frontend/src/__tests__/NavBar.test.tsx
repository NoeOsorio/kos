import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { KOSProvider, useKOS } from '../context/KOSContext'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <KOSProvider><MemoryRouter>{children}</MemoryRouter></KOSProvider>
}

describe('NavBar', () => {
  it('renders the KOS logo', () => {
    render(<Wrapper><NavBar /></Wrapper>)
    expect(screen.getAllByText('K·O·S').length).toBeGreaterThan(0)
  })

  it('renders all three mode labels', () => {
    render(<Wrapper><NavBar /></Wrapper>)
    expect(screen.getAllByText('TALK').length).toBeGreaterThan(0)
    expect(screen.getAllByText('EXPLORE').length).toBeGreaterThan(0)
    expect(screen.getAllByText('BUILD').length).toBeGreaterThan(0)
  })

  it('clicking EXPLORE sets mode to explore', () => {
    let capturedMode = ''
    function Spy() {
      const { mode } = useKOS()
      capturedMode = mode
      return null
    }
    render(<KOSProvider><MemoryRouter><NavBar /><Spy /></MemoryRouter></KOSProvider>)
    fireEvent.click(screen.getAllByText('EXPLORE')[0])
    expect(capturedMode).toBe('explore')
  })

  it('clicking BUILD sets mode to build', () => {
    let capturedMode = ''
    function Spy() {
      const { mode } = useKOS()
      capturedMode = mode
      return null
    }
    render(<KOSProvider><MemoryRouter><NavBar /><Spy /></MemoryRouter></KOSProvider>)
    fireEvent.click(screen.getAllByText('BUILD')[0])
    expect(capturedMode).toBe('build')
  })
})
