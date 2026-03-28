import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const WAVE_COUNT = 5
const WAVE_COLORS = [
  'rgba(139,92,246,',
  'rgba(167,139,250,',
  'rgba(109,40,217,',
  'rgba(196,181,253,',
  'rgba(124,58,237,',
]

export interface WaveCanvasHandle {
  draw: (amplitude: number, waveAmp: number, t: number) => void
}

interface WaveCanvasProps {
  size: number
}

const WaveCanvas = forwardRef<WaveCanvasHandle, WaveCanvasProps>(
  function WaveCanvas({ size }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scale = size / 480
    const BASE_RADIUS = 122 * scale

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, waveAmp: number, t: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr
        const steps = 180

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        for (let wi = 0; wi < WAVE_COUNT; wi++) {
          const phaseOffset = (wi / WAVE_COUNT) * Math.PI * 2
          const amp = BASE_RADIUS * waveAmp * (0.06 + amplitude * 0.14) * dpr
          const freq = 3 + wi * 0.7

          ctx.beginPath()
          for (let step = 0; step <= steps; step++) {
            const theta = (step / steps) * Math.PI * 2
            const wave = amp * Math.sin(freq * theta + t * 1.5 + phaseOffset)
            const r = BASE_RADIUS * dpr + wave
            const x = cx + Math.cos(theta) * r
            const y = cy + Math.sin(theta) * r
            if (step === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = `${WAVE_COLORS[wi]}${0.25 + amplitude * 0.35})`
          ctx.lineWidth = 1.5 * dpr
          ctx.stroke()
        }
      },
    }), [size, scale, BASE_RADIUS])

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
        style={{ zIndex: 1 }}
      />
    )
  }
)

export default WaveCanvas
