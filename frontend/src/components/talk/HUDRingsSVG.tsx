interface HUDRingsSVGProps {
  ringSpeed: number
  size: number
}

const BASE_RINGS = [
  { r: 72, baseDuration: 5, cw: false, dash: '4 6.3', glow: 4 },
  { r: 100, baseDuration: 10, cw: true, dash: '6 4', glow: 2.5 },
  { r: 130, baseDuration: 20, cw: false, dash: '2 8.2', glow: 1.5 },
  { r: 158, baseDuration: 30, cw: true, dash: '3 14.5', glow: 1.5 },
]

export default function HUDRingsSVG({ ringSpeed, size }: HUDRingsSVGProps) {
  const scale = size / 480
  const cx = size / 2
  const cy = size / 2

  return (
    <svg
      width={size}
      height={size}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 2 }}
    >
      <defs>
        {BASE_RINGS.map((ring, i) => (
          <filter
            key={`glow-${i}`}
            id={`ring-glow-${i}`}
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation={ring.glow} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {BASE_RINGS.map((ring, i) => {
        const r = ring.r * scale
        const duration = ring.baseDuration / ringSpeed
        const animName = ring.cw ? 'spin-cw' : 'spin-ccw'
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="rgba(139,92,246,0.35)"
            strokeWidth="1"
            strokeDasharray={ring.dash}
            filter={`url(#ring-glow-${i})`}
            style={{
              transformOrigin: `${cx}px ${cy}px`,
              animation: `${animName} ${duration}s linear infinite`,
            }}
          />
        )
      })}

      <style>{`
        @keyframes spin-cw  { from { transform: rotate(0deg); }   to { transform: rotate(360deg);  } }
        @keyframes spin-ccw { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
      `}</style>
    </svg>
  )
}
