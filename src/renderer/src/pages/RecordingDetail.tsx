import { useRef, useState, useEffect } from 'react'
import { createScope } from 'animejs'
import { staggerIn } from '../utils/anime'
import { useParams, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { PlatformBadge } from '../components/PlatformBadge'
import { ProcessingBars } from '../components/ProcessingBars'
import { formatDuration, formatBytes, formatDateTime, formatDate, fileUrl } from '../utils/format'
import { useRecordingsStore } from '../stores/recordingsStore'
import { usePlayerStore } from '../stores/playerStore'
import type { Recording, Clip } from '../types/domain'
import { Icon } from '../components/Icon'

export const recordingQueryKey = (id: number | string) => ['recording', String(id)] as const

export function RecordingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const metaGridRef = useRef<HTMLDivElement>(null)

  const stopRecording = useRecordingsStore(s => s.stop)
  const loadPlayer    = usePlayerStore(s => s.load)
  const [stopping, setStopping] = useState(false)

  const { data: recording, isLoading: loadingRec } = useQuery<Recording>({
    queryKey: recordingQueryKey(id ?? ''),
    queryFn: () => window.electronAPI.recordingsGetById(Number(id)) as Promise<Recording>,
    enabled: !!id,
    staleTime: 0,
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return (s === 'recording' || s === 'processing') ? 3000 : false
    },
  })

  async function handleStop() {
    if (!recording || stopping) return
    setStopping(true)
    await stopRecording(recording.id)
    // useQuery's refetchInterval handles polling while status is 'recording'/'processing'
  }

  // ── Stagger metadata grid on mount ──
  useEffect(() => {
    if (!metaGridRef.current) return
    const scope = createScope({ root: metaGridRef.current })
    scope.add(() => staggerIn('.rec-detail-meta-cell', { delay: 30, distance: 8 }))
    return () => scope.revert()
  }, [id])

  // ── Live elapsed timer — hooks MUST be before any early returns ──
  const isActive = recording?.status === 'recording'
  const isProcessing = recording?.status === 'processing'

  useEffect(() => {
    if (!isActive) setStopping(false)
  }, [isActive])

  const [elapsed, setElapsed] = useState<number | null>(null)
  useEffect(() => {
    if (!isActive || !recording) { setElapsed(null); return }
    setElapsed(Math.floor((Date.now() - recording.started_at) / 1000))
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - recording.started_at) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [isActive, recording?.started_at])

  async function handleDelete() {
    if (!recording) return
    if (!confirm('Delete this recording and its file?')) return
    await window.electronAPI.recordingsDelete(recording.id)
    navigate('/recordings')
  }

  if (loadingRec) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  if (!recording) return (
    <div className="page"><div className="empty-state"><h3>Recording not found</h3></div></div>
  )

  const normalizedCategory = recording.category?.trim() || 'Uncategorized'
  const normalizedViewers = recording.viewer_count != null ? recording.viewer_count.toLocaleString() : 'Not captured'

  return (
    <div className="page">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate('/recordings')}>
          <Icon name="arrow-left-line" size={16} /> Back
        </button>
        <PlatformBadge platform={recording.platform} size="md" />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-display)' }}>
          {recording.title ?? 'Untitled stream'}
        </span>
        {recording.status === 'recording' && <span className="badge badge-rec">● REC</span>}
        {isActive && (
          <button className="btn btn-danger" onClick={handleStop} disabled={stopping} style={{ gap: 6 }}>
            <Icon name="stop-circle-line" size={16} />
            {stopping ? 'Stopping…' : 'Stop Recording'}
          </button>
        )}
        {recording.file_path && recording.status === 'completed' && (
          <button
            className="btn btn-primary"
            style={{ gap: 6 }}
            onClick={() => {
              loadPlayer({ id: recording.id, kind: 'recording', filePath: recording.file_path!, title: recording.title ?? 'Untitled stream', durationSecs: recording.duration_secs, platform: recording.platform })
              navigate('/player')
            }}
          >
            <Icon name="play-circle-line" size={16} /> Play
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => recording.file_path && window.electronAPI.recordingsOpenFolder(recording.file_path)}
        >
          <Icon name="folder-open-line" size={16} /> Open Folder
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          <Icon name="delete-bin-line" size={16} /> Delete
        </button>
      </div>

      {/* ── Preview area ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          aspectRatio: '16/9', background: '#000', borderRadius: 6,
          position: 'relative', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {recording.thumbnail_path && (
            <img
              src={fileUrl(recording.thumbnail_path)}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 0.4 : 1 }}
            />
          )}
          {(isActive || isProcessing) && (
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {isActive
                ? <><span className="badge badge-rec" style={{ fontSize: 12, padding: '4px 10px' }}><span className="live-dot" />REC</span>
                    <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-secondary)' }}>Recording in progress</span></>
                : <ProcessingBars label="Processing recording — will be available shortly" />
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Metadata grid ── */}
      <div ref={metaGridRef} className="rec-detail-meta-grid" style={{ marginBottom: 20 }}>
        {[
          ['Streamer',    recording.streamer_name],
          ['Platform',   <PlatformBadge key="platform-badge" platform={recording.platform} size="sm" />],
          ['Date',       formatDateTime(recording.stream_date)],
          ['Duration',   elapsed !== null ? `${formatDuration(elapsed)} ●` : formatDuration(recording.duration_secs)],
          ['File Size',  formatBytes(recording.file_size_bytes) + (isActive ? ' (growing)' : '')],
          ['Resolution', recording.resolution ?? '—'],
          ['Video',      recording.video_codec?.toUpperCase() ?? (isActive ? 'recording...' : '—')],
          ['Audio',      recording.audio_codec?.toUpperCase() ?? (isActive ? 'recording...' : '—')],
          ['FPS',        recording.fps ? `${recording.fps} fps` : '—'],
          ['Viewers',    normalizedViewers],
          ['Category',   normalizedCategory],
          ['Status',     recording.status],
        ].map(([label, value]) => (
          <div key={label} className="rec-detail-meta-cell">
            <label>{label}</label>
            <span style={label === 'Status' && (isActive || isProcessing) ? { color: 'var(--warning)', fontWeight: 700 } : undefined}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Clips section ── */}
      <ClipsSection recordingId={recording.id} recording={recording} />
    </div>
  )
}

function ClipsSection({ recordingId, recording }: { recordingId: number; recording: Recording }) {
  const loadPlayer = usePlayerStore(s => s.load)
  const navigate   = useNavigate()

  const { data: clipsData = [] } = useQuery<Clip[]>({
    queryKey: ['clips', 'recording', recordingId],
    queryFn: () => window.electronAPI.clipsGetByRecording(recordingId) as Promise<Clip[]>,
    staleTime: 10_000,
  })

  if (clipsData.length === 0) return null

  return (
    <div className="section" style={{ marginTop: 8 }}>
      <div className="section-header">
        <Icon name="scissors-2-line" size={16} />
        <span className="section-title">Clips ({clipsData.length})</span>
      </div>
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingTop: 12, paddingBottom: 4 }}>
        {clipsData.map(clip => {
          const thumb = fileUrl(clip.thumbnail_path)
          return (
            <div
              key={clip.id}
              style={{
                flexShrink: 0, width: 180, cursor: 'pointer',
                background: 'var(--surface)', borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--border)', overflow: 'hidden',
                transition: 'border-color 150ms',
              }}
              onClick={() => {
                const fp = clip.file_path ?? recording.file_path
                if (!fp) return
                loadPlayer({ id: clip.id, kind: 'clip', filePath: fp, title: clip.title ?? 'Clip', durationSecs: clip.duration_secs, platform: recording.platform })
                navigate('/player')
              }}
            >
              <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative', overflow: 'hidden' }}>
                {thumb
                  ? <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)' }}><Icon name="scissors-2-line" size={16} /></div>
                }
                {clip.duration_secs && (
                  <div style={{ position: 'absolute', bottom: 4, right: 6, background: 'rgba(0,0,0,0.8)', borderRadius: 3, padding: '1px 5px', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                    {formatDuration(clip.duration_secs)}
                  </div>
                )}
              </div>
              <div style={{ padding: '6px 8px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clip.title ?? 'Untitled clip'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 2 }}>
                  {formatDate(clip.created_at)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
