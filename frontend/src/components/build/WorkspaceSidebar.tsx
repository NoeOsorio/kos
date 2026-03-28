import { Link } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PillGroup from './PillGroup'
import KnowledgeSources from './KnowledgeSources'
import type { AppType } from '../../types/kos'

const APP_TITLES: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

interface WorkspaceSidebarProps {
  appType: AppType
  topic: string
  onTopicChange: (v: string) => void
  format: string  // maps to: script→Format, exam→Difficulty, summary→Depth, thread→Platform
  onFormatChange: (v: string) => void
  length: string  // maps to: script→Length, exam→Questions, summary→Audience, thread→Tone
  onLengthChange: (v: string) => void
  question: string
  onQuestionChange: (v: string) => void
  sourceIds: string[]
  onSourceToggle: (id: string) => void
  onBuild: () => void
  isGenerating: boolean
}

export default function WorkspaceSidebar({
  appType,
  topic,
  onTopicChange,
  format,
  onFormatChange,
  length,
  onLengthChange,
  question,
  onQuestionChange,
  sourceIds,
  onSourceToggle,
  onBuild,
  isGenerating,
}: WorkspaceSidebarProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto p-5 gap-5">
      {/* Back */}
      <Link
        to="/build"
        className="flex items-center gap-1 text-xs font-mono text-white/35 hover:text-white/60 transition-colors w-fit"
      >
        <ChevronLeft size={13} />
        BUILD
      </Link>

      {/* Title */}
      <p className="font-mono text-xs uppercase tracking-widest text-purple-soft">
        {APP_TITLES[appType]}
      </p>

      {/* Topic */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">Topic</p>
        <textarea
          value={topic}
          onChange={e => onTopicChange(e.target.value)}
          placeholder="What is the topic?"
          rows={3}
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-text-primary placeholder:text-white/25 resize-none outline-none focus:border-purple-primary/50 leading-relaxed"
        />
      </div>

      {/* Per-app fields */}
      {appType === 'script' && (
        <>
          <PillGroup
            label="Format"
            options={['Personal', 'Educational', 'Opinion', 'Story']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Length"
            options={['1 min', '3 min', '7 min', '10+ min']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'exam' && (
        <>
          <PillGroup
            label="Difficulty"
            options={['Easy', 'Medium', 'Hard']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Questions"
            options={['5', '10', '20']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'ask' && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">Question</p>
          <input
            value={question}
            onChange={e => onQuestionChange(e.target.value)}
            placeholder="What do you want to know?"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-text-primary placeholder:text-white/25 outline-none focus:border-purple-primary/50"
          />
        </div>
      )}

      {appType === 'summary' && (
        <>
          <PillGroup
            label="Depth"
            options={['Overview', 'Deep dive']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Audience"
            options={['Personal', 'Shareable']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {appType === 'thread' && (
        <>
          <PillGroup
            label="Platform"
            options={['Twitter/X', 'LinkedIn']}
            value={format}
            onChange={onFormatChange}
          />
          <PillGroup
            label="Tone"
            options={['Educational', 'Personal', 'Provocative']}
            value={length}
            onChange={onLengthChange}
          />
        </>
      )}

      {/* Knowledge sources */}
      <KnowledgeSources sourceIds={sourceIds} onToggle={onSourceToggle} />

      {/* Build button */}
      <div className="mt-auto pt-3">
        <button
          onClick={onBuild}
          disabled={isGenerating}
          className="w-full py-2.5 rounded-lg bg-purple-primary hover:bg-purple-bright disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono text-xs uppercase tracking-widest text-white"
        >
          {isGenerating ? 'Generating…' : 'Build →'}
        </button>
      </div>
    </div>
  )
}
