import { useEffect, useRef, useState } from 'react'

import { useDiskSpace } from '../../hooks/useDiskSpace'
import { useRecordingsStore } from '../../stores/recordingsStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { formatBytes } from '../../utils/format'
import './telemetry-bar.css'

export function TelemetryBar() {
  const activeIds = useRecordingsStore((s) => s.activeIds)
  const recordings = useRecordingsStore((s) => s.recordings)
  const storagePath = useSettingsStore((s) => s.settings.storagePath as string | undefined)

  const { data: disk } = useDiskSpace(storagePath)
  const [bitrate, setBitrate] = useState(0)
  const prevSizes = useRef<Map<number, number>>(new Map())
  const prevTick = useRef(Date.now())
  const smoothedBitrate = useRef(0)

  useEffect(() => {
    if (activeIds.size === 0) {
      setBitrate(0)
      smoothedBitrate.current = 0
      prevSizes.current.clear()
      return
    }
    const activeRecs = recordings.filter((r) => activeIds.has(r.id))
    const now = Date.now()
    const dt = (now - prevTick.current) / 1000
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
      const raw = Math.round((deltaBytes * 8) / dt / 1000)
      smoothedBitrate.current = smoothedBitrate.current * 0.7 + raw * 0.3
      setBitrate(Math.round(smoothedBitrate.current))
    }
  }, [recordings, activeIds])

  const isActive = activeIds.size > 0
  const diskPct = disk ? ((disk.total - disk.free) / disk.total) * 100 : null
  const diskColor =
    diskPct !== null
      ? diskPct > 90
        ? 'var(--danger)'
        : diskPct > 70
          ? 'var(--warning)'
          : 'var(--success)'
      : 'var(--text-disabled)'

  return (
    <div className="telemetry-bar" role="status" aria-live="polite">
      <div className="telemetry-bar__inner">
        {isActive ? (
          <>
            <div className="telemetry-bar__rec">
              <span className="telemetry-bar__dot" aria-hidden />
              <span className="telemetry-bar__rec-count">{activeIds.size}</span>
              <span className="telemetry-bar__rec-label">REC</span>
            </div>
            {bitrate > 0 && (
              <span className="telemetry-bar__stat telemetry-bar__stat--bitrate">
                {bitrate > 1000 ? `${(bitrate / 1000).toFixed(1)} Mb/s` : `${bitrate} kb/s`}
              </span>
            )}
            {disk && (
              <span className="telemetry-bar__stat" style={{ color: diskColor }}>
                {formatBytes(disk.free)}
              </span>
            )}
            <span className="telemetry-bar__stat telemetry-bar__stat--muted">
              {activeIds.size} stream{activeIds.size > 1 ? 's' : ''}
            </span>
          </>
        ) : (
          <>
            <span className="telemetry-bar__stat telemetry-bar__stat--muted telemetry-bar__idle-anchor">Idle</span>
            {disk && (
              <span className="telemetry-bar__stat" style={{ color: diskColor }}>
                {formatBytes(disk.free)} free
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
