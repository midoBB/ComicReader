import type { Settings } from '../hooks/useSettings'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, cursor: 'pointer', flexShrink: 0,
        background: checked ? '#4a9eff' : '#555',
        position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%', background: '#fff',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function SegmentedSwitch<T extends string>({
  value, options, onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid #555' }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            flex: 1, padding: '4px 8px', fontSize: 12, border: 'none', cursor: 'pointer',
            background: value === opt.value ? '#4a9eff' : '#1a1a1a',
            color: value === opt.value ? '#fff' : '#aaa',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
      <span style={{ fontSize: 13, color: '#ccc' }}>{label}</span>
      {children}
    </div>
  )
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 48,
        right: 8,
        background: '#2a2a2a',
        border: '1px solid #444',
        borderRadius: 6,
        padding: '12px 16px',
        width: 'min(280px, calc(100vw - 16px))',
        zIndex: 100,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Settings</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      <Row label="Reader width">
        <SegmentedSwitch
          value={settings.readerWidth}
          options={[
            { value: 'constrained', label: 'Constrained' },
            { value: 'full', label: 'Full' },
          ]}
          onChange={v => onChange({ readerWidth: v })}
        />
      </Row>

      <Row label="Two-page spread">
        <Toggle checked={settings.spreadView} onChange={v => onChange({ spreadView: v })} />
      </Row>

      {settings.spreadView && (
        <Row label="Spread direction">
          <SegmentedSwitch
            value={settings.spreadDirection}
            options={[
              { value: 'rtl', label: 'Right to left' },
              { value: 'ltr', label: 'Left to right' },
            ]}
            onChange={v => onChange({ spreadDirection: v })}
          />
        </Row>
      )}
    </div>
  )
}
