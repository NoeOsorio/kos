import { render, screen, fireEvent } from '@testing-library/react'
import TalkInput from '../components/talk/TalkInput'

const defaultProps = {
  transcript: '',
  inputText: '',
  messages: [],
  onInputChange: vi.fn(),
  onSend: vi.fn(),
}

describe('TalkInput', () => {
  it('renders text input', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.getByPlaceholderText(/ask/i)).toBeInTheDocument()
  })

  it('does not render a mic button', () => {
    render(<TalkInput {...defaultProps} />)
    expect(screen.queryByRole('button', { name: /mic/i })).not.toBeInTheDocument()
  })

  it('calls onInputChange when typing', () => {
    const onInputChange = vi.fn()
    render(<TalkInput {...defaultProps} onInputChange={onInputChange} />)
    fireEvent.change(screen.getByPlaceholderText(/ask/i), { target: { value: 'hello' } })
    expect(onInputChange).toHaveBeenCalledWith('hello')
  })

  it('shows send button only when inputText is non-empty', () => {
    const { rerender } = render(<TalkInput {...defaultProps} inputText="" />)
    expect(screen.queryByRole('button', { name: /send/i })).not.toBeInTheDocument()
    rerender(<TalkInput {...defaultProps} inputText="hello" />)
    expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument()
  })

  it('calls onSend with inputText when send button clicked', () => {
    const onSend = vi.fn()
    render(<TalkInput {...defaultProps} inputText="hello" onSend={onSend} />)
    fireEvent.click(screen.getByRole('button', { name: /send/i }))
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('calls onSend on Enter key', () => {
    const onSend = vi.fn()
    render(<TalkInput {...defaultProps} inputText="hello" onSend={onSend} />)
    fireEvent.keyDown(screen.getByPlaceholderText(/ask/i), { key: 'Enter' })
    expect(onSend).toHaveBeenCalledWith('hello')
  })

  it('renders transcript text when provided', () => {
    render(<TalkInput {...defaultProps} transcript="Here is what KOS said." />)
    expect(screen.getByText('Here is what KOS said.')).toBeInTheDocument()
  })
})
