import { useQuery } from '@tanstack/react-query'
import { layoutNodes, CLUSTERS } from '../utils/graph-layout'
import type { KOSNode, GraphEdge, RawNode } from '../types/kos'

interface GraphResponse {
  nodes: RawNode[]
  edges: GraphEdge[]
}

export function useGraph() {
  const query = useQuery<GraphResponse>({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph')
      if (!res.ok) throw new Error('Failed to fetch graph')
      return res.json() as Promise<GraphResponse>
    },
  })

  const nodes: KOSNode[] = query.data ? layoutNodes(query.data.nodes, CLUSTERS) : []
  const edges: GraphEdge[] = query.data?.edges ?? []

  return {
    nodes,
    edges,
    isLoading: query.isLoading,
    isError:   query.isError,
    isSuccess: query.isSuccess,
  }
}
