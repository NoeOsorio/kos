import type { KOSNode, KOSCluster, BuildSession } from '../types/kos'

describe('kos types', () => {
  it('KOSNode is structurally correct', () => {
    const node: KOSNode = {
      id: 'n1', label: 'Test', cluster: 0, connections: [],
      insight: 'An insight', date: 'Mar 25, 2026',
      x: 0, y: 0, r: 6, floatPhase: 0,
    }
    expect(node.id).toBe('n1')
  })

  it('KOSCluster is structurally correct', () => {
    const cluster: KOSCluster = {
      name: 'Learning', color: [139, 92, 246], cx: 0, cy: 0, spread: 100,
    }
    expect(cluster.name).toBe('Learning')
  })

  it('BuildSession is structurally correct', () => {
    const session: BuildSession = {
      id: 's1', appType: 'script', topic: 'AI', format: 'Educational',
      sourceIds: [], externalSources: [],
      draft: { type: 'script', text: '' },
      updatedAt: new Date().toISOString(),
    }
    expect(session.appType).toBe('script')
  })
})
