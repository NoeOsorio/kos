import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'

const BANDS = [
  { count: 16, baseR: 8 },
  { count: 16, baseR: 17 },
  { count: 12, baseR: 27 },
]

const PURPLE_COLORS: [number, number, number][] = [
  [139, 92, 246],
  [167, 139, 250],
  [196, 181, 253],
  [109, 40, 217],
]

interface Particle {
  angle: number
  speed: number
  breathePhase: number
  driftRate: number
  size: number
  alpha: number
  color: [number, number, number]
  bandR: number
}

function createParticles(scale: number): Particle[] {
  const particles: Particle[] = []
  for (const { count, baseR } of BANDS) {
    for (let i = 0; i < count; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.004 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        breathePhase: Math.random() * Math.PI * 2,
        driftRate: Math.random() * 0.003 + 0.001,
        size: Math.random() * 1.5 + 0.7,
        alpha: Math.random() * 0.5 + 0.35,
        color: PURPLE_COLORS[Math.floor(Math.random() * PURPLE_COLORS.length)],
        bandR: (baseR + Math.random() * 6) * scale,
      })
    }
  }
  return particles
}

export interface ParticleNebulaHandle {
  draw: (amplitude: number, particleSpeed: number, t: number) => void
}

interface ParticleNebulaCanvasProps {
  size: number
  onPointerDown?: React.PointerEventHandler<HTMLCanvasElement>
  onPointerUp?: React.PointerEventHandler<HTMLCanvasElement>
  onPointerCancel?: React.PointerEventHandler<HTMLCanvasElement>
}

const ParticleNebulaCanvas = forwardRef<ParticleNebulaHandle, ParticleNebulaCanvasProps>(
  function ParticleNebulaCanvas({ size, onPointerDown, onPointerUp, onPointerCancel }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scale = size / 480
    const particlesRef = useRef<Particle[]>(createParticles(scale))

    useImperativeHandle(ref, () => ({
      draw(amplitude: number, particleSpeed: number, t: number) {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        const dpr = window.devicePixelRatio || 1
        const cx = (size / 2) * dpr
        const cy = (size / 2) * dpr

        ctx.clearRect(0, 0, size * dpr, size * dpr)

        // Central glow
        const glowR = (30 + amplitude * 40) * scale * dpr
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
        grad.addColorStop(0, `rgba(139,92,246,${0.15 + amplitude * 0.25})`)
        grad.addColorStop(1, 'rgba(139,92,246,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, glowR, 0, Math.PI * 2)
        ctx.fillStyle = grad
        ctx.fill()

        // Particles
        for (const p of particlesRef.current) {
          p.angle += p.speed * particleSpeed * (1 + amplitude * 2)
          const breathe = Math.sin(t * p.driftRate * 60 + p.breathePhase)
          const r = p.bandR * (1 + breathe * 0.15)
          const x = (size / 2) + Math.cos(p.angle) * r
          const y = (size / 2) + Math.sin(p.angle) * r
          const alpha = Math.min(p.alpha * (0.7 + amplitude * 0.5), 1)

          ctx.beginPath()
          ctx.arc(x * dpr, y * dpr, p.size * scale * dpr, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${p.color[0]},${p.color[1]},${p.color[2]},${alpha})`
          ctx.fill()
        }
      },
    }), [size, scale])

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
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className="absolute inset-0"
        style={{ zIndex: 4, cursor: 'pointer', touchAction: 'none' }}
      />
    )
  }
)

export default ParticleNebulaCanvas
