import { layoutNodes, CLUSTERS, LOGICAL_W, LOGICAL_H } from '../utils/graph-layout'
import type { RawNode } from '../types/kos'

const raw = (overrides: Partial<RawNode> = {}): RawNode => ({
  id: 'n1', label: 'Test', cluster: 0,
  connections: [], insight: 'insight', date: '2024-01-01',
  ...overrides,
})

describe('layoutNodes', () => {
  it('returns one node per input', () => {
    expect(layoutNodes([raw(), raw({ id: 'n2' })])).toHaveLength(2)
  })

  it('places node within its cluster x-range', () => {
    const result = layoutNodes([raw({ id: 'abc', cluster: 0 })])
    const { cx, spread } = CLUSTERS[0]
    expect(result[0].x).toBeGreaterThanOrEqual(cx - spread)
    expect(result[0].x).toBeLessThanOrEqual(cx + spread)
  })

  it('places node within its cluster y-range', () => {
    const result = layoutNodes([raw({ id: 'abc', cluster: 1 })])
    const { cy, spread } = CLUSTERS[1]
    expect(result[0].y).toBeGreaterThanOrEqual(cy - spread)
    expect(result[0].y).toBeLessThanOrEqual(cy + spread)
  })

  it('radius grows with connection count', () => {
    const lone = layoutNodes([raw({ id: 'a', connections: [] })])[0]
    const conn = layoutNodes([raw({ id: 'b', connections: ['x', 'y', 'z'] })])[0]
    expect(conn.r).toBeGreaterThan(lone.r)
  })

  it('is deterministic — same id produces same position', () => {
    const a = layoutNodes([raw({ id: 'myid' })])[0]
    const b = layoutNodes([raw({ id: 'myid' })])[0]
    expect(a.x).toBe(b.x)
    expect(a.y).toBe(b.y)
    expect(a.floatPhase).toBe(b.floatPhase)
  })

  it('falls back to cluster 0 for unknown cluster index', () => {
    const result = layoutNodes([raw({ id: 'x', cluster: 99 })])
    const { cx, spread } = CLUSTERS[0]
    expect(result[0].x).toBeGreaterThanOrEqual(cx - spread)
    expect(result[0].x).toBeLessThanOrEqual(cx + spread)
  })

  it('exports LOGICAL_W and LOGICAL_H as positive numbers', () => {
    expect(LOGICAL_W).toBeGreaterThan(0)
    expect(LOGICAL_H).toBeGreaterThan(0)
  })
})
