export interface KOSNode {
  id: string
  label: string
  cluster: number
  connections: string[]
  insight: string
  date: string
  // Derived at render time:
  x: number
  y: number
  r: number
  floatPhase: number
}

export interface KOSCluster {
  name: string
  color: [number, number, number]  // RGB
  cx: number
  cy: number
  spread: number
}

export interface RawNode {
  id: string
  label: string
  cluster: number
  connections: string[]
  insight: string
  date: string
}

export interface GraphEdge {
  source: string
  target: string
  weight: number
}

export type AppType = 'script' | 'exam' | 'ask' | 'summary' | 'thread'

type ScriptDraft  = { type: 'script';   text: string }
type ExamDraft    = { type: 'exam';     questions: { id: string; text: string; answer: string; collapsed: boolean }[] }
type AskDraft     = { type: 'ask';      answer: string }
type SummaryDraft = { type: 'summary';  text: string }
type ThreadDraft  = { type: 'thread';   blocks: { id: string; text: string }[] }
export type AppDraft = ScriptDraft | ExamDraft | AskDraft | SummaryDraft | ThreadDraft

export interface BuildSession {
  id: string
  appType: AppType
  topic: string
  format: string
  length?: string
  sourceIds: string[]
  externalSources: { type: string; label: string; url?: string }[]
  draft: AppDraft
  updatedAt: string
}
