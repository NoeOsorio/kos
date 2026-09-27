export interface Source {
  id: string
  content: string
  area?: string | null
}

interface SourceCitationsProps {
  sources: Source[]
}

export default function SourceCitations({ sources }: SourceCitationsProps) {
  if (sources.length === 0) return null

  return (
    <div
      style={{
        marginTop: '12px',
        borderTop: '1px solid rgba(139,92,246,0.15)',
        paddingTop: '10px',
      }}
    >
      <p
        style={{
          fontFamily: 'monospace',
          fontSize: '9px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'rgba(139,92,246,0.5)',
          marginBottom: '8px',
        }}
      >
        Sources from your brain
      </p>
      <div className="flex flex-col gap-2">
        {sources.map((src, i) => (
          <div
            key={src.id}
            style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                fontFamily: 'monospace',
                fontSize: '9px',
                color: 'rgba(139,92,246,0.5)',
                minWidth: '14px',
                paddingTop: '1px',
              }}
            >
              {i + 1}.
            </span>
            <div>
              <p
                style={{
                  fontSize: '11px',
                  color: 'rgba(240,238,255,0.55)',
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {src.content.length > 120 ? src.content.slice(0, 120) + '…' : src.content}
              </p>
              {src.area && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '8px',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    color: 'rgba(139,92,246,0.4)',
                  }}
                >
                  {src.area}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
