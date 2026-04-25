import { useEffect, useMemo, useState } from 'react'

import { Icon } from '@renderer/components/Icon'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { Switch } from '@renderer/components/ui/switch'
import { useSettingsStore } from '@renderer/stores/settingsStore'
import { formatBytes } from '@renderer/utils/format'

import './settings.css'

type SaveState = 'idle' | 'saving' | 'saved'

function SettingCard({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="settings-card">
      <header className="settings-card-header">
        <div className="settings-card-title">
          <Icon name={icon} size={16} />
          <span>{title}</span>
        </div>
        {right ? <div className="settings-card-right">{right}</div> : null}
      </header>
      <div className="settings-card-body">{children}</div>
    </section>
  )
}

function Row({
  label,
  description,
  control,
}: {
  label: string
  description?: string
  control: React.ReactNode
}) {
  return (
    <div className="settings-row2">
      <div className="settings-row2-left">
        <div className="settings-row2-label">{label}</div>
        {description ? <div className="settings-row2-desc">{description}</div> : null}
      </div>
      <div className="settings-row2-right">{control}</div>
    </div>
  )
}

function TextField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={['settings-field', props.className].filter(Boolean).join(' ')} />
}

function NumberField(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={['settings-field settings-field--num', props.className].filter(Boolean).join(' ')}
    />
  )
}

function SwitchField({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <Switch.Root className="settings-switch" checked={checked} onCheckedChange={onCheckedChange}>
      <Switch.Thumb className="settings-switch-thumb" />
    </Switch.Root>
  )
}

function SelectField({
  value,
  onValueChange,
  children,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="settings-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="settings-select-content" position="popper">
        {children}
      </SelectContent>
    </Select>
  )
}

function Option({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <SelectItem className="settings-select-item" value={value}>
      {children}
    </SelectItem>
  )
}

export function Settings() {
  const s = useSettingsStore()
  const [draft, setDraft] = useState<Record<string, unknown>>({})
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [diskSpace, setDiskSpace] = useState<{ free: number; total: number } | null>(null)
  const [appVersion, setAppVersion] = useState<string | null>(null)
  const [updateState, setUpdateState] = useState<
    | { status: 'idle' }
    | { status: 'checking' }
    | { status: 'ok'; latest: string; updateAvailable: boolean; url: string }
    | { status: 'error' }
  >({ status: 'idle' })

  const hasChanges = Object.keys(draft).length > 0

  const values = useMemo(() => {
    return { ...s.settings, ...draft } as Record<string, unknown>
  }, [s.settings, draft])

  function update(key: string, value: unknown) {
    setDraft((d) => ({ ...d, [key]: value }))
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
    } else {
      setDiskSpace(null)
    }
  }, [s.storagePath])

  useEffect(() => {
    let alive = true
    window.electronAPI
      .getAppVersion?.()
      .then((v) => {
        if (alive) setAppVersion(v)
      })
      .catch(() => {
        if (alive) setAppVersion(null)
      })
    return () => {
      alive = false
    }
  }, [])

  async function handleCheckUpdates() {
    setUpdateState({ status: 'checking' })
    try {
      const info = await window.electronAPI.checkForUpdates()
      setUpdateState({
        status: 'ok',
        latest: info.latest,
        updateAvailable: info.updateAvailable,
        url: info.url,
      })
      if (info.updateAvailable) {
        window.electronAPI.openExternal(info.url)
      }
    } catch {
      setUpdateState({ status: 'error' })
    }
  }

  async function handlePickFolder() {
    const p = await window.electronAPI.pickFolder()
    if (p) update('storagePath', p)
  }

  return (
    <div className="page settings-redo">
      <div className="settings-topbar">
        <div className="settings-head">
          <h1 className="page-title">Settings</h1>
          <p className="settings-subtitle">Configure recording behavior, storage, and monitoring</p>
        </div>
        <button
          className="btn btn-primary settings-save"
          onClick={handleSave}
          disabled={!hasChanges || saveState === 'saving'}
        >
          {saveState === 'saved' ? (
            <>
              <Icon name="check-double-line" size={16} /> Saved
            </>
          ) : saveState === 'saving' ? (
            <>
              <span className="spinner" style={{ width: 14, height: 14 }} /> Saving…
            </>
          ) : (
            <>
              <Icon name="save-3-line" size={16} /> Save
            </>
          )}
        </button>
      </div>

      {hasChanges ? (
        <div className="settings-banner">
          <span className="settings-banner-dot" aria-hidden />
          {Object.keys(draft).length} unsaved change{Object.keys(draft).length === 1 ? '' : 's'}
        </div>
      ) : null}

      <div className="settings-grid">
        <SettingCard
          title="Storage"
          icon="hard-drive-2-line"
          right={diskSpace ? <span className="settings-mono">{formatBytes(diskSpace.free)} free</span> : null}
        >
          <Row
            label="Recording folder"
            description={(values.storagePath as string) || 'Default: ~/Videos/StreamVault'}
            control={
              <button className="btn btn-ghost btn-sm" onClick={handlePickFolder}>
                <Icon name="folder-open-line" size={16} /> Change
              </button>
            }
          />
          <Row
            label="Output format"
            description="Container format for saved recordings"
            control={
              <SelectField
                value={(values.outputFormat as string) || 'mp4'}
                onValueChange={(v) => update('outputFormat', v)}
              >
                <Option value="mp4">MP4 — recommended</Option>
                <Option value="ts">TS — crash-safe</Option>
              </SelectField>
            }
          />
          <Row
            label="File naming"
            description="Tokens: {streamer} {platform} {date} {time} {title}"
            control={
              <TextField
                value={String(values.fileNamePattern ?? '{streamer}_{date}_{time}') as string}
                onChange={(e) => update('fileNamePattern', e.target.value || '{streamer}_{date}_{time}')}
                placeholder="{streamer}_{date}_{time}"
              />
            }
          />
        </SettingCard>

        <SettingCard title="Recording" icon="equalizer-line">
          <Row
            label="Default quality"
            description="Resolution cap used by supported platforms"
            control={
              <SelectField
                value={(values.defaultQuality as string) || '1080p60'}
                onValueChange={(v) => update('defaultQuality', v)}
              >
                <Option value="1080p60">1080p60</Option>
                <Option value="1080">1080p</Option>
                <Option value="720">720p</Option>
                <Option value="480">480p</Option>
              </SelectField>
            }
          />
          <Row
            label="Max retries"
            description="yt-dlp --retries"
            control={
              <NumberField
                type="number"
                min={0}
                max={10}
                value={Number(values.maxRetries ?? 3)}
                onChange={(e) => update('maxRetries', Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
              />
            }
          />
        </SettingCard>

        <SettingCard title="Monitoring" icon="radio-line">
          <Row
            label="Max concurrent recordings"
            description="How many streams can be recorded simultaneously"
            control={
              <NumberField
                type="number"
                min={1}
                max={20}
                value={Number(values.maxConcurrentRecordings ?? 3)}
                onChange={(e) =>
                  update('maxConcurrentRecordings', Math.max(1, Math.min(20, Number(e.target.value) || 1)))
                }
              />
            }
          />
          <Row
            label="Polling interval (sec)"
            description="How often to check live status (min 10s)"
            control={
              <NumberField
                type="number"
                min={10}
                max={3600}
                value={Number(values.pollingIntervalSecs ?? 10)}
                onChange={(e) => update('pollingIntervalSecs', Math.max(10, Number(e.target.value) || 10))}
              />
            }
          />
        </SettingCard>

        <SettingCard title="Notifications" icon="notification-3-line">
          <Row
            label="Stream went live"
            description="Desktop notification when a monitored streamer goes live"
            control={
              <SwitchField
                checked={Boolean(values.notifications ?? true)}
                onCheckedChange={(v) => update('notifications', v)}
              />
            }
          />
          <Row
            label="Recording completed"
            description="Desktop notification when a recording finishes processing"
            control={
              <SwitchField
                checked={Boolean(values.notifyOnComplete ?? false)}
                onCheckedChange={(v) => update('notifyOnComplete', v)}
              />
            }
          />
          <Row
            label="Start minimized"
            description="Launch hidden — access via tray icon"
            control={
              <SwitchField
                checked={Boolean(values.startMinimized ?? false)}
                onCheckedChange={(v) => update('startMinimized', v)}
              />
            }
          />
        </SettingCard>

        <SettingCard title="App data" icon="database-2-line">
          <Row
            label="Open recordings folder"
            description="Show recordings on disk"
            control={
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => window.electronAPI.openRecordingsFolder()}
              >
                <Icon name="folder-open-line" size={16} /> Open
              </button>
            }
          />
          <Row
            label="Open app data"
            description="Settings file, database, cached avatars"
            control={
              <button className="btn btn-ghost btn-sm" onClick={() => window.electronAPI.openAppDataFolder()}>
                <Icon name="folder-open-line" size={16} /> Open
              </button>
            }
          />
        </SettingCard>

        <SettingCard
          title="Binaries"
          icon="terminal-box-line"
          right={<span className="settings-mono">Overrides</span>}
        >
          <Row
            label="Custom yt-dlp path"
            description="Leave blank to use bundled"
            control={
              <TextField
                value={String(values.ytdlpPath ?? '')}
                onChange={(e) => update('ytdlpPath', e.target.value)}
                placeholder="C:\\tools\\yt-dlp.exe"
              />
            }
          />
          <Row
            label="Custom ffmpeg path"
            description="Leave blank to use bundled"
            control={
              <TextField
                value={String(values.ffmpegPath ?? '')}
                onChange={(e) => update('ffmpegPath', e.target.value)}
                placeholder="C:\\tools\\ffmpeg.exe"
              />
            }
          />
        </SettingCard>

        <SettingCard
          title="About"
          icon="information-line"
          right={<span className="settings-mono">v{appVersion ?? '—'}</span>}
        >
          <div className="settings-about">
            <div className="settings-about-title">StreamVault</div>
            <div className="settings-about-desc">
              Automatic stream archiver for Twitch, Kick, YouTube & more
            </div>
            <button className="btn btn-ghost btn-sm settings-about-link" onClick={handleCheckUpdates}>
              <Icon name="download-2-line" size={16} />{' '}
              {updateState.status === 'checking'
                ? 'Checking…'
                : updateState.status === 'ok' && updateState.updateAvailable
                  ? `Update available (${updateState.latest})`
                  : updateState.status === 'ok'
                    ? 'No updates found'
                    : 'Check for updates'}
            </button>
            <button
              className="btn btn-ghost btn-sm settings-about-link"
              onClick={() => window.electronAPI.openExternal('https://github.com/yt-dlp/yt-dlp/releases')}
            >
              <Icon name="external-link-line" size={16} /> Update yt-dlp
            </button>
          </div>
        </SettingCard>
      </div>
    </div>
  )
}
