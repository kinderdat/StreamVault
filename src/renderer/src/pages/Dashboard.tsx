import { useEffect, useRef, useState } from 'react'
import { createScope } from 'animejs'
import { useStreamersStore } from '../stores/streamersStore'
import { useRecordingsStore } from '../stores/recordingsStore'
import { useSettingsStore } from '../stores/settingsStore'
import { PlatformBadge } from '../components/PlatformBadge'
import { formatElapsed, formatBytes, fileUrl } from '../utils/format'
import { staggerIn, countUp, fadeSlideIn } from '../utils/anime'
import { useDiskSpace } from '../hooks/useDiskSpace'
import { Icon } from '../components/Icon'

export function Dashboard() {
  const { streamers } = useStreamersStore()
  const { recordings, activeIds, stop: stopRecording, load: reloadRecordings } = useRecordingsStore()
  const storagePath = useSettingsStore(s => s.settings.storagePath as string | undefined)
  const [stats, setStats] = useState({ total: 0, active: 0, failed: 0, total_duration: 0, last_24h: 0 })
  const { data: disk } = useDiskSpace(storagePath)
  const [elapsed, setElapsed] = useState<Record<number, string>>({})
  const statsGridRef = useRef<HTMLDivElement>(null)
  const recListRef = useRef<HTMLDivElement>(null)
  const prevActiveSize = useRef(0)
  const fadeSlideScope = useRef<ReturnType<typeof createScope> | null>(null)

  function refreshStats() {
    window.electronAPI.recordingsGetStats().then(setStats)
  }

  useEffect(() => {
    refreshStats()
  }, [])

  // Refresh stats when recordings list changes (completed/failed events update it)
  useEffect(() => {
    refreshStats()
  }, [recordings.length])

  // Stagger stat cards in on mount
  useEffect(() => {
    if (!statsGridRef.current) return
    const scope = createScope({ root: statsGridRef.current })
    scope.add(() => staggerIn('.stat-card', { distance: 12, delay: 60 }))
    return () => scope.revert()
  }, [])

  // Animate new recording rows sliding in when activeIds grows
  useEffect(() => {
    const newSize = activeIds.size
    if (newSize > prevActiveSize.current && recListRef.current) {
      const rows = recListRef.current.querySelectorAll('.db-rec-row')
      const newRow = rows[rows.length - 1]
      if (newRow) {
        fadeSlideScope.current?.revert()
        fadeSlideScope.current = createScope({ root: recListRef.current })
        fadeSlideScope.current.add(() => fadeSlideIn(newRow))
      }
    }
    prevActiveSize.current = newSize
  }, [activeIds])

  useEffect(() => {
    if (activeIds.size === 0) return
    const timer = setInterval(() => {
      const newElapsed: Record<number, string> = {}
      for (const rec of recordings) {
        if (activeIds.has(rec.id)) {
          newElapsed[rec.id] = formatElapsed(rec.started_at)
        }
      }
      setElapsed(newElapsed)
    }, 1000)
    return () => clearInterval(timer)
  }, [activeIds, recordings])

  async function handleClearFailed() {
    if (!confirm('Delete all failed recordings and their files?')) return
    await window.electronAPI.recordingsClearFailed()
    reloadRecordings()
    refreshStats()
  }

  const activeRecordings = recordings.filter(r => activeIds.has(r.id))
  const totalWatchHours = Math.floor(stats.total_duration / 3600)

  // Disk bar
  const diskUsed = disk ? disk.total - disk.free : 0
  const diskPct = disk ? (diskUsed / disk.total) * 100 : 0
  const diskColor = diskPct > 90 ? 'var(--accent)' : diskPct > 70 ? 'var(--warning)' : 'var(--success)'

  return (
    <div className="page">

      {/* ── Stats ───────────────────────────────── */}
      <div className="stats-grid" ref={statsGridRef}>
        <StatCard value={stats.total} label="Total Recordings" />
        <StatCard value={activeIds.size} label="Active Now" accent={activeIds.size > 0} />
        <StatCard value={streamers.length} label="Monitored" />
        <StatCard value={totalWatchHours} label="Archived (hrs)" />
        <StatCard
          value={stats.failed}
          label="Failed"
          accent={stats.failed > 0}
          action={stats.failed > 0 ? { label: 'Clear', onClick: handleClearFailed } : undefined}
        />
      </div>

      {/* ── 24h Activity + Disk ──────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24,
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-disabled)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{stats.last_24h}</span> stream{stats.last_24h !== 1 ? 's' : ''} recorded in the last 24h
          {' · '}
          <span style={{ color: activeIds.size > 0 ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 700 }}>
            {activeIds.size}
          </span> active now
        </span>

        {disk && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-disabled)', whiteSpace: 'nowrap' }}>
              {formatBytes(diskUsed)} / {formatBytes(disk.total)}
            </span>
            <div style={{
              width: 120, height: 5, borderRadius: 3,
              background: 'var(--surface-raised)',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${Math.min(diskPct, 100)}%`,
                height: '100%',
                background: diskColor,
                borderRadius: 3,
                transition: 'width 600ms ease, background 300ms',
              }} />
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: diskColor, fontWeight: 700 }}>
              {Math.round(diskPct)}%
            </span>
          </div>
        )}
      </div>

      {/* ── Currently Recording ─────────────────── */}
      {activeRecordings.length > 0 && (
        <div className="db-section">
          <div className="db-section-header">
            <span className="db-section-label">
              <span className="live-dot" />
              Currently Recording
            </span>
            <span className="db-section-count">{activeRecordings.length} active</span>
          </div>
          <div className="db-rec-list" ref={recListRef}>
            {activeRecordings.map(rec => {
              const thumb = fileUrl(rec.thumbnail_path)
              return (
                <div className="db-rec-row" key={rec.id}>
                  <div style={{
                    width: 80, height: 45, flexShrink: 0,
                    background: 'var(--surface-raised)',
                    overflow: 'hidden', borderRadius: 4, position: 'relative',
                  }}>
                    {thumb
                      ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="live-dot" />
                        </div>
                    }
                  </div>
                  <PlatformBadge platform={rec.platform} />
                  <div className="db-rec-row-info">
                    <span className="db-rec-row-name">{rec.streamer_name}</span>
                    <span className="db-rec-row-title">{rec.title ?? 'Live stream'}</span>
                  </div>
                  <span className="db-rec-row-timer">{elapsed[rec.id] ?? '0:00'}</span>
                  <button className="btn btn-danger btn-sm" style={{ gap: 6, alignItems: 'center' }} onClick={() => stopRecording(rec.id)}>
                    <Icon name="stop-circle-line" size={16} /> Stop
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  value: rawValue, label, accent, action
}: {
  value: number | null | undefined
  label: string
  accent?: boolean
  action?: { label: string; onClick: () => void }
}) {
  const value = rawValue ?? 0
  const valRef = useRef<HTMLDivElement>(null)
  const prevValue = useRef(-1)

  useEffect(() => {
    if (!valRef.current || value === prevValue.current) return
    prevValue.current = value
    countUp(valRef.current, value, 800)
  }, [value])

  return (
    <div className="stat-card" style={{ position: 'relative' }}>
      <div
        className="stat-value"
        ref={valRef}
        style={accent ? { color: 'var(--accent)' } : undefined}
      >
        {value.toLocaleString()}
      </div>
      <div className="stat-label">{label}</div>
      {action && (
        <button
          onClick={e => { e.stopPropagation(); action.onClick() }}
          style={{
            position: 'absolute', top: 12, right: 12,
            fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'var(--accent)', background: 'var(--accent-subtle)',
            border: '1px solid var(--accent)',
            borderRadius: 4, padding: '2px 8px', cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
