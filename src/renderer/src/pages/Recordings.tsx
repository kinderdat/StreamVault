import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { animate } from 'animejs'
import { Search, Grid, List, Video, Play, FolderOpen, Trash2, ChevronDown } from 'lucide-react'
import { useRecordingsStore } from '../stores/recordingsStore'
import { PlatformBadge } from '../components/PlatformBadge'
import { RSelect, ROption } from '../components/RSelect'
import { formatDuration, formatBytes, formatDate, formatDateTime, fileUrl } from '../utils/format'
import { staggerIn, accordionOpen, accordionClose } from '../utils/anime'
import type { Recording } from '../types/domain'

export function Recordings() {
  const { recordings, activeIds, delete: deleteRec } = useRecordingsStore()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState<'grid' | 'list'>('list')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const prevFilterKey = useRef('')

  const platforms = useMemo(() => {
    const set = new Set(recordings.map(r => r.platform))
    return Array.from(set)
  }, [recordings])

  const filtered = useMemo(() => {
    let result = recordings
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.title?.toLowerCase().includes(q) ||
        r.streamer_name?.toLowerCase().includes(q)
      )
    }
    if (platformFilter !== 'all') result = result.filter(r => r.platform === platformFilter)
    if (statusFilter !== 'all') result = result.filter(r => r.status === statusFilter)

    return [...result].sort((a, b) => {
      if (sort === 'newest') return b.stream_date - a.stream_date
      if (sort === 'oldest') return a.stream_date - b.stream_date
      if (sort === 'largest') return (b.file_size_bytes ?? 0) - (a.file_size_bytes ?? 0)
      if (sort === 'longest') return (b.duration_secs ?? 0) - (a.duration_secs ?? 0)
      return 0
    })
  }, [recordings, search, platformFilter, statusFilter, sort])

  // Stagger cards when filter results change or view switches
  const filterKey = `${view}-${filtered.length}-${search}-${platformFilter}-${statusFilter}`
  useEffect(() => {
    if (filterKey === prevFilterKey.current) return
    prevFilterKey.current = filterKey
    if (filtered.length === 0) return
    const container = view === 'grid' ? gridRef.current : listRef.current
    if (!container) return
    const selector = view === 'grid' ? '.recording-card' : '.recording-row'
    // Small delay so DOM has rendered
    const t = setTimeout(() => staggerIn(container.querySelectorAll(selector), { delay: 35, distance: 10 }), 30)
    return () => clearTimeout(t)
  }, [filterKey])

  async function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation()
    if (!confirm('Delete this recording and its file?')) return
    setDeleting(id)
    try { await deleteRec(id) } finally { setDeleting(null) }
  }

  return (
    <div className="page">
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 200, marginBottom: 0 }}>
          <Search size={14} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
          <input className="search-input" placeholder="Search recordings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <RSelect value={platformFilter} onValueChange={setPlatformFilter} minWidth={150}>
          <ROption value="all">All Platforms</ROption>
          {platforms.map(p => <ROption key={p} value={p}>{p}</ROption>)}
        </RSelect>
        <RSelect value={statusFilter} onValueChange={setStatusFilter} minWidth={140}>
          <ROption value="all">All Status</ROption>
          <ROption value="recording">Recording</ROption>
          <ROption value="completed">Completed</ROption>
          <ROption value="failed">Failed</ROption>
        </RSelect>
        <RSelect value={sort} onValueChange={setSort} minWidth={150}>
          <ROption value="newest">Newest First</ROption>
          <ROption value="oldest">Oldest First</ROption>
          <ROption value="largest">Largest</ROption>
          <ROption value="longest">Longest</ROption>
        </RSelect>
        <div className="view-toggle">
          <button className={`view-toggle-btn ${view === 'grid' ? 'active' : ''}`} onClick={() => setView('grid')} title="Grid view">
            <Grid size={14} />
          </button>
          <button className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`} onClick={() => setView('list')} title="List view">
            <List size={14} />
          </button>
        </div>
      </div>

      <div className="count-label" style={{ marginBottom: 12 }}>
        {filtered.length} recording{filtered.length !== 1 ? 's' : ''}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <Video size={40} className="empty-state-icon" />
          <h3>No recordings</h3>
          <p>Add streamers to the monitor and recordings will appear here automatically.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="recordings-grid" ref={gridRef}>
          {filtered.map(rec => (
            <GridCard key={rec.id} rec={rec} isActive={activeIds.has(rec.id)}
              onOpen={() => navigate(`/recordings/${rec.id}`)}
              onDelete={e => handleDelete(e, rec.id)}
              deleting={deleting === rec.id}
            />
          ))}
        </div>
      ) : (
        <div className="recordings-list" ref={listRef}>
          {filtered.map(rec => (
            <ListRow key={rec.id} rec={rec} isActive={activeIds.has(rec.id)}
              expanded={expandedId === rec.id}
              onToggleExpand={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
              onOpen={() => navigate(`/recordings/${rec.id}`)}
              onDelete={e => handleDelete(e, rec.id)}
              onOpenFolder={e => { e.stopPropagation(); if (rec.file_path) window.electronAPI.recordingsOpenFolder(rec.file_path) }}
              deleting={deleting === rec.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GridCard({ rec, isActive, onOpen, onDelete, deleting }: {
  rec: Recording; isActive: boolean
  onOpen: () => void; onDelete: (e: React.MouseEvent) => void; deleting: boolean
}) {
  const thumb = fileUrl(rec.thumbnail_path)
  return (
    <div className="recording-card" onClick={onOpen}>
      <div className="recording-card-thumb">
        {thumb ? <img src={thumb} alt={rec.title ?? ''} loading="lazy" /> : (
          <div className="recording-card-thumb-placeholder"><Video size={32} /></div>
        )}
        <div className="recording-card-overlay">
          <PlatformBadge platform={rec.platform} />
          {isActive ? <span className="badge badge-rec">REC</span> : null}
        </div>
        {rec.duration_secs && (
          <div className="recording-card-duration">{formatDuration(rec.duration_secs)}</div>
        )}
      </div>
      <div className="recording-card-body">
        <div className="recording-card-title">{rec.title ?? 'Untitled stream'}</div>
        <div className="recording-card-meta">
          <span className="recording-card-streamer">{rec.streamer_name}</span>
          {rec.category && <span className="badge badge-neutral" style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.category}</span>}
          {rec.resolution && <span className="badge badge-neutral">{rec.resolution.split('x')[1]}p</span>}
          <span style={{ fontSize: 11, color: 'var(--text-disabled)', marginLeft: 'auto' }}>{formatDate(rec.stream_date)}</span>
        </div>
      </div>
    </div>
  )
}

function ListRow({ rec, isActive, expanded, onToggleExpand, onOpen, onDelete, onOpenFolder, deleting }: {
  rec: Recording; isActive: boolean; expanded: boolean
  onToggleExpand: () => void; onOpen: () => void
  onDelete: (e: React.MouseEvent) => void; onOpenFolder: (e: React.MouseEvent) => void; deleting: boolean
}) {
  const thumb = fileUrl(rec.thumbnail_path)
  const accordionRef = useRef<HTMLDivElement>(null)
  const chevronRef = useRef<HTMLDivElement>(null)
  const isFirstRender = useRef(true)

  // Accordion + chevron animation on expand/collapse
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
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
    <div>
      <div className="recording-row" onClick={onToggleExpand}>
        <div className="recording-row-thumb">
          {thumb ? <img src={thumb} alt="" loading="lazy" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-disabled)' }}><Video size={18} /></div>}
        </div>
        <div className="recording-row-info">
          <div className="recording-row-title">{rec.title ?? 'Untitled stream'}</div>
          <div className="recording-row-sub">
            <PlatformBadge platform={rec.platform} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{rec.streamer_name}</span>
            {rec.duration_secs && <span className="badge badge-neutral">{formatDuration(rec.duration_secs)}</span>}
            {rec.resolution && <span className="badge badge-neutral">{rec.resolution.split('x')[1]}p</span>}
            {rec.video_codec && <span className="badge badge-neutral">{rec.video_codec.toUpperCase()}</span>}
            {rec.file_size_bytes && <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{formatBytes(rec.file_size_bytes)}</span>}
            <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{formatDate(rec.stream_date)}</span>
            {isActive && <span className="badge badge-rec">REC</span>}
            {rec.status === 'failed' && <span className="badge badge-failed">FAILED</span>}
          </div>
        </div>
        <div className="recording-row-actions" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onOpen} title="View details">
            <Play size={13} />
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px' }} onClick={onOpenFolder} title="Open folder">
            <FolderOpen size={13} />
          </button>
          <button className="btn btn-ghost" style={{ padding: '4px 8px', color: 'var(--accent)' }} onClick={onDelete} disabled={deleting} title="Delete">
            <Trash2 size={13} />
          </button>
          <div ref={chevronRef} style={{ color: 'var(--text-disabled)', display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* Accordion — always in DOM, animated open/close */}
      <div
        ref={accordionRef}
        className="accordion-content"
        style={{ height: 0, overflow: 'hidden', opacity: 0, display: expanded ? 'block' : 'none' }}
      >
        <div className="accordion-field"><label>Date</label><span>{formatDateTime(rec.stream_date)}</span></div>
        <div className="accordion-field"><label>Duration</label><span>{formatDuration(rec.duration_secs)}</span></div>
        <div className="accordion-field"><label>File Size</label><span>{formatBytes(rec.file_size_bytes)}</span></div>
        <div className="accordion-field"><label>Resolution</label><span>{rec.resolution ?? '--'}</span></div>
        <div className="accordion-field"><label>Video Codec</label><span>{rec.video_codec?.toUpperCase() ?? '--'}</span></div>
        <div className="accordion-field"><label>Audio Codec</label><span>{rec.audio_codec?.toUpperCase() ?? '--'}</span></div>
        <div className="accordion-field"><label>FPS</label><span>{rec.fps ? `${rec.fps}fps` : '--'}</span></div>
        <div className="accordion-field"><label>Language</label><span>{rec.language ?? '--'}</span></div>
        <div className="accordion-field"><label>Viewers</label><span>{rec.viewer_count?.toLocaleString() ?? '--'}</span></div>
        {rec.category && <div className="accordion-field"><label>Category</label><span>{rec.category}</span></div>}
      </div>
    </div>
  )
}
