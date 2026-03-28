import type { LucideProps } from 'lucide-react'

interface AppCardProps {
  Icon: React.FC<LucideProps>
  name: string
  description: string
  tag: string
  onClick: () => void
  disabled?: boolean
}

export default function AppCard({ Icon, name, description, tag, onClick, disabled }: AppCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`group relative w-full text-left p-4 rounded-lg border transition-all duration-150 ${
        disabled
          ? 'border-white/5 bg-bg-card opacity-40 cursor-not-allowed'
          : 'border-white/8 bg-bg-card hover:-translate-y-px hover:border-white/20 cursor-pointer'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-purple-soft opacity-60">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-text-primary mb-1">{name}</p>
          {description && (
            <p className="text-xs text-white/35 leading-relaxed">{description}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest uppercase text-purple-soft/50 border border-purple-soft/20 px-1.5 py-0.5 rounded">
          {tag}
        </span>
        {disabled && (
          <span className="font-mono text-[9px] uppercase tracking-widest text-white/20">
            coming soon
          </span>
        )}
      </div>
    </button>
  )
}
