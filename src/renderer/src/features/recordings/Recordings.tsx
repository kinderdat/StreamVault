import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router'

import { Icon } from '@renderer/components/Icon'
import { PlatformBadge } from '@renderer/components/PlatformBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { usePlayerStore } from '@renderer/stores/playerStore'
import { useRecordingsStore } from '@renderer/stores/recordingsStore'
import type { Recording } from '@renderer/types/domain'
import { accordionClose, accordionOpen, staggerIn } from '@renderer/utils/anime'
import { fileUrl, formatBytes, formatDate, formatDateTime, formatDuration } from '@renderer/utils/format'
import { animate, createScope } from 'animejs'

import './recording-cards.css'
import './recordings.css'

function InlineSelect({
  value,
  onValueChange,
  children,
  minWidth = 140,
}: {
  value: string
  onValueChange: (v: string) => void
  children: React.ReactNode
  minWidth?: number
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="inline-select-trigger" style={{ minWidth }}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className="inline-select-content">
        {children}
      </SelectContent>
    </Select>
  )
}

function InlineOption({ value, children }: { value: string; children: React.ReactNode }) {
  return <SelectItem value={value}>{children}</SelectItem>
}

export function Recordings() {
  const { recordings, activeIds, loading, delete: deleteRec } = useRecordingsStore()
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [groupBy, setGroupBy] = useState<'none' | 'platform' | 'streamer'>('none')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevFilterKey = useRef('')

  const platforms = useMemo(() => {
    const set = new Set(recordings.map((r) => r.platform))
    return Array.from(set)
  }, [recordings])

  const filtered = useMemo(() => {
    let result = recordings
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) => r.title?.toLowerCase().includes(q) || r.streamer_name?.toLowerCase().includes(q),
      )
    }
    if (platformFilter !== 'all') result = result.filter((r) => r.platform === platformFilter)
    if (statusFilter !== 'all') result = result.filter((r) => r.status === statusFilter)

    return [...result].sort((a, b) => {
      if (sort === 'newest') return b.stream_date - a.stream_date
      if (sort === 'oldest') return a.stream_date - b.stream_date
      if (sort === 'largest') return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0)
      if (sort === 'longest') return (b.duration_secs ?? 0) - (a.duration_secs ?? 0)
      if (sort === 'title_az') return (a.title ?? '').localeCompare(b.title ?? '')
      if (sort === 'streamer_az') return (a.streamer_name ?? '').localeCompare(b.streamer_name ?? '')
      if (sort === 'platform_az') return (a.platform ?? '').localeCompare(b.platform ?? '')
      if (sort === 'status') return (a.status ?? '').localeCompare(b.status ?? '')
      if (sort === 'duration') return (b.duration_secs ?? 0) - (a.duration_secs ?? 0)
      if (sort === 'size') return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0)
      return 0
    })
  }, [recordings, search, platformFilter, statusFilter, sort])

  const grouped = useMemo(() => {
    if (groupBy === 'none') return null
    const map = new Map<string, Recording[]>()
    for (const rec of filtered) {
      const key = groupBy === 'platform' ? rec.platform || 'Unknown' : rec.streamer_name || 'Unknown'
      const list = map.get(key)
      if (list) list.push(rec)
      else map.set(key, [rec])
    }
    const keys = Array.from(map.keys()).sort((a, b) => a.localeCompare(b))
    return keys.map((k) => ({ key: k, items: map.get(k)! }))
  }, [filtered, groupBy])

  // Stagger cards when filter results change or view switches
  const filterKey = `${view}-${filtered.length}-${search}-${platformFilter}-${statusFilter}`
  useEffect(() => {
    if (filterKey === prevFilterKey.current) return
    prevFilterKey.current = filterKey
    if (filtered.length === 0) return
    const container = view === 'grid' ? gridRef.current : listRef.current
    if (!container) return
    const selector = view === 'grid' ? '.recording-card' : '.recording-row'
    let scope: ReturnType<typeof createScope> | null = null
    const t = setTimeout(() => {
      scope = createScope({ root: container })
      scope.add(() => staggerIn(container.querySelectorAll(selector), { delay: 35, distance: 10 }))
    }, 30)
    return () => {
      clearTimeout(t)
      scope?.revert()
    }
  }, [filterKey])

  async function handleDelete(id: number) {
    if (!confirm('Delete this recording and its file?')) return
    setDeleting(id)
    try {
      await deleteRec(id)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="page">
      {/* Toolbar */}
      <div className="recordings-toolbar">
        <div className="recordings-toolbar-row recordings-toolbar-row--top">
          <div className="search-bar" style={{ marginBottom: 0 }}>
            <Icon name="search-line" size={16} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
            <input
              className="search-input"
              placeholder="Search recordings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <Icon name="layout-grid-line" size={16} />
            </button>
            <button
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              <Icon name="list-unordered" size={16} />
            </button>
          </div>
        </div>
        <div className="recordings-toolbar-row recordings-toolbar-row--filters">
          <InlineSelect
            value={groupBy}
            onValueChange={(v) => setGroupBy(v as 'none' | 'platform' | 'streamer')}
            minWidth={170}
          >
            <InlineOption value="none">No Grouping</InlineOption>
            <InlineOption value="platform">Group by Platform</InlineOption>
            <InlineOption value="streamer">Group by Streamer</InlineOption>
          </InlineSelect>
          <InlineSelect value={platformFilter} onValueChange={setPlatformFilter} minWidth={150}>
            <InlineOption value="all">All Platforms</InlineOption>
            {platforms.map((p) => (
              <InlineOption key={p} value={p}>
                {p}
              </InlineOption>
            ))}
          </InlineSelect>
          <InlineSelect value={statusFilter} onValueChange={setStatusFilter} minWidth={140}>
            <InlineOption value="all">All Status</InlineOption>
            <InlineOption value="recording">Recording</InlineOption>
            <InlineOption value="completed">Completed</InlineOption>
            <InlineOption value="failed">Failed</InlineOption>
          </InlineSelect>
          <InlineSelect value={sort} onValueChange={setSort} minWidth={150}>
            <InlineOption value="newest">Newest First</InlineOption>
            <InlineOption value="oldest">Oldest First</InlineOption>
            <InlineOption value="title_az">A–Z Title</InlineOption>
            <InlineOption value="streamer_az">Streamer</InlineOption>
            <InlineOption value="platform_az">Platform</InlineOption>
            <InlineOption value="status">Status</InlineOption>
            <InlineOption value="duration">Duration</InlineOption>
            <InlineOption value="size">Size</InlineOption>
          </InlineSelect>
        </div>
      </div>

      <div className="count-label" style={{ marginBottom: 12 }}>
        {filtered.length} recording{filtered.length !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div className="recordings-list" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Icon name="video-line" size={20} className="empty-state-icon" />
          <h3>No recordings</h3>
          <p>Add streamers to the monitor and recordings will appear here automatically.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="recordings-grid" ref={gridRef}>
          {filtered.map((rec) => (
            <GridCard key={rec.id} rec={rec} isActive={activeIds.has(rec.id)} />
          ))}
        </div>
      ) : (
        <div className="recordings-list" ref={listRef}>
          {(grouped ?? [{ key: '', items: filtered }]).map((group) => (
            <div key={group.key || 'all'} className="recordings-group">
              {grouped ? (
                <div className="recordings-group-head">
                  <span className="recordings-group-title">{group.key}</span>
                  <span className="recordings-group-count">{group.items.length}</span>
                </div>
              ) : null}
              <div className="recordings-group-list">
                {group.items.map((rec) => (
                  <ListRow
                    key={rec.id}
                    rec={rec}
                    isActive={activeIds.has(rec.id)}
                    expanded={expandedId === rec.id}
                    onToggleExpand={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                    onDelete={() => handleDelete(rec.id)}
                    deleting={deleting === rec.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GridCard({
  rec,
  isActive,
}: {
  rec: Recording
  isActive: boolean
}) {
  const thumb = fileUrl(rec.thumbnail_path)
  const navigate = useNavigate()
  const loadPlayer = usePlayerStore((s) => s.load)

  function play() {
    if (!rec.file_path) return
    loadPlayer({
      id: rec.id,
      kind: 'recording',
      filePath: rec.file_path,
      title: rec.title ?? 'Untitled stream',
      durationSecs: rec.duration_secs,
      platform: rec.platform,
    })
    navigate('/player')
  }

  return (
    <div className="recording-card" onClick={play}>
      <div className="recording-card-thumb">
        {thumb ? (
          <img src={thumb} alt={rec.title ?? ''} loading="lazy" />
        ) : (
          <div className="recording-card-thumb-placeholder">
            <Icon name="video-line" size={20} />
          </div>
        )}
        <div className="recording-card-overlay">
          <PlatformBadge platform={rec.platform} />
          {isActive ? <span className="badge badge-rec recording-live-badge">REC</span> : null}
        </div>
        {rec.file_path && !isActive && (
          <button
            className="card-play-btn"
            onClick={(e) => {
              e.stopPropagation()
              play()
            }}
            title="Play in player"
          >
            <Icon name="play-circle-fill" size={20} />
          </button>
        )}
        {rec.duration_secs && (
          <div className="recording-card-duration">{formatDuration(rec.duration_secs)}</div>
        )}
      </div>
      <div className="recording-card-body">
        <div className="recording-card-title">{rec.title ?? 'Untitled stream'}</div>
        <div className="recording-card-meta">
          <span className="recording-card-streamer recording-streamer-fancy">{rec.streamer_name}</span>
          <span
            className={`badge ${rec.status === 'failed' ? 'badge-failed' : isActive ? 'badge-rec' : 'badge-completed'}`}
          >
            {rec.status === 'failed' ? 'FAILED' : isActive ? 'REC' : 'SAVED'}
          </span>
        </div>
        <div className="recording-card-stats">
          {rec.duration_secs && (
            <span className="badge badge-neutral">{formatDuration(rec.duration_secs)}</span>
          )}
          {rec.resolution && <span className="badge badge-neutral">{rec.resolution.split('x')[1]}p</span>}
          {rec.video_codec && <span className="badge badge-neutral">{rec.video_codec.toUpperCase()}</span>}
          {rec.file_size_bytes && (
            <span className="badge badge-neutral">{formatBytes(rec.file_size_bytes)}</span>
          )}
          {rec.category && (
            <span className="badge badge-neutral recording-card-category">{rec.category}</span>
          )}
          <span className="recording-card-date">{formatDate(rec.stream_date)}</span>
        </div>
      </div>
    </div>
  )
}

function ListRow({
  rec,
  isActive,
  expanded,
  onToggleExpand,
  onDelete,
  deleting,
}: {
  rec: Recording
  isActive: boolean
  expanded: boolean
  onToggleExpand: () => void
  onDelete: () => void
  deleting: boolean
}) {
  const navigate = useNavigate()
  const loadPlayer = usePlayerStore((s) => s.load)

  function play() {
    if (!rec.file_path) return
    loadPlayer({
      id: rec.id,
      kind: 'recording',
      filePath: rec.file_path,
      title: rec.title ?? 'Untitled stream',
      durationSecs: rec.duration_secs,
      platform: rec.platform,
    })
    navigate('/player')
  }
  const thumb = fileUrl(rec.thumbnail_path)
  const accordionRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)
  const normalizedCategory = rec.category?.trim() || 'Uncategorized'
  const normalizedViewers = rec.viewer_count != null ? rec.viewer_count.toLocaleString() : 'Not captured'

  // Set initial collapsed state imperatively so React's style prop never owns
  // display/height/opacity — those are managed entirely by accordionOpen/accordionClose.
  useLayoutEffect(() => {
    const el = accordionRef.current
    if (el) {
      el.style.display = 'none'
      el.style.height = '0'
      el.style.opacity = '0'
    }
  }, [])

  // Accordion + chevron animation on expand/collapse
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const el = accordionRef.current
    const chev = chevronRef.current
    if (!el) return

    if (expanded) {
      accordionOpen(el)
    } else {
      accordionClose(el)
    }
    if (chev) {
      animate(chev, {
        rotate: expanded ? 180 : 0,
        duration: 220,
        ease: 'outCubic',
      })
    }
  }, [expanded])

  return (
    <div className={`recording-row-shell ${expanded ? 'is-expanded' : ''}`}>
      <div className={`recording-row-card ${expanded ? 'is-expanded' : ''}`} onClick={onToggleExpand}>
        <div className="recording-row-thumb">
          {thumb ? (
            <img src={thumb} alt="" loading="lazy" />
          ) : (
            <div className="recording-row-thumb-placeholder">
              <Icon name="video-line" size={16} />
            </div>
          )}
          {isActive ? <span className="recording-row-rec">REC</span> : null}
        </div>

        <div className="recording-row-info">
          <div className="recording-row-title">{rec.title ?? 'Untitled stream'}</div>
          <div className="recording-row-sub">
            <PlatformBadge platform={rec.platform} />
            <span className="recording-streamer-fancy recording-row-streamer">{rec.streamer_name}</span>
            <span className="recording-row-dot" aria-hidden />
            <span className="recording-row-date">{formatDate(rec.stream_date)}</span>
            {rec.status === 'failed' ? <span className="badge badge-failed">FAILED</span> : null}
          </div>

          <div className="recording-row-stats">
            {rec.duration_secs && (
              <span className="badge badge-neutral">{formatDuration(rec.duration_secs)}</span>
            )}
            {rec.resolution && <span className="badge badge-neutral">{rec.resolution.split('x')[1]}p</span>}
            {rec.video_codec && <span className="badge badge-neutral">{rec.video_codec.toUpperCase()}</span>}
            {rec.file_size_bytes && (
              <span className="recording-row-mono">{formatBytes(rec.file_size_bytes)}</span>
            )}
            {rec.category && (
              <span className="badge badge-neutral recording-row-category">{rec.category}</span>
            )}
          </div>
        </div>

        <div className="recording-row-actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="recording-row-expand-btn"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand()
            }}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            aria-expanded={expanded}
          >
            <div ref={chevronRef} className="recording-row-chevron" aria-hidden>
              <Icon name="arrow-down-s-line" size={18} />
            </div>
          </button>
        </div>
      </div>

      {/* Accordion — always in DOM; display/height/opacity are managed by accordionOpen/Close */}
      <div ref={accordionRef} className="accordion-content">
        <div className="accordion-actions">
          <button className="btn btn-ghost btn-sm" onClick={play} disabled={!rec.file_path || isActive}>
            <Icon name="play-circle-line" size={16} />
            Play
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (rec.file_path) window.electronAPI.recordingsOpenFolder(rec.file_path)
            }}
            disabled={!rec.file_path}
          >
            <Icon name="folder-open-line" size={16} />
            Open Folder
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete} disabled={deleting}>
            <Icon name="delete-bin-line" size={16} />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        <div className="accordion-field">
          <label>Platform</label>
          <span>
            <PlatformBadge platform={rec.platform} />
          </span>
        </div>
        <div className="accordion-field">
          <label>Date</label>
          <span>{formatDateTime(rec.stream_date)}</span>
        </div>
        <div className="accordion-field">
          <label>Duration</label>
          <span>{formatDuration(rec.duration_secs)}</span>
        </div>
        <div className="accordion-field">
          <label>File Size</label>
          <span>{formatBytes(rec.file_size_bytes)}</span>
        </div>
        <div className="accordion-field">
          <label>Resolution</label>
          <span>{rec.resolution ?? '--'}</span>
        </div>
        <div className="accordion-field">
          <label>Video Codec</label>
          <span>{rec.video_codec?.toUpperCase() ?? '--'}</span>
        </div>
        <div className="accordion-field">
          <label>Audio Codec</label>
          <span>{rec.audio_codec?.toUpperCase() ?? '--'}</span>
        </div>
        <div className="accordion-field">
          <label>FPS</label>
          <span>{rec.fps ? `${rec.fps}fps` : '--'}</span>
        </div>
        <div className="accordion-field">
          <label>Viewers</label>
          <span>{normalizedViewers}</span>
        </div>
        <div className="accordion-field">
          <label>Category</label>
          <span>{normalizedCategory}</span>
        </div>
      </div>
    </div>
  )
}
