import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import { TitleBar } from './TitleBar'
import { Sidebar } from './Sidebar'
import { animate, createScope } from 'animejs'
import { useRecordingsStore } from '../../stores/recordingsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatBytes } from '../../utils/format'
import { useDiskSpace } from '../../hooks/useDiskSpace'
import { PersistentVideoMount } from '../player/PersistentVideoMount'
import { usePlayerPipGuard } from '../../hooks/usePlayerPipGuard'

function TelemetryBar() {
  const activeIds   = useRecordingsStore(s => s.activeIds)
  const recordings  = useRecordingsStore(s => s.recordings)
  const storagePath = useSettingsStore(s => s.settings.storagePath as string | undefined)

  const { data: disk } = useDiskSpace(storagePath)
  // Track cumulative bytes for a rough bitrate estimate
  const [bitrate, setBitrate] = useState<number>(0)
  const prevSizes         = useRef<Map<number, number>>(new Map())
  const prevTick          = useRef<number>(Date.now())
  const smoothedBitrate   = useRef<number>(0)
  const barRef            = useRef<HTMLDivElement>(null)
  const barScopeRef       = useRef<ReturnType<typeof createScope> | null>(null)

  // Rough bitrate from file-size deltas (updated by recording:sizeUpdate events)
  useEffect(() => {
    if (activeIds.size === 0) {
      setBitrate(0)
      smoothedBitrate.current = 0
      prevSizes.current.clear()
      return
    }
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
    if (deltaBytes > 0) {
      const raw = Math.round((deltaBytes * 8) / dt / 1000) // kbps
      smoothedBitrate.current = smoothedBitrate.current * 0.7 + raw * 0.3
      setBitrate(Math.round(smoothedBitrate.current))
    }
  }, [recordings, activeIds])

  // Animate progress bar
  useEffect(() => {
    if (!barRef.current) return
    barScopeRef.current?.revert()
    const pct = activeIds.size > 0 ? 100 : 0
    barScopeRef.current = createScope({ root: barRef.current })
    barScopeRef.current.add(() => animate(barRef.current!, { width: `${pct}%`, duration: 500, ease: 'outExpo' }))
    return () => { barScopeRef.current?.revert() }
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
  usePlayerPipGuard()

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
      <TelemetryBar />
      <PersistentVideoMount />
    </div>
  )
}
