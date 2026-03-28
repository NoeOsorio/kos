import type { KOSNode, KOSCluster, RawNode } from '../types/kos'

export const LOGICAL_W = 1400
export const LOGICAL_H = 900

export const CLUSTERS: KOSCluster[] = [
  { name: 'Productivity', color: [139, 92,  246], cx: 350,  cy: 350, spread: 220 },
  { name: 'Philosophy',   color: [96,  165, 250], cx: 1050, cy: 350, spread: 220 },
  { name: 'Systems',      color: [52,  211, 153], cx: 700,  cy: 680, spread: 220 },
]

/** Deterministic pseudo-random in [0, 1) based on a string seed. */
function hash(seed: string): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0
  }
  return (h >>> 0) / 0x100000000
}

export function layoutNodes(
  raw: RawNode[],
  clusters: KOSCluster[] = CLUSTERS,
): KOSNode[] {
  return raw.map(n => {
    const cluster = clusters[n.cluster] ?? clusters[0]
    const angle = hash(n.id + '_angle') * Math.PI * 2
    const dist  = hash(n.id + '_dist')  * 0.4 + 0.6   // [0.6, 1.0]
    return {
      ...n,
      x:          cluster.cx + Math.cos(angle) * cluster.spread * dist,
      y:          cluster.cy + Math.sin(angle) * cluster.spread * dist,
      r:          8 + n.connections.length * 2,
      floatPhase: hash(n.id + '_phase') * Math.PI * 2,
    }
  })
}
