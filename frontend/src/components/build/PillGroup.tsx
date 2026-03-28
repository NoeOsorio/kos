interface PillGroupProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function PillGroup({ options, value, onChange, label }: PillGroupProps) {
  return (
    <div>
      {label && (
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/35 mb-2">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            aria-pressed={opt === value}
            onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-mono tracking-wide border transition-colors ${
              opt === value
                ? 'border-purple-primary bg-purple-primary/20 text-purple-bright'
                : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white/60'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
