import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from '../App'

function renderApp(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('App routing', () => {
  it('renders TalkPage at /', () => {
    renderApp('/')
    expect(screen.getAllByText(/TALK/i).length).toBeGreaterThan(0)
  })

  it('renders ExplorePage at /explore', () => {
    renderApp('/explore')
    expect(screen.getAllByText(/EXPLORE/i).length).toBeGreaterThan(0)
  })

  it('renders BuildPage at /build', () => {
    renderApp('/build')
    expect(screen.getAllByText(/BUILD/i).length).toBeGreaterThan(0)
  })

  it('renders BuildWorkspacePage at /build/script', () => {
    renderApp('/build/script')
    expect(screen.getAllByText(/SCRIPT/i).length).toBeGreaterThan(0)
  })
})
