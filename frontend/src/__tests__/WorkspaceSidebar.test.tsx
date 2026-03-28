import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import WorkspaceSidebar from '../components/build/WorkspaceSidebar'

function Wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

const baseProps = {
  appType: 'script' as const,
  topic: '',
  onTopicChange: () => {},
  format: 'Personal',
  onFormatChange: () => {},
  length: '3 min',
  onLengthChange: () => {},
  question: '',
  onQuestionChange: () => {},
  sourceIds: [],
  onSourceToggle: () => {},
  onBuild: () => {},
  isGenerating: false,
}

describe('WorkspaceSidebar', () => {
  it('renders back link', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByRole('link', { name: /build/i })).toBeInTheDocument()
  })

  it('renders topic textarea', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByPlaceholderText(/what is the topic/i)).toBeInTheDocument()
  })

  it('renders Build button', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} /></Wrapper>)
    expect(screen.getByRole('button', { name: /build/i })).toBeInTheDocument()
  })

  it('Build button calls onBuild', async () => {
    const onBuild = vi.fn()
    render(<Wrapper><WorkspaceSidebar {...baseProps} onBuild={onBuild} /></Wrapper>)
    await userEvent.click(screen.getByRole('button', { name: /build/i }))
    expect(onBuild).toHaveBeenCalledTimes(1)
  })

  it('shows Format pills for script type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="script" /></Wrapper>)
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Educational')).toBeInTheDocument()
  })

  it('shows Length pills for script type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="script" /></Wrapper>)
    expect(screen.getByText('1 min')).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
  })

  it('shows question field for ask type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="ask" /></Wrapper>)
    expect(screen.getByPlaceholderText(/what do you want to know/i)).toBeInTheDocument()
  })

  it('shows difficulty pills for exam type', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} appType="exam" /></Wrapper>)
    expect(screen.getByText('Easy')).toBeInTheDocument()
    expect(screen.getByText('Medium')).toBeInTheDocument()
    expect(screen.getByText('Hard')).toBeInTheDocument()
  })

  it('shows Build button as disabled when isGenerating', () => {
    render(<Wrapper><WorkspaceSidebar {...baseProps} isGenerating /></Wrapper>)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })
})
