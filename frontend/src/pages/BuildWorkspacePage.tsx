import { useParams } from 'react-router-dom'

export default function BuildWorkspacePage() {
  const { appType } = useParams<{ appType: string }>()
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-mono text-xs tracking-widest uppercase text-purple-soft opacity-40">
        {appType?.toUpperCase()} WORKSPACE — coming soon
      </p>
    </div>
  )
}
