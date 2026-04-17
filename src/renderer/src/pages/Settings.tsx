import { useState, useEffect } from 'react'
import { Switch } from '../components/ui/switch'
import { Select } from '../components/ui/select'
import { Icon } from '../components/Icon'
import { useSettingsStore } from '../stores/settingsStore'
import { formatBytes } from '../utils/format'

/* ── Radix Switch ──────────────────────────────────────────────── */
function RSwitch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? 'var(--accent)' : 'var(--surface-raised)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-visible)'}`,
        position: 'relative', flexShrink: 0, cursor: 'pointer',
        transition: 'background 200ms, border-color 200ms, box-shadow 200ms',
        outline: 'none',
        boxShadow: checked ? '0 0 10px var(--accent-subtle)' : 'none',
      }}
    >
      <Switch.Thumb
        style={{
          display: 'block', width: 16, height: 16, borderRadius: '50%',
          background: checked ? '#fff' : 'var(--text-disabled)',
          position: 'absolute', top: 3,
          transform: checked ? 'translateX(24px)' : 'translateX(3px)',
          transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 200ms',
        }}
      />
    </Switch.Root>
  )
}

/* ── Radix Select ──────────────────────────────────────────────── */
function RSelect({
  value, onValueChange, children, style,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <Select.Root value={value} onValueChange={onValueChange}>
      <Select.Trigger
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'var(--surface)', border: '1px solid var(--border-visible)',
          color: 'var(--text-primary)', padding: '0 12px',
          fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600,
          height: 38, borderRadius: 'var(--radius-xs)',
          cursor: 'pointer', outline: 'none', userSelect: 'none',
          minWidth: 160, transition: 'border-color 150ms, box-shadow 150ms',
          ...style,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-visible)'; e.currentTarget.style.boxShadow = 'none' }}
      >
        <Select.Value />
        <Select.Icon style={{ marginLeft: 'auto' }}><Icon name="arrow-down-s-line" size={16} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          style={{
            background: 'var(--surface-raised)', border: '1px solid var(--border-visible)',
            borderRadius: 'var(--radius-sm)', overflow: 'hidden',
            zIndex: 9999, minWidth: 'var(--radix-select-trigger-width)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <Select.Viewport style={{ padding: 4 }}>
            {children}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  )
}

function ROption({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <Select.Item
      value={value}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 28px 8px 10px',
        fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
        color: 'var(--text-primary)', cursor: 'pointer',
        borderRadius: 6, outline: 'none', position: 'relative',
        transition: 'background 80ms',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator style={{ position: 'absolute', right: 8, color: 'var(--accent)' }}>
        <Icon name="check-line" size={16} />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

/* ── Settings row ──────────────────────────────────────────────── */
function Row({
  label, desc, children, dirty,
}: { label: string; desc?: string; children?: React.ReactNode; dirty?: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20,
      padding: '14px 24px', borderBottom: '1px solid var(--border)',
      minHeight: 62,
      background: dirty ? 'rgba(167,139,250,0.04)' : 'transparent',
      transition: 'background 200ms',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--text-display)' }}>
            {label}
          </div>
          {dirty && (
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0,
              boxShadow: '0 0 6px var(--accent)',
            }} />
          )}
        </div>
        {desc && (
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 3, fontWeight: 400 }}>
            {desc}
          </div>
        )}
      </div>
      {children && (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Section header ────────────────────────────────────────────── */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10, border: '1px solid var(--border)', background: 'var(--black)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '13px 24px', borderBottom: '1px solid var(--border-visible)',
        background: 'var(--surface)',
      }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text-display)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

/* ── Advanced section (collapsible) ───────────────────────────── */
function AdvancedSection({ children, hint }: { children: React.ReactNode; hint?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: 10, border: '1px solid var(--border)', background: 'var(--black)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 24px', background: 'var(--surface)', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border-visible)' : 'none',
          transition: 'background 150ms',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-raised)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)')}
      >
        <span style={{ color: 'var(--text-secondary)', transition: 'transform 150ms', transform: open ? 'rotate(90deg)' : 'none', display: 'flex' }}>
          <Icon name="arrow-right-s-line" size={16} />
        </span>
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 700, color: 'var(--text-display)' }}>
          Advanced
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)', marginLeft: 'auto', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          {hint ?? 'Intervals, binary paths, retries'}
        </span>
      </button>
      {open && children}
    </div>
  )
}

/* ── Number input ──────────────────────────────────────────────── */
function NumInput({
  value, onChange, min, max, width = 80,
}: { value: number; onChange: (v: number) => void; min?: number; max?: number; width?: number }) {
  return (
    <input
      type="number" min={min} max={max}
      value={value}
      onChange={e => {
        const next = Number(e.target.value)
        if (Number.isFinite(next)) onChange(next)
      }}
      style={{
        width, background: 'var(--surface)', border: '1px solid var(--border-visible)',
        color: 'var(--text-primary)', padding: '0 10px',
        fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, height: 38,
        borderRadius: 'var(--radius-xs)', outline: 'none',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-visible)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

/* ── Text input ────────────────────────────────────────────────── */
function TextInput({
  value, onChange, placeholder, type = 'text', width = 220,
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; width?: number }) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      style={{
        width, background: 'var(--surface)', border: '1px solid var(--border-visible)',
        color: 'var(--text-primary)', padding: '0 12px',
        fontFamily: 'var(--font-mono)', fontSize: 13, height: 38,
        borderRadius: 'var(--radius-xs)', outline: 'none',
        transition: 'border-color 150ms, box-shadow 150ms',
      }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
      onBlur={e => { e.target.style.borderColor = 'var(--border-visible)'; e.target.style.boxShadow = 'none' }}
    />
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export function Settings() {
  const s = useSettingsStore()
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [diskSpace, setDiskSpace] = useState<{ free: number; total: number } | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)

  const hasChanges = Object.keys(draft).length > 0

  // Merge draft on top of store
  function val<T>(key: string): T {
    return (key in draft ? draft[key] : (s as Record<string, unknown>)[key]) as T
  }
  function update(key: string, value: unknown) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  async function handleSave() {
    setSaveState('saving')
    for (const [key, value] of Object.entries(draft)) {
      if (key === 'pollingIntervalSecs') continue
      await s.set(key as never, value as never)
    }
    if ('pollingIntervalSecs' in draft) {
      const secs = Math.max(10, Number(draft.pollingIntervalSecs) || 10)
      window.electronAPI.monitorSetInterval(secs)
    }
    setDraft({})
    setSaveState('saved')
    setTimeout(() => setSaveState('idle'), 2200)
  }

  useEffect(() => {
    if (s.storagePath) {
      window.electronAPI.getDiskSpace(s.storagePath).then(setDiskSpace)
    }
  }, [s.storagePath])

  useEffect(() => {
    let alive = true
    window.electronAPI.getAppVersion?.()
      .then(v => { if (alive) setAppVersion(v) })
      .catch(() => { if (alive) setAppVersion(null) })
    return () => { alive = false }
  }, [])

  async function handlePickFolder() {
    const path = await window.electronAPI.pickFolder()
    if (path) {
      update('storagePath', path)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 780 }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <h1 className="page-title">Settings</h1>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>
            Configure recording behavior, storage, and monitoring
          </p>
        </div>
        <button
          className={`btn ${saveState === 'saved' ? 'btn-ghost' : 'btn-primary'}`}
          onClick={handleSave}
          disabled={!hasChanges || saveState === 'saving'}
          style={{ flexShrink: 0, marginTop: 4, minWidth: 120, transition: 'all 200ms' }}
        >
          {saveState === 'saved'
            ? <><Icon name="check-double-line" size={16} /> Saved!</>
            : saveState === 'saving'
            ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
            : <><Icon name="save-3-line" size={16} /> Save Changes</>
          }
        </button>
      </div>

      {hasChanges && (
        <div style={{
          padding: '10px 16px', marginBottom: 16,
          borderRadius: 'var(--radius-xs)',
          background: 'var(--accent-subtle)', border: '1px solid var(--accent)',
          fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600,
          color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          {Object.keys(draft).length} unsaved change{Object.keys(draft).length !== 1 ? 's' : ''} — click Save Changes to apply
        </div>
      )}

      {/* ── Storage ── */}
      <Section icon={<Icon name="hard-drive-2-line" size={16} />} title="Storage">
        <Row label="Recording Folder" desc={val<string>('storagePath') || 'Default: ~/Videos/StreamVault'}>
          {diskSpace && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)', fontWeight: 700 }}>
              {formatBytes(diskSpace.free)} free
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={handlePickFolder}>
            <Icon name="folder-open-line" size={16} /> Change
          </button>
        </Row>
        <Row
          label="Output Format" desc="Container format for saved recordings"
          dirty={'outputFormat' in draft}
        >
          <RSelect value={val<string>('outputFormat')} onValueChange={v => update('outputFormat', v)}>
            <ROption value="mp4">MP4 — recommended, best compatibility</ROption>
            <ROption value="ts">TS — raw stream, crash-safe, no remux</ROption>
          </RSelect>
        </Row>
        <Row
          label="File Naming Pattern"
          desc="Tokens: {streamer} {platform} {date} {time} {title}"
          dirty={'fileNamePattern' in draft}
        >
          <TextInput
            value={val<string>('fileNamePattern')}
            onChange={v => update('fileNamePattern', v || '{streamer}_{date}_{time}')}
            placeholder="{streamer}_{date}_{time}"
            width={280}
          />
        </Row>
      </Section>

      {/* ── Recording Quality ── */}
      <Section icon={<Icon name="equalizer-line" size={16} />} title="Recording Quality">
        <Row
          label="Default Quality"
          desc="Resolution cap — Twitch/Kick use named tiers, YouTube uses format selectors"
          dirty={'defaultQuality' in draft}
        >
          <RSelect value={val<string>('defaultQuality')} onValueChange={v => update('defaultQuality', v)}>
            <ROption value="1080p60">1080p60 (recommended)</ROption>
            <ROption value="1080">1080p (any fps)</ROption>
            <ROption value="720">720p</ROption>
            <ROption value="480">480p</ROption>
          </RSelect>
        </Row>
      </Section>

      {/* ── Monitoring ── */}
      <Section icon={<Icon name="radio-line" size={16} />} title="Monitoring">
        <Row
          label="Max Concurrent Recordings"
          desc="How many streams can be recorded simultaneously"
          dirty={'maxConcurrentRecordings' in draft}
        >
          <NumInput
            value={val<number>('maxConcurrentRecordings')}
            onChange={v => update('maxConcurrentRecordings', Math.max(1, Math.min(20, v)))}
            min={1} max={20} width={80}
          />
        </Row>
      </Section>

      {/* ── Notifications ── */}
      <Section icon={<Icon name="notification-3-line" size={16} />} title="Notifications">
        <Row
          label="Stream went live"
          desc="Desktop notification when a monitored streamer goes live"
          dirty={'notifications' in draft}
        >
          <RSwitch checked={val<boolean>('notifications')} onCheckedChange={v => update('notifications', v)} />
        </Row>
        <Row
          label="Recording completed"
          desc="Desktop notification when a recording finishes processing"
          dirty={'notifyOnComplete' in draft}
        >
          <RSwitch checked={val<boolean>('notifyOnComplete')} onCheckedChange={v => update('notifyOnComplete', v)} />
        </Row>
        <Row
          label="Start minimized to tray"
          desc="Launch StreamVault hidden — access it via the system tray icon"
          dirty={'startMinimized' in draft}
        >
          <RSwitch checked={val<boolean>('startMinimized')} onCheckedChange={v => update('startMinimized', v)} />
        </Row>
      </Section>

      {/* ── App Data ── */}
      <Section icon={<Icon name="database-2-line" size={16} />} title="App Data">
        <Row label="Recordings Folder" desc={val<string>('storagePath') || 'Default: ~/Videos/StreamVault'}>
          <button className="btn btn-ghost btn-sm" onClick={() => window.electronAPI.openRecordingsFolder()}>
            <Icon name="folder-open-line" size={16} /> Open
          </button>
        </Row>
        <Row label="Config & Database" desc="Settings file, streamvault.db, and cached avatars">
          <button className="btn btn-ghost btn-sm" onClick={() => window.electronAPI.openAppDataFolder()}>
            <Icon name="folder-open-line" size={16} /> Open
          </button>
        </Row>
      </Section>

      {/* ── Advanced ── */}
      <AdvancedSection hint="Polling, binary paths, retry policy">
        <div>
          <Row
            label="Polling Interval"
            desc="How often to check if monitored streamers are live (min 10s)"
            dirty={'pollingIntervalSecs' in draft}
          >
            <NumInput
              value={val<number>('pollingIntervalSecs')}
              onChange={v => update('pollingIntervalSecs', Math.max(10, v))}
              min={10} max={3600} width={90}
            />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>sec</span>
          </Row>
          <Row
            label="Max Retries on Failure"
            desc="yt-dlp --retries value (0 = no retries)"
            dirty={'maxRetries' in draft}
          >
            <NumInput
              value={val<number>('maxRetries')}
              onChange={v => update('maxRetries', Math.max(0, Math.min(10, v)))}
              min={0} max={10} width={80}
            />
          </Row>
          <Row
            label="Custom yt-dlp Path"
            desc="Override bundled yt-dlp binary. Leave blank to use bundled."
            dirty={'ytdlpPath' in draft}
          >
            <TextInput
              value={val<string>('ytdlpPath')}
              onChange={v => update('ytdlpPath', v)}
              placeholder="C:\tools\yt-dlp.exe"
              width={280}
            />
          </Row>
          <Row
            label="Custom FFmpeg Path"
            desc="Override bundled ffmpeg binary. Leave blank to use bundled."
            dirty={'ffmpegPath' in draft}
          >
            <TextInput
              value={val<string>('ffmpegPath')}
              onChange={v => update('ffmpegPath', v)}
              placeholder="C:\tools\ffmpeg.exe"
              width={280}
            />
          </Row>
        </div>
      </AdvancedSection>

      {/* ── About ── */}
      <Section icon={<Icon name="information-line" size={16} />} title="About">
        <Row label="StreamVault" desc="Automatic stream archiver for Twitch, Kick, YouTube & more">
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)', fontWeight: 700 }}>
            v{appVersion ?? '—'}
          </span>
        </Row>
        <Row label="Recording Engine" desc="yt-dlp + FFmpeg — stream archiving and media processing">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => window.electronAPI.openExternal('https://github.com/yt-dlp/yt-dlp/releases')}
          >
            <Icon name="external-link-line" size={16} /> Update yt-dlp
          </button>
        </Row>
      </Section>

      {/* ── Sticky save footer ── */}
      {hasChanges && (
        <div style={{
          position: 'sticky', bottom: 0,
          padding: '14px 0 20px',
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          background: 'linear-gradient(to top, var(--black) 60%, transparent)',
        }}>
          <button className="btn btn-ghost" onClick={() => setDraft({})}>
            Discard
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saveState === 'saving'}
            style={{ minWidth: 140 }}
          >
            {saveState === 'saving'
              ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              : <><Icon name="save-3-line" size={16} /> Save Changes</>
            }
          </button>
        </div>
      )}
    </div>
  )
}
