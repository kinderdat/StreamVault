import { useRef, useState, useEffect } from 'react'
import { createScope } from 'animejs'
import { staggerIn } from '../utils/anime'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FolderOpen, Trash2, StopCircle } from 'lucide-react'
import { PlatformBadge } from '../components/PlatformBadge'
import { ProcessingBars } from '../components/ProcessingBars'
import { formatDuration, formatBytes, formatDateTime, fileUrl } from '../utils/format'
import { useRecordingsStore } from '../stores/recordingsStore'
import type { Recording } from '../types/domain'

export function RecordingDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const metaGridRef = useRef<HTMLDivElement>(null)

  const stopRecording = useRecordingsStore(s => s.stop)
  const [stopping, setStopping] = useState(false)

  const { data: recording, isLoading: loadingRec } = useQuery<Recording>({
    queryKey: ['recording', id],
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
    let tries = 0
    const poll = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['recording', String(id)] })
      if (++tries >= 10) clearInterval(poll)
    }, 1000)
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

  return (
    <div className="page">
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" style={{ padding: '6px 10px' }} onClick={() => navigate('/recordings')}>
          <ArrowLeft size={14} /> Back
        </button>
        <PlatformBadge platform={recording.platform} size="md" />
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 700, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-display)' }}>
          {recording.title ?? 'Untitled stream'}
        </span>
        {recording.status === 'recording' && <span className="badge badge-rec">● REC</span>}
        {isActive && (
          <button className="btn btn-danger" onClick={handleStop} disabled={stopping} style={{ gap: 6 }}>
            <StopCircle size={14} />
            {stopping ? 'Stopping…' : 'Stop Recording'}
          </button>
        )}
        <button
          className="btn btn-ghost"
          onClick={() => recording.file_path && window.electronAPI.recordingsOpenFolder(recording.file_path)}
        >
          <FolderOpen size={13} /> Open Folder
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          <Trash2 size={13} /> Delete
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
          ['Platform',   recording.platform],
          ['Date',       formatDateTime(recording.stream_date)],
          ['Duration',   elapsed !== null ? `${formatDuration(elapsed)} ●` : formatDuration(recording.duration_secs)],
          ['File Size',  formatBytes(recording.file_size_bytes) + (isActive ? ' (growing)' : '')],
          ['Resolution', recording.resolution ?? '—'],
          ['Video',      recording.video_codec?.toUpperCase() ?? (isActive ? 'recording...' : '—')],
          ['Audio',      recording.audio_codec?.toUpperCase() ?? (isActive ? 'recording...' : '—')],
          ['FPS',        recording.fps ? `${recording.fps} fps` : '—'],
          ['Language',   recording.language ?? '—'],
          ['Viewers',    recording.viewer_count?.toLocaleString() ?? '—'],
          ['Category',   recording.category ?? '—'],
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
    </div>
  )
}
