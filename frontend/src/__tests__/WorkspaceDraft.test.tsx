import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkspaceDraft from '../components/build/WorkspaceDraft'
import type { AppDraft, AppType } from '../types/kos'

const scriptDraft: AppDraft = { type: 'script', text: 'Hello hook\n\nHello problem' }
const examDraft: AppDraft = {
  type: 'exam',
  questions: [
    { id: 'q1', text: 'What is X?', answer: 'X is Y.', collapsed: true },
  ],
}
const askDraft: AppDraft = { type: 'ask', answer: 'The answer is 42.' }
const summaryDraft: AppDraft = { type: 'summary', text: 'Summary text here.' }
const threadDraft: AppDraft = {
  type: 'thread',
  blocks: [{ id: 'b1', text: 'Thread intro post' }],
}

describe('WorkspaceDraft — empty state', () => {
  it('shows a prompt to configure and build when draft is null', () => {
    render(
      <WorkspaceDraft appType="script" draft={null} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/configure your settings/i)).toBeInTheDocument()
  })

  it('shows a loading indicator while generating', () => {
    render(
      <WorkspaceDraft appType="script" draft={null} isGenerating onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/generating/i)).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — script', () => {
  it('renders draft text', () => {
    render(
      <WorkspaceDraft appType="script" draft={scriptDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText(/hello hook/i)).toBeInTheDocument()
  })

  it('shows Regenerate and Copy buttons', () => {
    render(
      <WorkspaceDraft appType="script" draft={scriptDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy/i })).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — exam', () => {
  it('renders question text', () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('What is X?')).toBeInTheDocument()
  })

  it('answer is hidden by default (collapsed)', () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.queryByText('X is Y.')).not.toBeInTheDocument()
  })

  it('answer reveals on click', async () => {
    render(
      <WorkspaceDraft appType="exam" draft={examDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    await userEvent.click(screen.getByText('What is X?'))
    expect(screen.getByText('X is Y.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — ask', () => {
  it('renders the answer', () => {
    render(
      <WorkspaceDraft appType="ask" draft={askDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('The answer is 42.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — summary', () => {
  it('renders summary text', () => {
    render(
      <WorkspaceDraft appType="summary" draft={summaryDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('Summary text here.')).toBeInTheDocument()
  })
})

describe('WorkspaceDraft — thread', () => {
  it('renders thread blocks', () => {
    render(
      <WorkspaceDraft appType="thread" draft={threadDraft} isGenerating={false} onRegenerate={() => {}} onCopy={() => {}} />
    )
    expect(screen.getByText('Thread intro post')).toBeInTheDocument()
  })
})
