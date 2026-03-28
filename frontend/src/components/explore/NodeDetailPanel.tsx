import { X, MessageCircle } from 'lucide-react'
import type { KOSNode } from '../../types/kos'
import { CLUSTERS } from '../../utils/graph-layout'

interface Props {
  node: KOSNode
  onClose: () => void
  onTalk: (node: KOSNode) => void
}

export default function NodeDetailPanel({ node, onClose, onTalk }: Props) {
  const cluster = CLUSTERS[node.cluster] ?? CLUSTERS[0]
  const [r, g, b] = cluster.color
  const count = node.connections.length

  return (
    <div className="absolute right-0 top-0 h-full w-80 bg-bg-card border-l border-purple-primary/20 flex flex-col p-6 z-10">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-purple-soft opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Close panel"
      >
        <X size={16} />
      </button>

      <span
        className="font-mono text-xs tracking-widest uppercase mb-4 self-start"
        style={{ color: `rgb(${r},${g},${b})` }}
      >
        {cluster.name}
      </span>

      <h2 className="font-mono text-lg text-text-primary font-bold mb-2 pr-6">
        {node.label}
      </h2>

      <p className="font-mono text-xs text-purple-soft opacity-50 mb-4">{node.date}</p>

      <p className="text-sm text-text-primary/80 leading-relaxed flex-1 mb-6">
        {node.insight}
      </p>

      <p className="font-mono text-xs text-purple-soft opacity-60 mb-4">
        {count} {count === 1 ? 'connection' : 'connections'}
      </p>

      <button
        onClick={() => onTalk(node)}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-primary/20 border border-purple-primary/40 rounded text-purple-bright font-mono text-xs tracking-widest uppercase hover:bg-purple-primary/30 transition-colors"
        aria-label="Discuss in Talk"
      >
        <MessageCircle size={14} />
        Discuss in Talk
      </button>
    </div>
  )
}
