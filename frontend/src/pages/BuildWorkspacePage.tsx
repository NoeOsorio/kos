import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceSidebar from '../components/build/WorkspaceSidebar'
import WorkspaceDraft from '../components/build/WorkspaceDraft'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { AppType, AppDraft } from '../types/kos'

const DEFAULT_FORMAT: Record<AppType, string> = {
  script: 'Personal',
  exam: 'Medium',
  ask: '',
  summary: 'Overview',
  thread: 'Twitter/X',
}

const DEFAULT_LENGTH: Record<AppType, string> = {
  script: '3 min',
  exam: '10',
  ask: '',
  summary: 'Personal',
  thread: 'Educational',
}

function makeMockDraft(appType: AppType, topic: string): AppDraft {
  const t = topic || 'this topic'
  switch (appType) {
    case 'script':
      return {
        type: 'script',
        text: `## Hook\nHere's what most people get wrong about ${t}...\n\n## Problem\nThe conventional approach fails because it ignores something fundamental...\n\n## Personal\nWhen I first encountered ${t}, I made every mistake possible...\n\n## Mechanism\nThe key insight is that ${t} works by...\n\n## CTA\nStart tomorrow by doing one small thing related to ${t}.`,
      }
    case 'exam':
      return {
        type: 'exam',
        questions: [
          { id: 'q1', text: `What is the core principle behind ${t}?`, answer: `The core principle is that ${t} fundamentally changes how we approach problems by focusing on outcomes rather than effort.`, collapsed: true },
          { id: 'q2', text: `How does ${t} connect to things you already know?`, answer: `${t} connects to related concepts through the shared idea of systems thinking and feedback loops.`, collapsed: true },
          { id: 'q3', text: `What is a common misconception about ${t}?`, answer: `Many people believe ${t} is about doing more, but in reality it is about doing the right things with focused attention.`, collapsed: true },
        ],
      }
    case 'ask':
      return {
        type: 'ask',
        answer: `Based on your knowledge graph, here is a synthesis of what you know about ${t}. Your notes cover three main angles: the foundational concepts, the practical applications, and the open questions. The strongest thread connecting your insights is the role of deliberate practice and feedback.`,
      }
    case 'summary':
      return {
        type: 'summary',
        text: `${t} is a concept that appears across several clusters in your knowledge graph.\n\nKey Insights:\n- First insight pulled from your notes on focused work\n- Second insight connecting two areas of your graph\n- Third insight from your recent reading on systems\n\nConnections:\n- Links to Productivity via the concept of deep work\n- Links to Systems thinking through feedback loops\n\nGaps:\n- You have not yet explored the relationship between ${t} and habit formation`,
      }
    case 'thread':
      return {
        type: 'thread',
        blocks: [
          { id: 'b1', text: `Thread: What I know about ${t} after months of study` },
          { id: 'b2', text: `1/ Most people think about ${t} completely wrong. Here is the reframe that changed everything for me:` },
          { id: 'b3', text: `2/ The key insight is that ${t} is not about quantity — it is about quality of attention. This distinction matters because...` },
          { id: 'b4', text: `3/ In practice, this means protecting your most productive hours. Here is a concrete example from my own experience:` },
          { id: 'b5', text: `4/ The biggest mistake people make is skipping the fundamentals. Start here if you want to understand ${t}:` },
        ],
      }
  }
}

export default function BuildWorkspacePage() {
  const { appType } = useParams<{ appType: string }>() as { appType: AppType }
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const { upsertSession, getSession } = useBuildSessions()

  const [topic, setTopic] = useState('')
  const [format, setFormat] = useState(DEFAULT_FORMAT[appType] ?? '')
  const [length, setLength] = useState(DEFAULT_LENGTH[appType] ?? '')
  const [question, setQuestion] = useState('')
  const [sourceIds, setSourceIds] = useState<string[]>([])
  const [draft, setDraft] = useState<AppDraft | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Restore session from localStorage if ?session= param present
  useEffect(() => {
    if (!sessionId) return
    const session = getSession(sessionId)
    if (!session) return
    setTopic(session.topic)
    setFormat(session.format)
    setLength(session.length ?? '')
    setSourceIds(session.sourceIds)
    setDraft(session.draft)
  }, [sessionId, getSession])

  function toggleSource(id: string) {
    setSourceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleBuild() {
    setIsGenerating(true)
    setTimeout(() => {
      const newDraft = makeMockDraft(appType, topic)
      setDraft(newDraft)
      setIsGenerating(false)
      setSidebarOpen(false)

      const id = sessionId ?? `${appType}-${Date.now()}`
      upsertSession({
        id,
        appType,
        topic,
        format,
        length,
        sourceIds,
        externalSources: [],
        draft: newDraft,
        updatedAt: new Date().toISOString(),
      })
    }, 1200)
  }

  const sidebarProps = {
    appType,
    topic,
    onTopicChange: setTopic,
    format,
    onFormatChange: setFormat,
    length,
    onLengthChange: setLength,
    question,
    onQuestionChange: setQuestion,
    sourceIds,
    onSourceToggle: toggleSource,
    onBuild: handleBuild,
    isGenerating,
  }

  function handleCopy() {
    if (!draft) return
    let text = ''
    if (draft.type === 'script') text = draft.text
    else if (draft.type === 'exam') text = draft.questions.map((q, i) => `${i + 1}. ${q.text}\nA: ${q.answer}`).join('\n\n')
    else if (draft.type === 'ask') text = draft.answer
    else if (draft.type === 'summary') text = draft.text
    else if (draft.type === 'thread') text = draft.blocks.map((b, i) => `${i + 1}/ ${b.text}`).join('\n\n')
    navigator.clipboard.writeText(text).catch(() => {})
  }

  return (
    <div className="h-full flex flex-col">
      {/* Mobile: Configure toggle button */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <span className="font-mono text-xs uppercase tracking-widest text-white/35">
          {appType.toUpperCase()}
        </span>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <Settings size={13} />
          Configure
        </button>
      </div>

      {/* Mobile: collapsible sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="mobile-sidebar"
            className="md:hidden border-b border-white/6 shrink-0 overflow-hidden"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <WorkspaceSidebar {...sidebarProps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop: two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-[280px] shrink-0 border-r border-white/6 overflow-y-auto">
          <WorkspaceSidebar {...sidebarProps} />
        </aside>

        {/* Draft area */}
        <main className="flex-1 overflow-y-auto">
          <WorkspaceDraft
            appType={appType}
            draft={draft}
            isGenerating={isGenerating}
            onRegenerate={handleBuild}
            onCopy={handleCopy}
          />
        </main>
      </div>
    </div>
  )
}
