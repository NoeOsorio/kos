import { useRef, useEffect } from 'react'
import type { KOSNode, GraphEdge } from '../../types/kos'
import { CLUSTERS, LOGICAL_W, LOGICAL_H } from '../../utils/graph-layout'

interface Props {
  nodes: KOSNode[]
  edges: GraphEdge[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

interface Transform { x: number; y: number; scale: number }
interface DragState  { active: boolean; moved: boolean; mx: number; my: number; tx: number; ty: number }

export default function GraphCanvas({ nodes, edges, selectedId, onSelect }: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const rafRef       = useRef<number>(0)
  const t0Ref        = useRef<number>(performance.now())
  const dragRef      = useRef<DragState>({ active: false, moved: false, mx: 0, my: 0, tx: 0, ty: 0 })
  const hoveredRef   = useRef<string | null>(null)
  const initialized  = useRef(false)

  // Keep latest props accessible from RAF loop without stale closure
  const nodesRef    = useRef(nodes)
  const edgesRef    = useRef(edges)
  const selectedRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  nodesRef.current    = nodes
  edgesRef.current    = edges
  selectedRef.current = selectedId
  onSelectRef.current = onSelect

  function fy(node: KOSNode, t: number) {
    return Math.sin(t * 0.001 + node.floatPhase) * 3
  }

  function hitTest(mx: number, my: number, t: number): string | null {
    const { x: tx, y: ty, scale } = transformRef.current
    for (const n of nodesRef.current) {
      const sx = n.x * scale + tx
      const sy = (n.y + fy(n, t)) * scale + ty
      if (Math.hypot(mx - sx, my - sy) <= n.r * scale + 6) return n.id
    }
    return null
  }

  // RAF drawing loop — runs for lifetime of component
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function loop() {
      const t   = performance.now() - t0Ref.current
      const ctx = canvas!.getContext('2d')
      if (!ctx) { rafRef.current = requestAnimationFrame(loop); return }

      const dpr = window.devicePixelRatio || 1
      const cw  = canvas!.clientWidth
      const ch  = canvas!.clientHeight
      if (canvas!.width !== cw * dpr || canvas!.height !== ch * dpr) {
        canvas!.width  = cw * dpr
        canvas!.height = ch * dpr
      }
      if (!initialized.current && cw > 0) {
        transformRef.current.x = (cw - LOGICAL_W) / 2
        transformRef.current.y = (ch - LOGICAL_H) / 2
        initialized.current = true
      }

      const { x: tx, y: ty, scale } = transformRef.current
      const ns    = nodesRef.current
      const es    = edgesRef.current
      const selId = selectedRef.current
      const hovId = hoveredRef.current

      ctx.clearRect(0, 0, canvas!.width, canvas!.height)
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.translate(tx, ty)
      ctx.scale(scale, scale)

      // Edges
      for (const edge of es) {
        const src = ns.find(n => n.id === edge.source)
        const tgt = ns.find(n => n.id === edge.target)
        if (!src || !tgt) continue
        const active = selId === src.id || selId === tgt.id || hovId === src.id || hovId === tgt.id
        ctx.beginPath()
        ctx.moveTo(src.x, src.y + fy(src, t))
        ctx.lineTo(tgt.x, tgt.y + fy(tgt, t))
        ctx.strokeStyle = active ? 'rgba(167,139,250,0.35)' : 'rgba(139,92,246,0.12)'
        ctx.lineWidth   = active ? 1.5 : 0.8
        ctx.stroke()
      }

      // Nodes
      for (const n of ns) {
        const ny   = n.y + fy(n, t)
        const isSel = selId === n.id
        const isHov = hovId === n.id
        const [r, g, b] = (CLUSTERS[n.cluster] ?? CLUSTERS[0]).color

        // Glow
        const glowR = n.r * (isSel ? 3.5 : isHov ? 2.5 : 2)
        const grad  = ctx.createRadialGradient(n.x, ny, 0, n.x, ny, glowR)
        grad.addColorStop(0, `rgba(${r},${g},${b},${isSel ? 0.55 : isHov ? 0.35 : 0.18})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        ctx.beginPath()
        ctx.arc(n.x, ny, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Core
        ctx.beginPath()
        ctx.arc(n.x, ny, n.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${r},${g},${b},${isSel ? 1 : isHov ? 0.85 : 0.65})`
        ctx.fill()

        // Label
        ctx.font      = `${isSel ? 'bold' : 'normal'} 11px "Fira Code", monospace`
        ctx.fillStyle = isSel ? '#f0eeff' : 'rgba(196,181,253,0.75)'
        ctx.textAlign = 'center'
        ctx.fillText(n.label, n.x, ny + n.r + 14)
      }

      ctx.restore()
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Mouse / wheel interaction
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onMouseDown = (e: MouseEvent) => {
      const tr = transformRef.current
      dragRef.current = { active: true, moved: false, mx: e.clientX, my: e.clientY, tx: tr.x, ty: tr.y }
    }

    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current
      if (d.active) {
        const dx = e.clientX - d.mx
        const dy = e.clientY - d.my
        if (Math.hypot(dx, dy) > 3) d.moved = true
        transformRef.current.x = d.tx + dx
        transformRef.current.y = d.ty + dy
      } else {
        const t = performance.now() - t0Ref.current
        hoveredRef.current  = hitTest(e.clientX, e.clientY, t)
        canvas.style.cursor = hoveredRef.current ? 'pointer' : 'grab'
      }
    }

    const onMouseUp = (e: MouseEvent) => {
      const d = dragRef.current
      if (!d.moved) {
        const t = performance.now() - t0Ref.current
        onSelectRef.current(hitTest(e.clientX, e.clientY, t))
      }
      dragRef.current.active = false
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor   = e.deltaY < 0 ? 1.1 : 0.9
      const tr       = transformRef.current
      const newScale = Math.max(0.3, Math.min(4, tr.scale * factor))
      const sf       = newScale / tr.scale
      transformRef.current = {
        x:     e.clientX - (e.clientX - tr.x) * sf,
        y:     e.clientY - (e.clientY - tr.y) * sf,
        scale: newScale,
      }
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup',   onMouseUp)
    canvas.addEventListener('wheel',     onWheel, { passive: false })

    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup',   onMouseUp)
      canvas.removeEventListener('wheel',     onWheel)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full cursor-grab"
      aria-label="Knowledge graph"
    />
  )
}
