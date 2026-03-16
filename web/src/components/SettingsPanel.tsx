import type { Settings } from '../hooks/useSettings'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onClose: () => void
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? 'on' : 'off'}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <div className="toggle-thumb" />
    </button>
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
    <div className="segmented">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={`segmented-btn ${value === opt.value ? 'active' : 'inactive'}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SettingsPanel({ settings, onChange, onClose }: Props) {
  return (
    <div className="settings-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="settings-title">Settings</span>
        <button className="settings-close" onClick={onClose}>×</button>
      </div>

      <div className="settings-row">
        <span className="settings-label">Reader width</span>
        <SegmentedSwitch
          value={settings.readerWidth}
          options={[
            { value: 'constrained', label: 'Fitted' },
            { value: 'full', label: 'Full' },
          ]}
          onChange={v => onChange({ readerWidth: v })}
        />
      </div>

      <div className="settings-row">
        <span className="settings-label">Two-page spread</span>
        <Toggle checked={settings.spreadView} onChange={v => onChange({ spreadView: v })} />
      </div>

      {settings.spreadView && (
        <div className="settings-row">
          <span className="settings-label">Direction</span>
          <SegmentedSwitch
            value={settings.spreadDirection}
            options={[
              { value: 'rtl', label: 'R→L' },
              { value: 'ltr', label: 'L→R' },
            ]}
            onChange={v => onChange({ spreadDirection: v })}
          />
        </div>
      )}

      <div className="settings-row">
        <span className="settings-label">Page gaps</span>
        <Toggle checked={settings.pageGaps} onChange={v => onChange({ pageGaps: v })} />
      </div>
    </div>
  )
}
