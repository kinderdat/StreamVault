import { useCallback, useEffect, useRef, useState } from 'react'

import { useClipsStore } from '../../stores/clipsStore'
import { usePlayerStore } from '../../stores/playerStore'
import type { PlayerSource } from '../../types/domain'
import { getVideoElement } from '../../utils/videoRef'
import { Icon } from '../Icon'
import { Dialog } from '../ui/dialog'
import './create-clip-modal.css'

interface Props {
  open: boolean
  onClose: () => void
  source: PlayerSource
}

const MIN_SPAN = 0.25

const LENGTH_PRESETS = [
  { label: '1 min', sec: 60 },
  { label: '5 min', sec: 300 },
  { label: '10 min', sec: 600 },
  { label: '15 min', sec: 900 },
  { label: '30 min', sec: 1800 },
] as const

const DEFAULT_PRESET_SEC = 300

function trackWidthPx(total: number): number {
  const t = Math.max(total, 0.001)
  return Math.round(Math.min(48_000, Math.max(960, t * 6)))
}

function formatClock(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const f = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${f(m)}:${f(s)}`
  return `${m}:${f(s)}`
}

function constrainRange(
  trimIn: number,
  trimOut: number,
  total: number,
  maxSpan: number | null,
): [number, number] {
  const cap = maxSpan ?? Number.POSITIVE_INFINITY
  let a = trimIn
  let b = trimOut
  if (b - a < MIN_SPAN) b = a + MIN_SPAN
  if (b > total) {
    b = total
    a = Math.max(0, b - MIN_SPAN)
  }
  if (a < 0) a = 0
  if (b - a > cap) {
    b = a + cap
    if (b > total) {
      b = total
      a = Math.max(0, b - cap)
    }
  }
  if (b - a < MIN_SPAN) {
    a = Math.max(0, b - MIN_SPAN)
  }
  return [a, b]
}

export function CreateClipModal({ open, onClose, source }: Props) {
  const duration = usePlayerStore((s) => s.duration)
  const currentTimeMain = usePlayerStore((s) => s.currentTime)
  const loadClips = useClipsStore((s) => s.load)

  const [title, setTitle] = useState('')
  const [trimIn, setTrimIn] = useState(0)
  const [trimOut, setTrimOut] = useState(0)
  const [presetSec, setPresetSec] = useState<number | null>(DEFAULT_PRESET_SEC)
  const [saving, setSaving] = useState(false)
  const [playheadTime, setPlayheadTime] = useState(0)
  const [previewReady, setPreviewReady] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLVideoElement>(null)
  const resumeRef = useRef<{ time: number; wasPlaying: boolean }>({ time: 0, wasPlaying: false })

  const [drag, setDrag] = useState<'in' | 'out' | null>(null)
  const trimInRef = useRef(0)
  const trimOutRef = useRef(0)
  const presetSecRef = useRef<number | null>(DEFAULT_PRESET_SEC)
  const total = Math.max(duration || 0, 0.001)
  const tw = trackWidthPx(total)

  trimInRef.current = trimIn
  trimOutRef.current = trimOut
  presetSecRef.current = presetSec

  const setTrimPair = useCallback(
    (a: number, b: number) => {
      const [ti, to] = constrainRange(a, b, total, presetSecRef.current)
      setTrimIn(ti)
      setTrimOut(to)
      trimInRef.current = ti
      trimOutRef.current = to
    },
    [total],
  )

  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false
      return
    }
    if (wasOpenRef.current) return
    wasOpenRef.current = true

    const hi =
      duration && duration > 0 ? duration : Math.max(currentTimeMain + 60, currentTimeMain + MIN_SPAN)
    const now = currentTimeMain
    const span = Math.min(DEFAULT_PRESET_SEC, hi)
    let tin = Math.max(0, now - span / 2)
    let tout = tin + span
    if (tout > hi) {
      tout = hi
      tin = Math.max(0, tout - span)
    }
    const [ti, to] = constrainRange(tin, tout, hi, DEFAULT_PRESET_SEC)
    setTrimIn(ti)
    setTrimOut(to)
    trimInRef.current = ti
    trimOutRef.current = to
    setPresetSec(DEFAULT_PRESET_SEC)
    presetSecRef.current = DEFAULT_PRESET_SEC
    setTitle('')
    setPreviewReady(false)
  }, [open, duration, currentTimeMain])

  const seekMain = useCallback(
    (t: number) => {
      const vid = getVideoElement()
      if (!vid) return
      vid.currentTime = Math.min(Math.max(0, t), total)
    },
    [total],
  )

  const clientXToTime = useCallback(
    (clientX: number) => {
      const scroll = scrollRef.current
      const track = barRef.current
      if (!scroll || !track) return 0
      const sr = scroll.getBoundingClientRect()
      const x = clientX - sr.left + scroll.scrollLeft
      const w = track.offsetWidth
      if (w <= 0) return 0
      return Math.min(Math.max(0, (x / w) * total), total)
    },
    [total],
  )

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const t = clientXToTime(e.clientX)
      const lo = trimInRef.current
      const hi = trimOutRef.current
      const preset = presetSecRef.current
      if (drag === 'in') {
        const newIn = Math.max(0, Math.min(t, hi - MIN_SPAN))
        let newOut = hi
        if (preset != null && newOut - newIn > preset) {
          newOut = newIn + preset
        }
        const [a, b] = constrainRange(newIn, newOut, total, preset)
        setTrimIn(a)
        setTrimOut(b)
        trimInRef.current = a
        trimOutRef.current = b
      } else {
        const newOut = Math.min(total, Math.max(t, lo + MIN_SPAN))
        let newIn = lo
        if (preset != null && newOut - newIn > preset) {
          newIn = Math.max(0, newOut - preset)
        }
        const [a, b] = constrainRange(newIn, newOut, total, preset)
        setTrimIn(a)
        setTrimOut(b)
        trimInRef.current = a
        trimOutRef.current = b
      }
    }
    const onUp = () => setDrag(null)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [drag, clientXToTime, total])

  function onBarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    const t = clientXToTime(e.clientX)
    const pv = previewRef.current
    if (pv && previewReady) {
      pv.currentTime = t
      setPlayheadTime(t)
      void pv.play().catch(() => {})
    } else {
      seekMain(t)
    }
  }

  function applyPreset(sec: number | null) {
    const a = trimInRef.current
    const b = trimOutRef.current
    if (sec == null) {
      setPresetSec(null)
      presetSecRef.current = null
      const [ti, to] = constrainRange(a, b, total, null)
      setTrimIn(ti)
      setTrimOut(to)
      trimInRef.current = ti
      trimOutRef.current = to
      return
    }
    setPresetSec(sec)
    presetSecRef.current = sec
    let to = Math.min(a + sec, total)
    let from = a
    if (to - from < MIN_SPAN) {
      to = Math.min(from + MIN_SPAN, total)
      from = Math.max(0, to - sec)
    }
    const [ti, to2] = constrainRange(from, to, total, sec)
    setTrimIn(ti)
    setTrimOut(to2)
    trimInRef.current = ti
    trimOutRef.current = to2
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      const main = getVideoElement()
      const pv = previewRef.current
      if (cancelled || !main || !pv) return
      const src = main.currentSrc || main.src
      if (!src) return

      resumeRef.current = { time: main.currentTime, wasPlaying: !main.paused }
      main.pause()
      resumeAfterClipRef.current = true

      const start = trimInRef.current
      if (pv.src !== src) {
        pv.src = src
        pv.load()
      }
      const onLoaded = () => {
        if (cancelled) return
        pv.currentTime = start
        setPlayheadTime(start)
        setPreviewReady(true)
        void pv.play().catch(() => {})
      }
      if (pv.readyState >= 2) {
        onLoaded()
      } else {
        pv.addEventListener('loadeddata', onLoaded, { once: true })
      }
    }, 0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const pv = previewRef.current
      if (pv) {
        pv.pause()
        pv.removeAttribute('src')
        pv.load()
      }
    }
  }, [open, source.filePath])

  useEffect(() => {
    const pv = previewRef.current
    if (!open || !pv || !previewReady) return
    if (pv.currentTime < trimIn || pv.currentTime > trimOut) {
      pv.currentTime = trimIn
      setPlayheadTime(trimIn)
    }
  }, [trimIn, trimOut, open, previewReady])

  useEffect(() => {
    const pv = previewRef.current
    if (!open || !pv) return
    const onTime = () => {
      const t = pv.currentTime
      setPlayheadTime(t)
      if (t >= trimOut - 0.06) {
        pv.currentTime = trimIn
      } else if (t < trimIn - 0.05) {
        pv.currentTime = trimIn
      }
    }
    pv.addEventListener('timeupdate', onTime)
    return () => pv.removeEventListener('timeupdate', onTime)
  }, [open, trimIn, trimOut, previewReady])

  const resumeAfterClipRef = useRef(false)

  useEffect(() => {
    if (open) return
    if (!resumeAfterClipRef.current) return
    resumeAfterClipRef.current = false
    const main = getVideoElement()
    if (!main) return
    const { time, wasPlaying } = resumeRef.current
    main.currentTime = time
    if (wasPlaying) void main.play().catch(() => {})
  }, [open])

  async function handleSave() {
    if (trimIn >= trimOut || source.kind !== 'recording') return
    setSaving(true)
    try {
      await window.electronAPI.clipsCreate({
        recording_id: source.id,
        title: title.trim() || `Clip – ${formatClock(trimIn)}`,
        start_secs: trimIn,
        end_secs: trimOut,
      })
      await loadClips()
      onClose()
    } catch (err) {
      console.error('clip create failed', err)
    } finally {
      setSaving(false)
    }
  }

  const canSave = source.kind === 'recording' && trimIn + MIN_SPAN <= trimOut
  const inPct = (trimIn / total) * 100
  const outPct = (trimOut / total) * 100
  const playPct = (Math.min(Math.max(playheadTime, 0), total) / total) * 100

  const spanSecs = Math.max(0, trimOut - trimIn)

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content modal-content--clip">
          <div className="modal-header">
            <Dialog.Title className="modal-title">Create Clip</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" className="modal-close" aria-label="Close">
                <Icon name="close-line" size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="modal-body clip-modal-body">
            <p className="clip-modal-lead">
              Pick a length, drag the blue zone along the bar, or drag the handles to fine-tune. Scroll
              sideways on long streams — the bar is wide so the clip isn’t a tiny sliver.
            </p>

            <div className="clip-preview-wrap">
              <video ref={previewRef} className="clip-preview-video" muted playsInline controls={false} />
              <div className="clip-preview-badge">
                <Icon name="refresh-line" size={16} />
                <span>Preview loops inside the blue range (muted)</span>
              </div>
            </div>

            <label className="form-field">
              <span className="form-label">Title</span>
              <input
                className="form-input"
                placeholder={`Clip – ${formatClock(trimIn)}`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
              />
            </label>

            <div className="clip-presets">
              <span className="form-label">Clip length</span>
              <div className="clip-presets-row">
                {LENGTH_PRESETS.map((p) => (
                  <button
                    key={p.sec}
                    type="button"
                    className={`clip-preset-chip ${presetSec === p.sec ? 'is-active' : ''}`}
                    onClick={() => applyPreset(p.sec)}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  type="button"
                  className={`clip-preset-chip ${presetSec === null ? 'is-active' : ''}`}
                  onClick={() => applyPreset(null)}
                >
                  Custom
                </button>
              </div>
              <p className="clip-presets-hint">
                {presetSec != null
                  ? `Selection stays within ${formatClock(presetSec)}. Use Custom for a longer clip.`
                  : 'No fixed cap — drag handles freely (minimum clip size applies).'}
              </p>
            </div>

            <div className="clip-timeline-block">
              <div className="form-label clip-timeline-label">Trim on timeline</div>
              <p className="clip-timeline-scroll-hint">
                Scroll horizontally · Drag handles · Tap the bar to seek preview
              </p>
              <div className="clip-timeline-scroll" ref={scrollRef}>
                <div
                  ref={barRef}
                  role="presentation"
                  className="clip-timeline-track"
                  style={{ width: tw }}
                  onPointerDown={onBarPointerDown}
                >
                  <div
                    className="clip-timeline-selection"
                    style={{
                      left: `${inPct}%`,
                      width: `${Math.max(0, outPct - inPct)}%`,
                    }}
                  />
                  <div className="clip-timeline-playhead" style={{ left: `${playPct}%` }} />
                  <button
                    type="button"
                    data-handle="in"
                    className="clip-timeline-handle clip-timeline-handle--in"
                    style={{ left: `${inPct}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setDrag('in')
                      e.currentTarget.setPointerCapture(e.pointerId)
                    }}
                    aria-label="Trim in"
                  />
                  <button
                    type="button"
                    data-handle="out"
                    className="clip-timeline-handle clip-timeline-handle--out"
                    style={{ left: `${outPct}%` }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setDrag('out')
                      e.currentTarget.setPointerCapture(e.pointerId)
                    }}
                    aria-label="Trim out"
                  />
                </div>
              </div>
              <div className="clip-timeline-meta">
                <span>In {formatClock(trimIn)}</span>
                <span className="clip-timeline-delta">Δ {formatClock(spanSecs)}</span>
                <span>Out {formatClock(trimOut)}</span>
                {presetSec != null ? (
                  <span className="clip-timeline-cap">Max {formatClock(presetSec)}</span>
                ) : (
                  <span className="clip-timeline-cap">Custom length</span>
                )}
              </div>
            </div>

            <div className="clip-mark-grid">
              <button
                type="button"
                className="btn btn-ghost clip-mark-btn"
                onClick={() => {
                  const t = previewRef.current?.currentTime ?? playheadTime
                  setTrimPair(t, trimOut)
                }}
              >
                Mark In @ playhead
              </button>
              <button
                type="button"
                className="btn btn-ghost clip-mark-btn"
                onClick={() => {
                  const t = previewRef.current?.currentTime ?? playheadTime
                  setTrimPair(trimIn, t)
                }}
              >
                Mark Out @ playhead
              </button>
              <button
                type="button"
                className="btn btn-ghost clip-mark-btn"
                onClick={() => {
                  const pv = previewRef.current
                  if (pv) {
                    pv.currentTime = trimIn
                    void pv.play().catch(() => {})
                  } else seekMain(trimIn)
                }}
              >
                Jump to In
              </button>
              <button
                type="button"
                className="btn btn-ghost clip-mark-btn"
                onClick={() => {
                  const pv = previewRef.current
                  if (pv) {
                    pv.currentTime = trimOut
                    void pv.play().catch(() => {})
                  } else seekMain(trimOut)
                }}
              >
                Jump to Out
              </button>
            </div>

            {source.kind !== 'recording' && (
              <div className="clip-warning">Clips can only be created from recordings.</div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!canSave || saving}
            >
              {saving ? 'Creating…' : 'Create Clip'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
