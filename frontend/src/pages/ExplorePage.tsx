import { useState, useMemo } from 'react'
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
  const [activeArea, setActiveArea] = useState<string | null>(null)
  const navigate = useNavigate()

  const areas = useMemo(() => {
    const set = new Set(nodes.map(n => n.area ?? 'general'))
    return Array.from(set).sort()
  }, [nodes])

  const filteredNodes = useMemo(
    () => activeArea ? nodes.filter(n => (n.area ?? 'general') === activeArea) : nodes,
    [nodes, activeArea]
  )

  const visibleIds = useMemo(() => new Set(filteredNodes.map(n => n.id)), [filteredNodes])
  const filteredEdges = useMemo(
    () => edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [edges, visibleIds]
  )

  const selectedNode = filteredNodes.find(n => n.id === selectedId) ?? null

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
      {areas.length > 1 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 flex-wrap justify-center px-4">
          <button
            onClick={() => setActiveArea(null)}
            className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded border transition-colors"
            style={{
              background: !activeArea ? 'rgba(139,92,246,0.3)' : 'rgba(8,8,20,0.7)',
              borderColor: !activeArea ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
              color: !activeArea ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.45)',
            }}
          >
            All
          </button>
          {areas.map(area => (
            <button
              key={area}
              onClick={() => setActiveArea(area === activeArea ? null : area)}
              className="font-mono text-[10px] tracking-widest uppercase px-3 py-1 rounded border transition-colors"
              style={{
                background: activeArea === area ? 'rgba(139,92,246,0.3)' : 'rgba(8,8,20,0.7)',
                borderColor: activeArea === area ? 'rgba(139,92,246,0.7)' : 'rgba(139,92,246,0.2)',
                color: activeArea === area ? 'rgba(196,181,253,1)' : 'rgba(196,181,253,0.45)',
              }}
            >
              {area}
            </button>
          ))}
        </div>
      )}

      <GraphCanvas
        nodes={filteredNodes}
        edges={filteredEdges}
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
