import { render, screen, fireEvent } from '@testing-library/react'
import { KOSProvider, useKOS } from '../context/KOSContext'

function ModeDisplay() {
  const { mode, setMode } = useKOS()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <button onClick={() => setMode('explore')}>go explore</button>
      <button onClick={() => setMode('build')}>go build</button>
    </div>
  )
}

function NodeDisplay() {
  const { selectedNodeId, setSelectedNodeId } = useKOS()
  return (
    <div>
      <span data-testid="node">{selectedNodeId ?? 'none'}</span>
      <button onClick={() => setSelectedNodeId('node-1')}>select</button>
      <button onClick={() => setSelectedNodeId(null)}>deselect</button>
    </div>
  )
}

describe('KOSContext', () => {
  it('initializes mode as talk', () => {
    render(<KOSProvider><ModeDisplay /></KOSProvider>)
    expect(screen.getByTestId('mode').textContent).toBe('talk')
  })

  it('setMode updates mode', () => {
    render(<KOSProvider><ModeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('go explore'))
    expect(screen.getByTestId('mode').textContent).toBe('explore')
  })

  it('setSelectedNodeId updates selectedNodeId', () => {
    render(<KOSProvider><NodeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('select'))
    expect(screen.getByTestId('node').textContent).toBe('node-1')
  })

  it('setSelectedNodeId(null) clears selection', () => {
    render(<KOSProvider><NodeDisplay /></KOSProvider>)
    fireEvent.click(screen.getByText('select'))
    fireEvent.click(screen.getByText('deselect'))
    expect(screen.getByTestId('node').textContent).toBe('none')
  })

  it('throws if useKOS used outside KOSProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ModeDisplay />)).toThrow()
    consoleSpy.mockRestore()
  })
})
