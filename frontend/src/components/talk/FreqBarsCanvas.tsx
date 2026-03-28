import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const NUM_BARS = 64
const TIP_THRESHOLD = 0.4

export interface FreqBarsHandle {
  draw: (amplitude: number, freqBaseline: number) => void
}

interface FreqBarsCanvasProps {
  size: number
}

const FreqBarsCanvas = forwardRef<FreqBarsHandle, FreqBarsCanvasProps>(
  function FreqBarsCanvas({ size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const barsRef = useRef<number[]>(Array.from({ length: NUM_BARS }, () => Math.random() * 0.1))

    const scale = size / 480
    const INNER_R = 80 * scale
    const MAX_BAR_H = 48 * scale

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, freqBaseline: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        for (let i = 0; i < NUM_BARS; i++) {
          const target = Math.min(freqBaseline + amplitude * (0.3 + Math.random() * 0.4), 1)
          barsRef.current[i] += (target - barsRef.current[i]) * 0.12
          const v = barsRef.current[i]
          const angle = (i / NUM_BARS) * Math.PI * 2 - Math.PI / 2
          const barH = v * MAX_BAR_H * dpr
          const innerR = INNER_R * dpr

          const x1 = cx + Math.cos(angle) * innerR
          const y1 = cy + Math.sin(angle) * innerR
          const x2 = cx + Math.cos(angle) * (innerR + barH)
          const y2 = cy + Math.sin(angle) * (innerR + barH)

          const r = Math.round(109 + v * 123)
          const g = Math.round(40 + v * 141)
          const b = Math.round(217 + v * 38)
          ctx.strokeStyle = `rgb(${r},${g},${b})`
          ctx.lineWidth = 2 * dpr
          ctx.beginPath()
          ctx.moveTo(x1, y1)
          ctx.lineTo(x2, y2)
          ctx.stroke()

          if (v > TIP_THRESHOLD) {
            ctx.beginPath()
            ctx.arc(x2, y2, 1.5 * dpr, 0, Math.PI * 2)
            ctx.fillStyle = `rgb(${r},${g},${b})`
            ctx.fill()
          }
        }
      },
    }), [size, INNER_R, MAX_BAR_H])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const dpr = window.devicePixelRatio || 1
      canvas.width = size * dpr
      canvas.height = size * dpr
      canvas.style.width = `${size}px`
      canvas.style.height = `${size}px`
    }, [size])

    return (
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 3 }}
      />
    )
  }
)

export default FreqBarsCanvas
