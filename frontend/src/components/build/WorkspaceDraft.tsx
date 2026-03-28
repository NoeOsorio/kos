import { useState } from 'react'
import { RefreshCw, Copy } from 'lucide-react'
import type { AppType, AppDraft } from '../../types/kos'

interface WorkspaceDraftProps {
  appType: AppType
  draft: AppDraft | null
  isGenerating: boolean
  onRegenerate: () => void
  onCopy: () => void
}

function SectionTag({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/25">
        {label}
      </span>
      <div className="flex-1 h-px bg-white/6" />
    </div>
  )
}

function ScriptContent({ text }: { text: string }) {
  const sections = [
    { tag: 'Hook', marker: /hook/i },
    { tag: 'Problem', marker: /problem/i },
    { tag: 'Personal', marker: /personal/i },
    { tag: 'Mechanism', marker: /mechanism/i },
    { tag: 'CTA', marker: /cta/i },
  ]
  const paragraphs = text.split(/\n\n+/)
  const tagged = paragraphs.map(p => {
    const match = sections.find(s => s.marker.test(p))
    return { tag: match?.tag ?? null, text: p.replace(/^#+\s*/, '').trim() }
  })

  return (
    <div>
      {tagged.map((block, i) => (
        <div key={i}>
          {block.tag && <SectionTag label={block.tag} />}
          <p className="text-[15px] leading-[1.8] text-text-primary/82">{block.text}</p>
        </div>
      ))}
    </div>
  )
}

function ExamContent({ questions }: { questions: { id: string; text: string; answer: string; collapsed: boolean }[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={q.id} className="border border-white/8 rounded-lg overflow-hidden">
          <button
            onClick={() => toggle(q.id)}
            className="w-full text-left p-4 flex items-start gap-3"
          >
            <span className="font-mono text-xs text-white/25 mt-0.5 shrink-0">{i + 1}.</span>
            <span className="text-sm text-text-primary">{q.text}</span>
          </button>
          {expandedIds.has(q.id) && (
            <div className="px-4 pb-4 pl-10 border-t border-white/6">
              <p className="text-sm text-white/70 leading-relaxed pt-3">{q.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function AskContent({ answer }: { answer: string }) {
  return (
    <div>
      <SectionTag label="Answer" />
      <p className="text-[15px] leading-[1.8] text-text-primary/82">{answer}</p>
    </div>
  )
}

function SummaryContent({ text }: { text: string }) {
  return (
    <div>
      <p className="text-[15px] leading-[1.8] text-text-primary/82 whitespace-pre-wrap">{text}</p>
    </div>
  )
}

function ThreadContent({ blocks }: { blocks: { id: string; text: string }[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => (
        <div key={b.id} className="border border-white/8 rounded-lg p-4 flex gap-3">
          <span className="font-mono text-xs text-white/25 shrink-0">{i + 1}</span>
          <p className="text-sm text-text-primary leading-relaxed">{b.text}</p>
        </div>
      ))}
    </div>
  )
}

const APP_TITLES: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

export default function WorkspaceDraft({
  appType,
  draft,
  isGenerating,
  onRegenerate,
  onCopy,
}: WorkspaceDraftProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 shrink-0">
        <p className="font-mono text-xs uppercase tracking-widest text-white/35">
          {APP_TITLES[appType]}
        </p>
        {draft && (
          <div className="flex items-center gap-2">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
            <button
              onClick={onCopy}
              className="flex items-center gap-1.5 text-xs text-white/35 hover:text-white/60 transition-colors"
            >
              <Copy size={12} />
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 px-6 py-6">
        {isGenerating && (
          <div className="flex items-center gap-2 text-sm text-white/35">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-primary animate-pulse" />
            Generating…
          </div>
        )}

        {!isGenerating && !draft && (
          <p className="text-sm text-white/25">
            Configure your settings and click Build to generate content.
          </p>
        )}

        {!isGenerating && draft && (
          <>
            {draft.type === 'script' && <ScriptContent text={draft.text} />}
            {draft.type === 'exam' && <ExamContent questions={draft.questions} />}
            {draft.type === 'ask' && <AskContent answer={draft.answer} />}
            {draft.type === 'summary' && <SummaryContent text={draft.text} />}
            {draft.type === 'thread' && <ThreadContent blocks={draft.blocks} />}
          </>
        )}
      </div>
    </div>
  )
}
