import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface KnowledgeSourcesProps {
  sourceIds: string[]
  onToggle: (id: string) => void  // TODO: called when a source chip is toggled once source items are rendered
}

export default function KnowledgeSources({ sourceIds, onToggle }: KnowledgeSourcesProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35">
          Knowledge Sources
          {sourceIds.length > 0 && (
            <span className="ml-1.5 text-purple-soft">{sourceIds.length}</span>
          )}
        </p>
      </div>

      {sourceIds.length === 0 && !addOpen && (
        <p className="text-xs text-white/25 mb-2">No sources added</p>
      )}

      {addOpen && (
        <div className="flex gap-1.5 mb-2">
          <input
            autoFocus
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Paste URL or search…"
            className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-text-primary placeholder:text-white/25 outline-none focus:border-purple-primary/50"
          />
          <button
            onClick={() => { setAddOpen(false); setInputValue('') }}
            className="text-white/35 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {!addOpen && (
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1 text-xs text-white/35 hover:text-purple-soft transition-colors"
        >
          <Plus size={12} />
          Add source
        </button>
      )}
    </div>
  )
}
