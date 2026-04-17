import { useState, useEffect, useRef, useCallback } from 'react'
import { Dialog } from '../ui/dialog'
import { usePlayerStore } from '../../stores/playerStore'
import { useClipsStore } from '../../stores/clipsStore'
import { getVideoElement } from '../../utils/videoRef'
import type { PlayerSource } from '../../types/domain'
import { Icon } from '../Icon'

interface Props {
  open: boolean
  onClose: () => void
  source: PlayerSource
}

const MIN_SPAN = 0.25

function formatClock(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const f = (n: number) => String(n).padStart(2, '0')
  if (h > 0) return `${h}:${f(m)}:${f(s)}`
  return `${m}:${f(s)}`
}

export function CreateClipModal({ open, onClose, source }: Props) {
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration    = usePlayerStore(s => s.duration)
  const loadClips   = useClipsStore(s => s.load)

  const [title, setTitle] = useState('')
  const [trimIn, setTrimIn] = useState(0)
  const [trimOut, setTrimOut] = useState(0)
  const [saving, setSaving] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<'in' | 'out' | null>(null)
  const trimInRef = useRef(0)
  const trimOutRef = useRef(0)

  const total = Math.max(duration || 0, 0.001)

  trimInRef.current = trimIn
  trimOutRef.current = trimOut

  useEffect(() => {
    if (!open) return
    const now = currentTime
    const hi = duration && duration > 0 ? duration : Math.max(now + 60, now + MIN_SPAN)
    setTrimIn(Math.max(0, Math.min(now, hi - MIN_SPAN)))
    setTrimOut(Math.min(hi, Math.max(now + 10, Math.min(now + 120, hi))))
    setTitle('')
  }, [open])

  const seekVideo = useCallback((t: number) => {
    const vid = getVideoElement()
    if (!vid) return
    const clamped = Math.min(Math.max(0, t), total)
    vid.currentTime = clamped
  }, [total])

  const pxToTime = useCallback((clientX: number) => {
    const el = barRef.current
    if (!el) return 0
    const r = el.getBoundingClientRect()
    const x = Math.min(Math.max(0, clientX - r.left), r.width)
    return (x / r.width) * total
  }, [total])

  useEffect(() => {
    if (!drag) return
    const onMove = (e: PointerEvent) => {
      const t = pxToTime(e.clientX)
      const hi = trimOutRef.current
      const lo = trimInRef.current
      if (drag === 'in') {
        setTrimIn(Math.max(0, Math.min(t, hi - MIN_SPAN)))
      } else {
        setTrimOut(Math.min(total, Math.max(t, lo + MIN_SPAN)))
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
  }, [drag, pxToTime, total])

  function onBarPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-handle]')) return
    seekVideo(pxToTime(e.clientX))
  }

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
  const playPct = (Math.min(currentTime, total) / total) * 100

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal-content" style={{ maxWidth: 460 }}>
          <div className="modal-header">
            <Dialog.Title className="modal-title">Create Clip</Dialog.Title>
            <Dialog.Close asChild>
              <button className="modal-close"><Icon name="close-line" size={16} /></button>
            </Dialog.Close>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="form-field">
              <span className="form-label">Title</span>
              <input
                className="form-input"
                placeholder={`Clip – ${formatClock(trimIn)}`}
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={120}
              />
            </label>

            <div>
              <div className="form-label" style={{ marginBottom: 6 }}>Trim range</div>
              <p style={{ fontSize: 12, color: 'var(--text-disabled)', margin: '0 0 8px' }}>
                Drag the handles or tap the bar to seek. Use Mark In / Out to snap to the playhead.
              </p>
              <div
                ref={barRef}
                role="slider"
                aria-valuemin={0}
                aria-valuemax={total}
                onPointerDown={onBarPointerDown}
                style={{
                  position: 'relative',
                  height: 36,
                  borderRadius: 8,
                  background: 'var(--border-visible)',
                  cursor: 'pointer',
                  touchAction: 'none',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: `${inPct}%`,
                    width: `${Math.max(0, outPct - inPct)}%`,
                    top: 4,
                    bottom: 4,
                    borderRadius: 4,
                    background: 'var(--accent-subtle)',
                    border: '1px solid var(--accent)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${playPct}%`,
                    top: 0,
                    bottom: 0,
                    width: 2,
                    marginLeft: -1,
                    background: 'var(--text-primary)',
                    opacity: 0.85,
                    pointerEvents: 'none',
                    borderRadius: 1,
                  }}
                />
                <button
                  type="button"
                  data-handle="in"
                  onPointerDown={e => { e.stopPropagation(); setDrag('in'); e.currentTarget.setPointerCapture(e.pointerId) }}
                  style={{
                    position: 'absolute',
                    left: `calc(${inPct}% - 6px)`,
                    top: 2,
                    width: 12,
                    height: 32,
                    borderRadius: 4,
                    background: 'var(--accent)',
                    border: '2px solid var(--surface)',
                    cursor: 'ew-resize',
                    padding: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                  aria-label="Trim in"
                />
                <button
                  type="button"
                  data-handle="out"
                  onPointerDown={e => { e.stopPropagation(); setDrag('out'); e.currentTarget.setPointerCapture(e.pointerId) }}
                  style={{
                    position: 'absolute',
                    left: `calc(${outPct}% - 6px)`,
                    top: 2,
                    width: 12,
                    height: 32,
                    borderRadius: 4,
                    background: 'var(--accent)',
                    border: '2px solid var(--surface)',
                    cursor: 'ew-resize',
                    padding: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  }}
                  aria-label="Trim out"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>In {formatClock(trimIn)}</span>
                <span>Δ {formatClock(Math.max(0, trimOut - trimIn))}</span>
                <span>Out {formatClock(trimOut)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setTrimIn(Math.max(0, Math.min(currentTime, trimOut - MIN_SPAN)))}>
                Mark In @ playhead
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setTrimOut(Math.min(total, Math.max(currentTime, trimIn + MIN_SPAN)))}>
                Mark Out @ playhead
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => seekVideo(trimIn)}>Jump to In</button>
              <button type="button" className="btn btn-ghost" onClick={() => seekVideo(trimOut)}>Jump to Out</button>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-disabled)' }}>
              {source.kind !== 'recording' && (
                <span style={{ color: 'var(--warning)' }}>
                  Clips can only be created from recordings.
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!canSave || saving}>
              {saving ? 'Creating…' : 'Create Clip'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
