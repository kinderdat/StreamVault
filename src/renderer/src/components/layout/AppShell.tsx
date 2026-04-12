import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { Download } from 'lucide-react'
import { animate } from 'animejs'
import { slideDown } from '../../utils/anime'
import { useRecordingsStore } from '../../stores/recordingsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatBytes } from '../../utils/format'

function UpdateBanner() {
  const [state, setState] = useState<'idle' | 'available' | 'downloaded'>('idle')
  const bannerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const off1 = window.electronAPI.onUpdaterAvailable?.(() => setState('available'))
    const off2 = window.electronAPI.onUpdaterDownloaded?.(() => setState('downloaded'))
    return () => { off1?.(); off2?.() }
  }, [])

  useEffect(() => {
    if (state !== 'idle' && bannerRef.current) {
      slideDown(bannerRef.current)
    }
  }, [state])

  if (state === 'idle') return null

  return (
    <div ref={bannerRef} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 20px',
      background: state === 'downloaded' ? 'var(--accent)' : 'var(--surface-raised)',
      borderBottom: '1px solid var(--border)',
      fontFamily: 'var(--font-ui)', fontSize: 13,
      color: state === 'downloaded' ? '#fff' : 'var(--text-primary)',
      zIndex: 100,
    }}>
      <Download size={14} />
      {state === 'available'
        ? 'A new update is downloading in the background...'
        : 'Update ready — restart to apply'}
      {state === 'downloaded' && (
        <button
          onClick={() => window.electronAPI.updaterInstallAndRestart()}
          style={{
            marginLeft: 'auto', padding: '4px 14px',
            background: '#fff', color: 'var(--accent)',
            border: 'none', borderRadius: 6,
            fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Restart now
        </button>
      )}
    </div>
  )
}

function TelemetryBar() {
  const activeIds   = useRecordingsStore(s => s.activeIds)
  const recordings  = useRecordingsStore(s => s.recordings)
  const storagePath = useSettingsStore(s => s.settings.storagePath as string | undefined)

  const [disk, setDisk] = useState<{ free: number; total: number } | null>(null)
  // Track cumulative bytes for a rough bitrate estimate
  const [bitrate, setBitrate] = useState<number>(0)
  const prevSizes  = useRef<Map<number, number>>(new Map())
  const prevTick   = useRef<number>(Date.now())
  const barRef     = useRef<HTMLDivElement>(null)

  // Disk space — refresh every 30s
  useEffect(() => {
    if (!storagePath) return
    const fetch = () => window.electronAPI.getDiskSpace(storagePath).then(setDisk).catch(() => {})
    fetch()
    const t = setInterval(fetch, 30_000)
    return () => clearInterval(t)
  }, [storagePath])

  // Rough bitrate from file-size deltas (updated by recording:sizeUpdate events)
  useEffect(() => {
    if (activeIds.size === 0) { setBitrate(0); prevSizes.current.clear(); return }
    const activeRecs = recordings.filter(r => activeIds.has(r.id))
    const now = Date.now()
    const dt  = (now - prevTick.current) / 1000 // seconds
    if (dt < 1) return
    prevTick.current = now
    let deltaBytes = 0
    for (const r of activeRecs) {
      const prev = prevSizes.current.get(r.id) ?? 0
      const curr = r.file_size_bytes ?? 0
      if (curr > prev) deltaBytes += curr - prev
      prevSizes.current.set(r.id, curr)
    }
    if (deltaBytes > 0) setBitrate(Math.round((deltaBytes * 8) / dt / 1000)) // kbps
  }, [recordings, activeIds])

  // Animate progress bar
  useEffect(() => {
    if (!barRef.current) return
    const pct = activeIds.size > 0 ? 100 : 0
    animate(barRef.current, { width: `${pct}%`, duration: 500, ease: 'outExpo' })
  }, [activeIds.size])

  const isActive = activeIds.size > 0
  if (!isActive) return null

  const diskPct = disk ? ((disk.total - disk.free) / disk.total) * 100 : null
  const diskColor = diskPct !== null
    ? diskPct > 90 ? 'var(--danger)' : diskPct > 70 ? 'var(--warning)' : 'var(--success)'
    : 'var(--text-disabled)'

  return (
    <div style={{
      height: 30, flexShrink: 0,
      background: 'var(--surface-raised)',
      borderTop: '2px solid var(--border-visible)',
      display: 'flex', alignItems: 'center',
      gap: 14, padding: '0 16px',
      fontFamily: 'var(--font-mono)', fontSize: 11,
    }}>
      {/* Left — live stats */}
      <span style={{ color: 'var(--text-disabled)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>
          ● {activeIds.size} REC
        </span>
        {bitrate > 0 && (
          <span style={{ color: 'var(--text-secondary)' }}>
            {bitrate > 1000 ? `${(bitrate / 1000).toFixed(1)} Mb/s` : `${bitrate} kb/s`}
          </span>
        )}
        {disk && (
          <span style={{ color: diskColor }}>
            {formatBytes(disk.free)} free
          </span>
        )}
      </span>

      {/* Progress bar — fills remaining space */}
      <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
        <div
          ref={barRef}
          style={{ width: '0%', height: '100%', background: 'var(--accent)', borderRadius: 2 }}
        />
      </div>

      {/* Right — task label */}
      <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
        {activeIds.size} stream{activeIds.size > 1 ? 's' : ''} active
      </span>
    </div>
  )
}

export function AppShell() {
  return (
    <div className="app-shell">
      <TitleBar />
      <UpdateBanner />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <TelemetryBar />
    </div>
  )
}
