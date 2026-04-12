import { useRef, useState, useEffect } from 'react'
import { animate, createScope } from 'animejs'
import { RefreshCw, Plus, Radio, ExternalLink, Video, Link2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { staggerIn } from '../utils/anime'
import { useStreamersStore } from '../stores/streamersStore'
import { useRecordingsStore } from '../stores/recordingsStore'
import { PlatformBadge } from '../components/PlatformBadge'
import { formatDate } from '../utils/format'
import type { Streamer } from '../types/domain'

const platformColor: Record<string, string> = {
  twitch:      '#9146ff',
  kick:        '#53fc18',
  youtube:     '#ff0000',
  tiktok:      '#fe2c55',
  afreeca:     '#006aff',
  panda:       '#ff6600',
  flextv:      '#7c3aed',
  bilibili:    '#00a1d6',
  twitcasting: '#e04a2f',
  rumble:      '#85c742',
  douyin:      '#69c9d0',
}

/* ── Avatar ──────────────────────────────────────────────────── */
function AvatarImg({ streamer, size }: { streamer: Streamer; size: number }) {
  const [err, setErr] = useState(false)
  const initial = (streamer.display_name[0] ?? streamer.username[0] ?? '?').toUpperCase()
  const color = platformColor[streamer.platform] ?? 'var(--accent)'
  if (streamer.avatar_url && !err) {
    return <img src={streamer.avatar_url} alt={streamer.display_name} onError={() => setErr(true)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  }
  return <span style={{ fontFamily: 'var(--font-heading)', fontSize: size * 0.4, fontWeight: 800, color }}>{initial}</span>
}

/* ── Streamer card ────────────────────────────────────────────── */
function StreamerCard({
  streamer, isRecording, isChecking, onCheckNow, onToggle, onRemove,
}: {
  streamer: Streamer
  isRecording: boolean
  isChecking: boolean
  onCheckNow: () => void
  onToggle: (active: boolean) => void
  onRemove: () => void
}) {
  const navigate = useNavigate()
  const cardRef = useRef<HTMLDivElement>(null)
  const isActive = streamer.is_active === 1
  const accent = platformColor[streamer.platform] ?? 'var(--accent)'
  const [hovered, setHovered] = useState(false)

  // Anime.js hover micro-animations
  useEffect(() => {
    const card = cardRef.current
    if (!card) return
    const scope = createScope({ root: card })

    const onEnter = () => {
      setHovered(true)
      animate(card, { translateY: -5, duration: 240, ease: 'outBack(1.4)' })
      const ring = card.querySelector<HTMLElement>('.sc-avatar-ring')
      if (ring) animate(ring, { scale: 1.06, duration: 220, ease: 'outBack(2)' })
    }
    const onLeave = () => {
      setHovered(false)
      animate(card, { translateY: 0, duration: 200, ease: 'outCubic' })
      const ring = card.querySelector<HTMLElement>('.sc-avatar-ring')
      if (ring) animate(ring, { scale: 1, duration: 180, ease: 'outCubic' })
    }

    card.addEventListener('mouseenter', onEnter)
    card.addEventListener('mouseleave', onLeave)
    return () => {
      card.removeEventListener('mouseenter', onEnter)
      card.removeEventListener('mouseleave', onLeave)
      scope.revert()
    }
  }, [])

  const cardGlow = isRecording
    ? `0 0 0 1.5px ${accent}66, 0 10px 40px ${accent}30`
    : hovered
    ? '0 10px 36px rgba(0,0,0,0.55)'
    : '0 2px 10px rgba(0,0,0,0.25)'

  return (
    <div
      ref={cardRef}
      className="streamer-card-anim"
      style={{
        position: 'relative', isolation: 'isolate',
        background: 'var(--surface)',
        border: `1px solid ${isRecording ? `${accent}55` : hovered ? 'var(--border-visible)' : 'var(--border)'}`,
        borderRadius: 16, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: cardGlow,
        transition: 'border-color 200ms, box-shadow 200ms',
        opacity: isActive ? 1 : 0.65,
        willChange: 'transform',
      }}
    >
      {/* Blurred avatar background */}
      {streamer.avatar_url && (
        <div className="sc-bg-blur" style={{ backgroundImage: `url(${streamer.avatar_url})` }} />
      )}

      {/* Content — above the blur */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1 }}>

        {/* Remove button */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          title="Remove streamer"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 24, height: 24, borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-disabled)',
            cursor: 'pointer',
            transition: 'all 150ms',
            padding: 0, fontSize: 16, lineHeight: 1,
            backdropFilter: 'blur(4px)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--danger)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-disabled)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          ×
        </button>

        {/* Avatar + identity */}
        <div style={{ padding: '28px 16px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>

          {/* Recording banner */}
          {isRecording && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: `${accent}20`, border: `1px solid ${accent}44`,
              borderRadius: 20, padding: '3px 10px',
              fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', color: accent, textTransform: 'uppercase',
            }}>
              <span className="live-dot" style={{ width: 5, height: 5, background: accent, boxShadow: `0 0 6px ${accent}`, flexShrink: 0 }} />
              Recording
            </div>
          )}

          {/* Squircle avatar */}
          <div style={{ position: 'relative' }}>
            <div className="sc-avatar-ring" style={{
              width: 90, height: 90, borderRadius: '28%', padding: 3,
              background: isRecording
                ? `conic-gradient(${accent}, ${accent}66, ${accent})`
                : `linear-gradient(135deg, ${accent}88, ${accent}22)`,
              boxShadow: isRecording ? `0 0 28px ${accent}44` : 'none',
              transition: 'box-shadow 400ms',
              flexShrink: 0,
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '25%',
                overflow: 'hidden', background: 'var(--surface-raised)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <AvatarImg streamer={streamer} size={84} />
              </div>
            </div>
            {isRecording && (
              <span style={{
                position: 'absolute', bottom: -5, right: -5,
                background: accent, color: '#000',
                fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 900,
                padding: '2px 6px', borderRadius: 6, letterSpacing: '0.08em',
                border: '2px solid var(--surface)',
              }}>REC</span>
            )}
          </div>

          {/* Name + handle */}
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{
              fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 800,
              color: isActive ? 'var(--text-display)' : 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              lineHeight: 1.2, textShadow: streamer.avatar_url ? '0 1px 8px rgba(0,0,0,0.8)' : 'none',
            }}>
              {streamer.display_name}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-disabled)',
              marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              @{streamer.username}
            </div>
          </div>

          {/* Platform badge + paused */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            <PlatformBadge platform={streamer.platform} />
            {!isActive && (
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.08em', color: 'var(--text-disabled)',
                border: '1px solid var(--border-visible)', borderRadius: 5, padding: '2px 6px',
              }}>PAUSED</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1px 1fr',
          borderTop: '1px solid var(--border)',
          background: 'rgba(0,0,0,0.3)',
        }}>
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 800, color: 'var(--text-display)', lineHeight: 1 }}>
              {streamer.recording_count ?? 0}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Recordings
            </div>
          </div>
          <div style={{ background: 'var(--border)' }} />
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: 13, fontWeight: 700, color: streamer.last_live_at ? 'var(--text-primary)' : 'var(--text-disabled)', lineHeight: 1.2 }}>
              {streamer.last_live_at ? formatDate(streamer.last_live_at) : '—'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)', marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Last Live
            </div>
          </div>
        </div>

        {/* Monitoring toggle */}
        <div
          onClick={() => onToggle(!isActive)}
          style={{
            borderTop: '1px solid var(--border)',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.25)',
            transition: 'background 150ms',
            userSelect: 'none',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.4)')}
          onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.25)')}
        >
          <div>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 700, color: isActive ? 'var(--text-display)' : 'var(--text-secondary)' }}>
              {isActive ? 'Monitoring active' : 'Monitoring paused'}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)', marginTop: 1 }}>
              click to {isActive ? 'pause' : 'resume'}
            </div>
          </div>
          <div style={{
            width: 44, height: 24, borderRadius: 12, flexShrink: 0,
            background: isActive ? accent : 'var(--surface-raised)',
            border: `1px solid ${isActive ? accent : 'var(--border-visible)'}`,
            position: 'relative', transition: 'background 200ms, border-color 200ms',
            boxShadow: isActive ? `0 0 10px ${accent}55` : 'none',
          }}>
            <div style={{
              position: 'absolute', top: 3, width: 16, height: 16, borderRadius: '50%',
              background: isActive ? '#fff' : 'var(--text-disabled)',
              transform: isActive ? 'translateX(22px)' : 'translateX(3px)',
              transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 200ms',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{
          borderTop: '1px solid var(--border)',
          padding: '8px 12px',
          background: 'rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <CardBtn
            icon={isChecking ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={12} />}
            label="Check"
            onClick={onCheckNow}
            disabled={isChecking}
            title="Check now if live"
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => window.electronAPI.openExternal(streamer.channel_url)}
            title="Open channel in browser"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 8,
              background: 'var(--surface-overlay)',
              border: '1px solid var(--border-visible)',
              color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 120ms', flexShrink: 0,
            }}
            onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-display)'; b.style.background = 'var(--surface-raised)' }}
            onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = 'var(--text-secondary)'; b.style.background = 'var(--surface-overlay)' }}
          >
            <ExternalLink size={12} />
          </button>
          <CardBtn
            icon={<Video size={12} />}
            label="Recordings"
            onClick={() => navigate('/recordings')}
            title="View recordings"
          />
        </div>
      </div>
    </div>
  )
}

function CardBtn({
  icon, label, onClick, disabled, title,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '5px 9px', borderRadius: 7,
        fontFamily: 'var(--font-ui)', fontSize: 11, fontWeight: 600,
        color: hov ? 'var(--text-display)' : 'var(--text-secondary)',
        background: hov ? 'var(--surface-raised)' : 'transparent',
        border: `1px solid ${hov ? 'var(--border-visible)' : 'transparent'}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {label}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export function Streamers() {
  const { streamers, add, remove, setActive, checkNow, load } = useStreamersStore()
  const activeIds = useRecordingsStore(s => s.activeIds)
  const recordings = useRecordingsStore(s => s.recordings)
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const gridRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (streamers.length === 0) { prevCount.current = 0; return }
    if (!gridRef.current) return
    if (streamers.length !== prevCount.current) {
      prevCount.current = streamers.length
      const scope = createScope({ root: gridRef.current })
      scope.add(() => staggerIn('.streamer-card-anim', { delay: 50, distance: 14 }))
      return () => scope.revert()
    }
  }, [streamers.length])

  async function handleAdd() {
    const url = addUrl.trim()
    if (!url) { inputRef.current?.focus(); return }
    setAdding(true); setError('')
    try {
      await add(url)
      setAddUrl('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add streamer')
    } finally {
      setAdding(false)
    }
  }

  async function handleCheckNow(id: number) {
    setCheckingId(id)
    try { await checkNow(id) } finally { setCheckingId(null) }
  }

  async function handleRefreshAll() {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }

  async function handleRemove(id: number) {
    if (!confirm('Remove this streamer? Their recordings will remain.')) return
    await remove(id)
  }

  const activeCount = streamers.filter(s => s.is_active === 1).length
  const recordingCount = streamers.filter(s =>
    recordings.filter(r => activeIds.has(r.id)).some(r => r.streamer_id === s.id)
  ).length

  return (
    <div className="page">

      {/* ── Add streamer bar ── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-visible)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 24,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)',
        }}>
          <Link2 size={11} /> Add Streamer
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            style={{
              flex: 1, background: 'var(--black)',
              border: '1px solid var(--border-visible)',
              borderRadius: 10, padding: '0 16px', height: 44,
              fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
              color: 'var(--text-primary)', outline: 'none',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            placeholder="Paste channel URL — twitch.tv/..., kick.com/..., youtube.com/..., tiktok.com/@..., rumble.com/c/..."
            value={addUrl}
            onChange={e => { setAddUrl(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            disabled={adding}
            onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-subtle)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-visible)'; e.target.style.boxShadow = 'none' }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding || !addUrl.trim()}
            style={{ borderRadius: 10, minWidth: 100 }}
          >
            {adding ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Plus size={15} />}
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && (
          <div style={{ marginTop: 10, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
            {error}
          </div>
        )}
      </div>

      {/* ── Stats strip ── */}
      {streamers.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          marginBottom: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {[
            { num: streamers.length,  label: 'Streamers',  color: 'var(--text-display)' },
            { num: activeCount,       label: 'Monitored',  color: 'var(--accent)' },
            { num: recordingCount,    label: 'Recording',  color: 'var(--success)' },
            { num: streamers.reduce((s, x) => s + (x.recording_count ?? 0), 0), label: 'Total Recs', color: 'var(--text-primary)' },
          ].map((item, i) => (
            <div key={i} style={{
              flex: 1, padding: '10px 0', textAlign: 'center',
              borderRight: i < 3 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 800, color: item.color, lineHeight: 1 }}>
                {item.num}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-disabled)', marginTop: 3, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {item.label}
              </div>
            </div>
          ))}
          <div style={{ padding: '0 12px', borderLeft: '1px solid var(--border)' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleRefreshAll}
              disabled={refreshing}
              style={{ whiteSpace: 'nowrap' }}
            >
              {refreshing ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <RefreshCw size={12} />}
              Refresh All
            </button>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {streamers.length === 0 ? (
        <div className="empty-state">
          <Radio size={44} className="empty-state-icon" />
          <h3>No streamers yet</h3>
          <p>Paste a channel URL above to start monitoring and auto-recording streamers.</p>
        </div>
      ) : (
        <div ref={gridRef} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {streamers.map(s => (
            <StreamerCard
              key={s.id}
              streamer={s}
              isRecording={recordings.filter(r => activeIds.has(r.id)).some(r => r.streamer_id === s.id)}
              isChecking={checkingId === s.id}
              onCheckNow={() => handleCheckNow(s.id)}
              onToggle={(active) => setActive(s.id, active)}
              onRemove={() => handleRemove(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
