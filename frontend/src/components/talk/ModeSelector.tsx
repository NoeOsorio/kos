export type TalkMode = 'socratic' | 'brain' | 'metaphor'

const MODES: { value: TalkMode; label: string; description: string }[] = [
  { value: 'socratic', label: 'SOCRATIC', description: 'Guided questions' },
  { value: 'brain',    label: 'BRAIN',    description: 'Answer from your knowledge' },
  { value: 'metaphor', label: 'METAPHOR', description: 'Cross-domain connections' },
]

interface ModeSelectorProps {
  mode: TalkMode
  onChange: (mode: TalkMode) => void
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex gap-1 justify-center">
      {MODES.map(m => {
        const active = m.value === mode
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            title={m.description}
            style={{
              fontFamily: 'monospace',
              fontSize: '9px',
              letterSpacing: '2px',
              padding: '4px 10px',
              borderRadius: '4px',
              border: active
                ? '1px solid rgba(139,92,246,0.8)'
                : '1px solid rgba(139,92,246,0.2)',
              background: active
                ? 'rgba(139,92,246,0.15)'
                : 'transparent',
              color: active
                ? 'rgba(196,181,253,0.9)'
                : 'rgba(196,181,253,0.35)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
