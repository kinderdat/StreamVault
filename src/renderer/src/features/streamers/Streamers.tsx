import { useEffect, useMemo, useRef, useState } from 'react'

import { useNavigate } from 'react-router'

import { Icon } from '@renderer/components/Icon'
import { PlatformBadge, getPlatformColor } from '@renderer/components/PlatformBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@renderer/components/ui/select'
import { useRecordingsStore } from '@renderer/stores/recordingsStore'
import { useStreamersStore } from '@renderer/stores/streamersStore'
import type { Streamer } from '@renderer/types/domain'
import { staggerIn } from '@renderer/utils/anime'
import { formatDate } from '@renderer/utils/format'
import { animate, createScope } from 'animejs'

import './streamers.css'

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
      <SelectTrigger className="btn btn-ghost btn-sm" style={{ minWidth }}>
        <SelectValue />
        <span className="ml-auto inline-flex items-center text-[var(--text-disabled)]">
          <Icon name="arrow-down-s-line" size={16} />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {children}
      </SelectContent>
    </Select>
  )
}

function InlineOption({ value, children }: { value: string; children: React.ReactNode }) {
  return <SelectItem value={value}>{children}</SelectItem>
}

/* ── Avatar ──────────────────────────────────────────────────── */
function AvatarImg({ streamer, size }: { streamer: Streamer; size: number }) {
  const [err, setErr] = useState(false)
  const initial = (streamer.display_name[0] ?? streamer.username[0] ?? '?').toUpperCase()
  const color = getPlatformColor(streamer.platform)
  if (streamer.avatar_url && !err) {
    return (
      <img
        src={streamer.avatar_url}
        alt={streamer.display_name}
        onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    )
  }
  return (
    <span style={{ fontFamily: 'var(--font-heading)', fontSize: size * 0.4, fontWeight: 800, color }}>
      {initial}
    </span>
  )
}

/* ── Streamer card ────────────────────────────────────────────── */
function StreamerCard({
  streamer,
  isRecording,
  isChecking,
  onCheckNow,
  onToggle,
  onRemove,
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
  const isActive = streamer.is_active
  const accent = getPlatformColor(streamer.platform)
  const [hovered, setHovered] = useState(false)
  // Use printable ASCII range to avoid control characters in regex (eslint no-control-regex).
  const hasNonAsciiDisplayName = /[^\u0020-\u007e]/.test(streamer.display_name)
  const hasAsciiUsername = /^[\u0020-\u007e]+$/.test(streamer.username)
  const preferUsernamePrimary =
    streamer.platform.toLowerCase() === 'twitch' && hasNonAsciiDisplayName && hasAsciiUsername
  const primaryName = preferUsernamePrimary ? streamer.username : streamer.display_name
  const secondaryHandle = preferUsernamePrimary ? streamer.display_name : `@${streamer.username}`

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

  const cardGlow = isRecording ? `0 0 0 1.5px ${accent}66, 0 10px 40px ${accent}30` : undefined

  return (
    <div
      ref={cardRef}
      className={`streamer-card-anim streamer-card ${isRecording ? 'is-recording' : ''} ${hovered ? 'is-hovered' : ''}`}
      style={{
        ['--card-accent' as never]: accent,
        boxShadow: cardGlow,
        opacity: isActive ? 1 : 0.65,
        willChange: 'transform',
      }}
    >
      {/* Blurred avatar background */}
      {streamer.avatar_url && (
        <div className="sc-bg-blur" style={{ backgroundImage: `url(${streamer.avatar_url})` }} />
      )}

      {/* Content — above the blur */}
      <div className="streamer-card-content">
        {/* Avatar + identity */}
        <div
          style={{
            padding: '20px 16px 18px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
          }}
        >
          {/* Recording banner */}
          <div className={`sc-recording-pill ${isRecording ? 'is-visible' : ''}`}>
            <span className="live-dot" />
            Recording
          </div>

          {/* Squircle avatar */}
          <div style={{ position: 'relative' }}>
            <div className="sc-avatar-ring">
              <div className="sc-avatar-inner">
                <AvatarImg streamer={streamer} size={84} />
              </div>
            </div>
          </div>

          {/* Name + handle */}
          <div className="sc-names">
            <div className={`sc-name ${isActive ? '' : 'is-paused'}`}>{primaryName}</div>
            <div className="sc-handle">{secondaryHandle}</div>
          </div>

          {/* Platform badge + paused */}
          <div className="sc-badges">
            <PlatformBadge platform={streamer.platform} />
            {!isActive && <span className="sc-paused-chip">PAUSED</span>}
          </div>
        </div>

        {/* Stats row */}
        <div className="sc-stats">
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 18,
                fontWeight: 800,
                color: 'var(--text-display)',
                lineHeight: 1,
              }}
            >
              {streamer.recording_count ?? 0}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-disabled)',
                marginTop: 3,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Recordings
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ padding: '10px 0', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 13,
                fontWeight: 700,
                color: streamer.last_live_at ? 'var(--text-primary)' : 'var(--text-disabled)',
                lineHeight: 1.2,
              }}
            >
              {streamer.last_live_at ? formatDate(streamer.last_live_at) : '—'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-disabled)',
                marginTop: 3,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              Last Live
            </div>
          </div>
        </div>

        {/* Monitoring toggle */}
        <div
          onClick={() => onToggle(!isActive)}
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.1)',
            transition: 'background 150ms, border-color 150ms',
            userSelect: 'none',
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)')
          }
          onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = 'rgba(0,0,0,0.1)')}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-ui)',
                fontSize: 13,
                fontWeight: 700,
                color: isActive ? 'var(--text-display)' : 'var(--text-secondary)',
              }}
            >
              {isActive ? 'Monitoring active' : 'Monitoring paused'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-disabled)',
                marginTop: 1,
              }}
            >
              click to {isActive ? 'pause' : 'resume'}
            </div>
          </div>
          <div
            style={{
              width: 44,
              height: 24,
              borderRadius: 12,
              flexShrink: 0,
              background: isActive ? accent : 'var(--surface-raised)',
              border: `1px solid ${isActive ? accent : 'var(--border-visible)'}`,
              position: 'relative',
              transition: 'background 200ms, border-color 200ms',
              boxShadow: isActive ? `0 0 10px ${accent}55` : 'none',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 3,
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: isActive ? '#fff' : 'var(--text-disabled)',
                transform: isActive ? 'translateX(22px)' : 'translateX(3px)',
                transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), background 200ms',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 'auto',
          }}
        >
          <CardBtn
            icon={
              isChecking ? (
                <span className="spinner" style={{ width: 12, height: 12 }} />
              ) : (
                <Icon name="refresh-line" size={16} />
              )
            }
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 30,
              height: 30,
              borderRadius: 9,
              background: 'rgba(13,17,23,0.42)',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 120ms',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = 'var(--text-display)'
              b.style.background = 'rgba(22,27,34,0.56)'
            }}
            onMouseLeave={(e) => {
              const b = e.currentTarget as HTMLButtonElement
              b.style.color = 'var(--text-secondary)'
              b.style.background = 'rgba(13,17,23,0.42)'
            }}
          >
            <Icon name="external-link-line" size={16} />
          </button>
          <CardBtn
            icon={<Icon name="close-line" size={16} />}
            label="X"
            onClick={onRemove}
            title="Remove streamer"
            danger
            iconOnly
          />
          <CardBtn
            icon={<Icon name="play-circle-line" size={16} />}
            label="Recordings"
            onClick={() => navigate('/recordings')}
            title="View recordings"
            iconOnly
          />
        </div>
      </div>
    </div>
  )
}

function CardBtn({
  icon,
  label,
  onClick,
  disabled,
  title,
  danger,
  iconOnly,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  title?: string
  danger?: boolean
  iconOnly?: boolean
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: iconOnly ? 0 : 4,
        padding: iconOnly ? '0' : '6px 10px',
        borderRadius: 8,
        width: iconOnly ? 30 : 'auto',
        height: iconOnly ? 30 : 'auto',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        fontWeight: 700,
        color: danger
          ? hov
            ? 'var(--danger)'
            : 'var(--text-secondary)'
          : hov
            ? 'var(--text-display)'
            : 'var(--text-secondary)',
        background: danger
          ? hov
            ? 'rgba(248,81,73,0.16)'
            : 'rgba(13,17,23,0.38)'
          : hov
            ? 'rgba(22,27,34,0.54)'
            : 'rgba(13,17,23,0.38)',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 120ms',
        whiteSpace: 'nowrap',
      }}
    >
      {icon}
      {!iconOnly && label}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════ */
export function Streamers() {
  const { streamers, add, remove, setActive, checkNow, load } = useStreamersStore()
  const activeIds = useRecordingsStore((s) => s.activeIds)
  const recordings = useRecordingsStore((s) => s.recordings)
  const [addUrl, setAddUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [sort, setSort] = useState<'name' | 'platform' | 'last_live' | 'recordings'>('name')
  const gridRef = useRef<HTMLDivElement>(null)
  const prevCount = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const staggerScopeRef = useRef<ReturnType<typeof createScope> | null>(null)

  useEffect(() => {
    staggerScopeRef.current?.revert()
    staggerScopeRef.current = null
    if (streamers.length === 0 || !gridRef.current) {
      prevCount.current = 0
      return
    }
    if (streamers.length !== prevCount.current) {
      prevCount.current = streamers.length
      const scope = createScope({ root: gridRef.current })
      scope.add(() => staggerIn('.streamer-card-anim', { delay: 50, distance: 14 }))
      staggerScopeRef.current = scope
    }
    return () => {
      staggerScopeRef.current?.revert()
      staggerScopeRef.current = null
    }
  }, [streamers.length])

  async function handleAdd() {
    const url = addUrl.trim()
    if (!url) {
      inputRef.current?.focus()
      return
    }
    setAdding(true)
    setError('')
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
    try {
      await checkNow(id)
    } finally {
      setCheckingId(null)
    }
  }

  async function handleRefreshAll() {
    setRefreshing(true)
    try {
      const active = streamers.filter((s) => s.is_active)
      if (active.length === 0) {
        await load()
        return
      }
      await Promise.allSettled(active.map((s) => checkNow(s.id)))
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleRemove(id: number) {
    if (!confirm('Remove this streamer? Their recordings will remain.')) return
    await remove(id)
  }

  const activeCount = streamers.filter((s) => s.is_active).length
  const activeStreamerIds = useMemo(
    () => new Set(recordings.filter((r) => activeIds.has(r.id)).map((r) => r.streamer_id)),
    [recordings, activeIds],
  )
  const recordingCount = streamers.filter((s) => activeStreamerIds.has(s.id)).length

  const sortedStreamers = useMemo(() => {
    const list = [...streamers]
    list.sort((a, b) => {
      if (sort === 'platform') return (a.platform ?? '').localeCompare(b.platform ?? '')
      if (sort === 'last_live') return (b.last_live_at ?? 0) - (a.last_live_at ?? 0)
      if (sort === 'recordings') return (b.recording_count ?? 0) - (a.recording_count ?? 0)
      return (a.display_name ?? a.username ?? '').localeCompare(b.display_name ?? b.username ?? '')
    })
    return list
  }, [streamers, sort])

  return (
    <div className="page">
      {/* ── Add streamer bar ── */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-visible)',
          borderRadius: 14,
          padding: '18px 20px',
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon name="link" size={16} /> Add Streamer
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            style={{
              flex: 1,
              background: 'var(--black)',
              border: '1px solid var(--border-visible)',
              borderRadius: 10,
              padding: '0 16px',
              height: 44,
              fontFamily: 'var(--font-ui)',
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            placeholder="Paste channel URL — twitch.tv/..., kick.com/..., youtube.com/..., tiktok.com/@..., rumble.com/c/..."
            value={addUrl}
            onChange={(e) => {
              setAddUrl(e.target.value)
              setError('')
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            disabled={adding}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--accent)'
              e.target.style.boxShadow = '0 0 0 3px var(--accent-subtle)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-visible)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={adding || !addUrl.trim()}
            style={{ borderRadius: 10, minWidth: 100 }}
          >
            {adding ? (
              <span className="spinner" style={{ width: 14, height: 14 }} />
            ) : (
              <Icon name="add-line" size={16} />
            )}
            {adding ? 'Adding…' : 'Add'}
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 10,
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--danger)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }}
            />
            {error}
          </div>
        )}
      </div>

      {/* ── Stats strip ── */}
      {streamers.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 0,
            marginBottom: 20,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          {[
            { num: streamers.length, label: 'Streamers', color: 'var(--text-display)' },
            { num: activeCount, label: 'Monitored', color: 'var(--accent)' },
            { num: recordingCount, label: 'Recording', color: 'var(--success)' },
            {
              num: streamers.reduce((s, x) => s + (x.recording_count ?? 0), 0),
              label: 'Total Recs',
              color: 'var(--text-primary)',
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                padding: '10px 0',
                textAlign: 'center',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 20,
                  fontWeight: 800,
                  color: item.color,
                  lineHeight: 1,
                }}
              >
                {item.num}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-disabled)',
                  marginTop: 3,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
          <div style={{ padding: '0 12px', borderLeft: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <InlineSelect value={sort} onValueChange={(v) => setSort(v as typeof sort)} minWidth={160}>
                <InlineOption value="name">Sort: Name</InlineOption>
                <InlineOption value="platform">Sort: Platform</InlineOption>
                <InlineOption value="last_live">Sort: Last Live</InlineOption>
                <InlineOption value="recordings">Sort: Recording Count</InlineOption>
              </InlineSelect>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleRefreshAll}
                disabled={refreshing}
                style={{ whiteSpace: 'nowrap' }}
              >
                {refreshing ? (
                  <span className="spinner" style={{ width: 12, height: 12 }} />
                ) : (
                  <Icon name="refresh-line" size={16} />
                )}
                Check All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {streamers.length === 0 ? (
        <div className="empty-state">
          <Icon name="radio-line" size={20} className="empty-state-icon" />
          <h3>No streamers yet</h3>
          <p>Paste a channel URL above to start monitoring and auto-recording streamers.</p>
        </div>
      ) : (
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(var(--grid-card-min-streamers), 1fr))',
            gap: 'clamp(10px, 1vw, 16px)',
            alignItems: 'start',
          }}
        >
          {sortedStreamers.map((s) => (
            <StreamerCard
              key={s.id}
              streamer={s}
              isRecording={activeStreamerIds.has(s.id)}
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
