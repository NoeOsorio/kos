import { createContext, useContext, useState, ReactNode } from 'react'

export type Mode = 'talk' | 'explore' | 'build'

interface TalkContextData {
  nodeId?: string
  nodeLabel?: string
  nodeInsight?: string
}

interface KOSContextValue {
  mode: Mode
  setMode: (mode: Mode) => void
  selectedNodeId: string | null
  setSelectedNodeId: (id: string | null) => void
  talkContext: TalkContextData | null
  setTalkContext: (ctx: TalkContextData | null) => void
}

const KOSCtx = createContext<KOSContextValue | null>(null)

export function KOSProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('talk')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [talkContext, setTalkContext] = useState<TalkContextData | null>(null)

  return (
    <KOSCtx.Provider value={{ mode, setMode, selectedNodeId, setSelectedNodeId, talkContext, setTalkContext }}>
      {children}
    </KOSCtx.Provider>
  )
}

export function useKOS(): KOSContextValue {
  const ctx = useContext(KOSCtx)
  if (!ctx) throw new Error('useKOS must be used within KOSProvider')
  return ctx
}
