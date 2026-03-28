import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGraph } from '../hooks/useGraph'
import { useKOS } from '../context/KOSContext'
import GraphCanvas from '../components/explore/GraphCanvas'
import NodeDetailPanel from '../components/explore/NodeDetailPanel'
import type { KOSNode } from '../types/kos'

export default function ExplorePage() {
  const { nodes, edges, isLoading, isError } = useGraph()
  const { setSelectedNodeId, setTalkContext, setMode } = useKOS()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const navigate = useNavigate()

  const selectedNode = nodes.find(n => n.id === selectedId) ?? null

  function handleSelect(id: string | null) {
    setSelectedId(id)
    setSelectedNodeId(id)
  }

  function handleTalk(node: KOSNode) {
    setTalkContext({ nodeId: node.id, nodeLabel: node.label, nodeInsight: node.insight })
    setMode('talk')
    navigate('/')
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40 animate-pulse">
          LOADING GRAPH...
        </p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
          ERROR — could not load graph
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selectedId={selectedId}
        onSelect={handleSelect}
      />
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => handleSelect(null)}
          onTalk={handleTalk}
        />
      )}
    </div>
  )
}
