import { useNavigate } from 'react-router-dom'
import { Film, ClipboardList, Brain, FileText, AlignLeft, Plus } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import AppCard from '../components/build/AppCard'
import { useBuildSessions } from '../hooks/useBuildSessions'
import type { AppType } from '../types/kos'

interface AppDef {
  appType: AppType | null
  Icon: React.FC<LucideProps>
  name: string
  description: string
  tag: string
  disabled?: boolean
}

const APPS: AppDef[] = [
  {
    appType: 'script',
    Icon: Film,
    name: 'Video Script',
    description: 'Turn your ideas into a structured video script.',
    tag: 'SCRIPT',
  },
  {
    appType: 'exam',
    Icon: ClipboardList,
    name: 'Self Exam',
    description: 'Test yourself on what you know.',
    tag: 'SPACED REP',
  },
  {
    appType: 'ask',
    Icon: Brain,
    name: 'Ask Your Brain',
    description: 'Query your knowledge base directly.',
    tag: 'RAG',
  },
  {
    appType: 'summary',
    Icon: FileText,
    name: 'Topic Summary',
    description: 'Synthesize a topic from your graph.',
    tag: 'SYNTHESIS',
  },
  {
    appType: 'thread',
    Icon: AlignLeft,
    name: 'Thread / Post',
    description: 'Create a social post from your knowledge.',
    tag: 'SOCIAL',
  },
  {
    appType: null,
    Icon: Plus,
    name: 'More Apps',
    description: '',
    tag: 'SOON',
    disabled: true,
  },
]

const APP_TYPE_LABELS: Record<AppType, string> = {
  script: 'Video Script',
  exam: 'Self Exam',
  ask: 'Ask Your Brain',
  summary: 'Topic Summary',
  thread: 'Thread / Post',
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diffMs / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  return `${days} days ago`
}

export default function BuildPage() {
  const navigate = useNavigate()
  const { sessions } = useBuildSessions()
  const recent = sessions.slice(0, 5)

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Heading */}
        <h1 className="text-xl font-mono text-text-primary mb-1">
          What do you want to build?
        </h1>
        <p className="text-sm text-white/35 mb-8">
          Use your knowledge graph to create something real.
        </p>

        {/* App grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
          {APPS.map(app => (
            <AppCard
              key={app.tag}
              Icon={app.Icon}
              name={app.name}
              description={app.description}
              tag={app.tag}
              disabled={app.disabled}
              onClick={() => app.appType && navigate(`/build/${app.appType}`)}
            />
          ))}
        </div>

        {/* Recent sessions */}
        <div>
          {recent.length === 0 ? (
            <p className="text-xs text-white/25">No recent sessions</p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
                  Recent
                </p>
                <div className="flex-1 h-px bg-white/6" />
              </div>
              <ul className="space-y-1">
                {recent.map(s => (
                  <li key={s.id}>
                    <button
                      onClick={() => navigate(`/build/${s.appType}?session=${s.id}`)}
                      className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/4 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{s.topic || '(untitled)'}</p>
                        <p className="text-xs text-white/35 font-mono">
                          {APP_TYPE_LABELS[s.appType]} · {timeAgo(s.updatedAt)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
