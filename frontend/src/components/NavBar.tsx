import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mic, GitBranch, Layers } from 'lucide-react'
import { useKOS, type Mode } from '../context/KOSContext'

const ROUTE_MAP: Record<Mode, string> = {
  talk:    '/',
  explore: '/explore',
  build:   '/build',
}

const TABS: { mode: Mode; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { mode: 'talk',    label: 'TALK',    Icon: Mic },
  { mode: 'explore', label: 'EXPLORE', Icon: GitBranch },
  { mode: 'build',   label: 'BUILD',   Icon: Layers },
]

export default function NavBar() {
  const navigate = useNavigate()
  const { mode, setMode } = useKOS()
  const isBuild = mode === 'build'

  function handleNav(m: Mode) {
    setMode(m)
    navigate(ROUTE_MAP[m])
  }

  return (
    <>
      {/* Desktop: fixed top bar */}
      <nav
        className="hidden md:flex fixed top-0 left-0 right-0 z-[100] h-[52px] items-center px-6"
        style={{ background: 'rgba(8,3,20,.85)', backdropFilter: 'blur(16px)' }}
      >
        <span className="font-mono text-xs tracking-[4px] uppercase text-purple-soft opacity-60 w-24 shrink-0">
          K·O·S
        </span>

        <div className="flex-1 flex items-center justify-center gap-1">
          {TABS.map(({ mode: m, label }) => {
            const isActive = mode === m
            return (
              <motion.button
                key={m}
                onClick={() => handleNav(m)}
                whileTap={{ scale: 0.95 }}
                animate={isActive ? { opacity: 1 } : { opacity: 0.35 }}
                transition={{ duration: 0.15 }}
                className={[
                  'font-mono text-[11px] tracking-[3px] uppercase px-3 py-1 rounded border',
                  isActive
                    ? isBuild
                      ? 'text-purple-bright border-purple-dim/40 bg-purple-dim/10'
                      : 'text-purple-bright border-purple-bright/40 bg-purple-bright/10'
                    : 'text-white border-transparent hover:text-white/60',
                ].join(' ')}
                style={isActive && !isBuild ? {
                  boxShadow: '0 0 12px rgba(167,139,250,0.25)',
                } : undefined}
              >
                {label}
              </motion.button>
            )
          })}
        </div>

        <div className="w-24 shrink-0" />
      </nav>

      {/* Mobile: fixed bottom tab bar */}
      <nav
        className="flex md:hidden fixed bottom-0 left-0 right-0 z-[100] h-[56px] items-stretch"
        style={{
          background: 'rgba(8,3,20,.95)',
          backdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {TABS.map(({ mode: m, label, Icon }) => {
          const isActive = mode === m
          return (
            <motion.button
              key={m}
              onClick={() => handleNav(m)}
              whileTap={{ scale: 0.92 }}
              animate={{ color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
            >
              <Icon size={18} />
              <span className="font-mono text-[9px] tracking-[2px] uppercase">{label}</span>
            </motion.button>
          )
        })}
      </nav>
    </>
  )
}
