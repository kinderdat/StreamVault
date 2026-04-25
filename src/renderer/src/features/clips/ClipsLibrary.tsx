import { useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router'

import { Icon } from '@renderer/components/Icon'
import { PlatformBadge } from '@renderer/components/PlatformBadge'
import { useClipsStore } from '@renderer/stores/clipsStore'
import { usePlayerStore } from '@renderer/stores/playerStore'
import type { Clip } from '@renderer/types/domain'
import { staggerIn } from '@renderer/utils/anime'
import { fileUrl, formatDate, formatDuration } from '@renderer/utils/format'
import { createScope } from 'animejs'

import '../recordings/recording-cards.css'

export function ClipsLibrary() {
  const { clips, loading, load, remove } = useClipsStore()
  const loadPlayer = usePlayerStore((s) => s.load)
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const prevLen = useRef(-1)

  useEffect(() => {
    load()
  }, [])

  // Stagger cards after load
  useEffect(() => {
    if (loading || clips.length === 0) return
    if (clips.length === prevLen.current) return
    prevLen.current = clips.length
    const container = gridRef.current
    if (!container) return
    let scope: ReturnType<typeof createScope> | null = null
    const t = setTimeout(() => {
      scope = createScope({ root: container })
      scope.add(() => staggerIn(container.querySelectorAll('.clip-card'), { delay: 30, distance: 10 }))
    }, 30)
    return () => {
      clearTimeout(t)
      scope?.revert()
    }
  }, [clips.length, loading])

  const filtered = useMemo(() => {
    if (!search.trim()) return clips
    const q = search.toLowerCase()
    return clips.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.streamer_name?.toLowerCase().includes(q) ||
        c.recording_title?.toLowerCase().includes(q),
    )
  }, [clips, search])

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    if (!confirm('Delete this clip and its file?')) return
    setDeleting(id)
    try {
      await remove(id)
    } finally {
      setDeleting(null)
    }
  }

  function handlePlay(clip: Clip) {
    if (!clip.file_path && !clip.recording_file_path) return
    loadPlayer({
      id: clip.id,
      kind: 'clip',
      filePath: (clip.file_path ?? clip.recording_file_path)!,
      title: clip.title ?? `Clip — ${formatDuration(clip.start_secs)}`,
      durationSecs: clip.duration_secs,
      platform: clip.platform,
    })
    navigate('/player')
  }

  return (
    <div className="page">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 180, marginBottom: 0 }}>
          <Icon name="search-line" size={16} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          <input
            className="search-input"
            placeholder="Search clips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="count-label" style={{ marginBottom: 12 }}>
        {filtered.length} clip{filtered.length !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Icon name="scissors-2-line" size={20} className="empty-state-icon" />
          <h3>No clips yet</h3>
          <p>Open a recording in the Player tab and use the Clip button to create clips.</p>
        </div>
      ) : (
        <div ref={gridRef} className="recordings-grid clips-grid">
          {filtered.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              deleting={deleting === clip.id}
              onPlay={() => handlePlay(clip)}
              onOpenFolder={() => {
                if (clip.file_path) window.electronAPI.clipsOpenFolder(clip.file_path)
              }}
              onDelete={(e) => handleDelete(e, clip.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClipCard({
  clip,
  deleting,
  onPlay,
  onOpenFolder,
  onDelete,
}: {
  clip: Clip
  deleting: boolean
  onPlay: () => void
  onOpenFolder: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const thumb = fileUrl(clip.thumbnail_path)

  return (
    <div className="recording-card clip-card" onClick={onPlay} style={{ cursor: 'pointer' }}>
      <div className="recording-card-thumb">
        {thumb ? (
          <img src={thumb} alt={clip.title ?? ''} loading="lazy" />
        ) : (
          <div className="recording-card-thumb-placeholder">
            <Icon name="scissors-2-line" size={20} />
          </div>
        )}
        <div className="recording-card-overlay">
          <PlatformBadge platform={clip.platform} />
        </div>
        {clip.duration_secs && (
          <div className="recording-card-duration">{formatDuration(clip.duration_secs)}</div>
        )}
      </div>
      <div className="recording-card-body">
        <div className="recording-card-title">{clip.title ?? 'Untitled clip'}</div>
        <div className="recording-card-meta">
          <span className="recording-card-streamer">{clip.streamer_name}</span>
          {clip.recording_title && <span className="clip-recording-ref">{clip.recording_title}</span>}
          <span className="recording-card-date">{formatDate(clip.created_at)}</span>
        </div>
        {/* Action row */}
        <div className="clip-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-ghost btn-sm clip-card-play" onClick={onPlay} title="Play">
            <Icon name="play-fill" size={16} /> Play
          </button>
          {clip.file_path && (
            <button
              className="btn btn-ghost btn-sm clip-card-icon"
              onClick={onOpenFolder}
              title="Open folder"
            >
              <Icon name="folder-open-line" size={16} />
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm clip-card-icon clip-card-delete"
            onClick={onDelete}
            disabled={deleting}
            title="Delete"
          >
            <Icon name="delete-bin-line" size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
