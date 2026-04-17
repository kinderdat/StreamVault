import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router'
import videojs from 'video.js'
import { usePlayerStore } from '../../stores/playerStore'
import { registerVideoElement, getVideoElement } from '../../utils/videoRef'
import { registerVideoJsPlayer } from '../../utils/videoJsRef'
import { formatDuration } from '../../utils/format'
import { Icon } from '../Icon'
import { PlatformBadge } from '../PlatformBadge'

const SPEED_OPTIONS = [0.5, 1, 1.5, 2]

export function PersistentVideoMount() {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerInstanceRef = useRef<videojs.Player | null>(null)
  const controlsTimerRef = useRef<number | null>(null)
  const prevVolumeRef = useRef(1)
  const navigate = useNavigate()
  const location = useLocation()
  const [isHoveringSurface, setIsHoveringSurface] = useState(false)
  const [showFullControls, setShowFullControls] = useState(true)
  const [showPipChrome, setShowPipChrome] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)

  const source      = usePlayerStore(s => s.source)
  const pipActive   = usePlayerStore(s => s.pipActive)
  const volume      = usePlayerStore(s => s.volume)
  const speed       = usePlayerStore(s => s.speed)
  const isPlaying   = usePlayerStore(s => s.isPlaying)
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration    = usePlayerStore(s => s.duration)
  const pipPosition = usePlayerStore(s => s.pipPosition)
  const pipWidth    = usePlayerStore(s => s.pipWidth)
  const pipHeight   = usePlayerStore(s => s.pipHeight)
  const setPlaying     = usePlayerStore(s => s.setPlaying)
  const setCurrentTime = usePlayerStore(s => s.setCurrentTime)
  const setDuration    = usePlayerStore(s => s.setDuration)
  const setPipActive   = usePlayerStore(s => s.setPipActive)
  const clear          = usePlayerStore(s => s.clear)
  const setPipPosition = usePlayerStore(s => s.setPipPosition)
  const setPipSize     = usePlayerStore(s => s.setPipSize)

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const volumePct = Math.round(volume * 100)

  const videoRefCallback = useCallback((el: HTMLVideoElement | null) => {
    ;(videoRef as { current: HTMLVideoElement | null }).current = el
    registerVideoElement(el)
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return

    const player = videojs(el, {
      controls: false,
      autoplay: false,
      preload: 'metadata',
      fluid: false,
      playbackRates: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      bigPlayButton: true,
    })

    playerInstanceRef.current = player
    registerVideoJsPlayer(player)

    return () => {
      registerVideoJsPlayer(null)
      player.dispose()
      playerInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    if (!source) {
      vid.src = ''
      vid.load()
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const href = await window.electronAPI.preparePlayback(source.filePath)
        if (cancelled) return
        const player = playerInstanceRef.current
        if (player) {
          player.src({ src: href })
          player.load()
          void player.play().catch(() => { /* autoplay policy */ })
        } else {
          vid.src = href
          vid.load()
          void vid.play().catch(() => { /* autoplay policy */ })
        }
      } catch (err) {
        console.error('[Player] preparePlayback failed', err)
        if (!cancelled) {
          const player = playerInstanceRef.current
          if (player) {
            player.src({ src: '' })
            player.load()
          } else {
            vid.src = ''
            vid.load()
          }
        }
      }
    })()
    return () => { cancelled = true }
  }, [source?.filePath, source?.id, source?.kind])

  useEffect(() => {
    const player = playerInstanceRef.current
    if (player) {
      player.volume(volume)
    } else {
      const vid = videoRef.current
      if (vid) vid.volume = volume
    }
  }, [volume])

  useEffect(() => {
    const player = playerInstanceRef.current
    if (player) {
      player.playbackRate(speed)
    } else {
      const vid = videoRef.current
      if (vid) vid.playbackRate = speed
    }
  }, [speed])

  useEffect(() => {
    if (volume > 0) prevVolumeRef.current = volume
  }, [volume])

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      if (!(e.target instanceof HTMLElement)) return
      if (e.target.closest('.player-speed-menu')) return
      setSpeedMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    return () => document.removeEventListener('pointerdown', onDocPointerDown)
  }, [])

  useEffect(() => {
    if (controlsTimerRef.current) {
      window.clearTimeout(controlsTimerRef.current)
      controlsTimerRef.current = null
    }

    if (!source) return

    if (pipActive) {
      if (!isPlaying || isHoveringSurface) {
        setShowPipChrome(true)
        return
      }
      controlsTimerRef.current = window.setTimeout(() => setShowPipChrome(false), 1400)
      return
    }

    if (!isPlaying || isHoveringSurface) {
      setShowFullControls(true)
      return
    }

    controlsTimerRef.current = window.setTimeout(() => setShowFullControls(false), 1600)
    return () => {
      if (controlsTimerRef.current) {
        window.clearTimeout(controlsTimerRef.current)
        controlsTimerRef.current = null
      }
    }
  }, [isHoveringSurface, isPlaying, pipActive, source])

  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return
    const onPlay         = () => setPlaying(true)
    const onPause        = () => setPlaying(false)
    const onEnded        = () => setPlaying(false)
    const onTimeUpdate   = () => setCurrentTime(vid.currentTime)
    const onDurationChg  = () => { if (isFinite(vid.duration)) setDuration(vid.duration) }
    const onLoadedMeta   = () => { if (isFinite(vid.duration)) setDuration(vid.duration) }
    const onError        = () => {
      setPlaying(false)
      console.error('[Player] video failed to load', {
        src: vid.currentSrc || vid.src,
        error: vid.error?.message ?? vid.error?.code ?? 'unknown',
      })
    }
    vid.addEventListener('play',           onPlay)
    vid.addEventListener('pause',          onPause)
    vid.addEventListener('ended',          onEnded)
    vid.addEventListener('timeupdate',     onTimeUpdate)
    vid.addEventListener('durationchange', onDurationChg)
    vid.addEventListener('loadedmetadata', onLoadedMeta)
    vid.addEventListener('error',          onError)
    return () => {
      vid.removeEventListener('play',           onPlay)
      vid.removeEventListener('pause',          onPause)
      vid.removeEventListener('ended',          onEnded)
      vid.removeEventListener('timeupdate',     onTimeUpdate)
      vid.removeEventListener('durationchange', onDurationChg)
      vid.removeEventListener('loadedmetadata', onLoadedMeta)
      vid.removeEventListener('error',          onError)
    }
  }, [source?.filePath, source?.id, source?.kind, setPlaying, setCurrentTime, setDuration])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || pipActive || !source) return

    function syncRect() {
      const slot = document.getElementById('player-full-slot')
      if (!slot || !container) { if (container) container.style.visibility = 'hidden'; return }
      container.style.visibility = 'visible'
      const r = slot.getBoundingClientRect()
      container.style.position      = 'fixed'
      container.style.left          = r.left + 'px'
      container.style.top           = r.top + 'px'
      container.style.width         = r.width + 'px'
      container.style.height        = r.height + 'px'
      container.style.borderRadius  = '0'
      container.style.boxShadow     = 'none'
      container.style.cursor        = 'default'
    }

    syncRect()
    const ro = new ResizeObserver(syncRect)
    const slot = document.getElementById('player-full-slot')
    if (slot) ro.observe(slot)
    window.addEventListener('resize', syncRect)

    const root = document.querySelector('.app-main')
    const mo = new MutationObserver(() => { syncRect(); const s = document.getElementById('player-full-slot'); if (s) ro.observe(s) })
    if (root) mo.observe(root, { childList: true, subtree: true })

    return () => {
      mo.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', syncRect)
    }
  }, [pipActive, source, location.pathname])

  function clampPipRect(left: number, top: number, w: number, h: number): { x: number; y: number } {
    const margin = 8
    const maxL = Math.max(margin, window.innerWidth - w - margin)
    const maxT = Math.max(margin, window.innerHeight - h - margin)
    return {
      x: Math.min(maxL, Math.max(margin, left)),
      y: Math.min(maxT, Math.max(margin, top)),
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container || !pipActive) return
    const W = pipWidth
    const H = pipHeight
    const defaultLeft = window.innerWidth - W - 24
    const defaultTop  = window.innerHeight - H - 24
    const rawX = (pipPosition.x !== 0 || pipPosition.y !== 0) ? pipPosition.x : defaultLeft
    const rawY = (pipPosition.x !== 0 || pipPosition.y !== 0) ? pipPosition.y : defaultTop
    const { x, y } = clampPipRect(rawX, rawY, W, H)
    container.style.visibility    = 'visible'
    container.style.position      = 'fixed'
    container.style.left          = x + 'px'
    container.style.top           = y + 'px'
    container.style.width         = W + 'px'
    container.style.height        = H + 'px'
    container.style.borderRadius  = '10px'
    container.style.boxShadow     = '0 8px 40px rgba(0,0,0,0.7)'
    container.style.cursor        = 'grab'
    if (x !== rawX || y !== rawY) setPipPosition({ x, y })
  }, [pipActive, pipWidth, pipHeight, pipPosition.x, pipPosition.y, setPipPosition])

  useEffect(() => {
    if (!pipActive) return
    function onWinResize() {
      const c = containerRef.current
      if (!c) return
      const r = c.getBoundingClientRect()
      const { x, y } = clampPipRect(r.left, r.top, r.width, r.height)
      if (x !== r.left || y !== r.top) {
        c.style.left = `${x}px`
        c.style.top = `${y}px`
        setPipPosition({ x, y })
      }
    }
    window.addEventListener('resize', onWinResize)
    return () => window.removeEventListener('resize', onWinResize)
  }, [pipActive, pipWidth, pipHeight, setPipPosition])

  const dragState = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null)
  const resizeState = useRef<{ startX: number; startY: number; startW: number; startH: number } | null>(null)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!pipActive) return
    // Don't start drag on control buttons
    if ((e.target as HTMLElement).closest('.pip-drag-block')) return
    const container = containerRef.current!
    const rect = container.getBoundingClientRect()
    dragState.current = { startX: e.clientX, startY: e.clientY, origLeft: rect.left, origTop: rect.top }
    container.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!pipActive) return
    e.stopPropagation()
    const container = containerRef.current!
    const rect = container.getBoundingClientRect()
    resizeState.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height }
    container.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const container = containerRef.current
    if (!container) return

    if (resizeState.current) {
      const dw = e.clientX - resizeState.current.startX
      const minW = 200
      const minH = 112
      const maxW = Math.min(window.innerWidth - 16, 960)
      const maxH = Math.min(window.innerHeight - 16, 540)
      let nw = Math.round(resizeState.current.startW + dw)
      nw = Math.min(maxW, Math.max(minW, nw))
      let nh = Math.round((nw * 9) / 16)
      nh = Math.min(maxH, Math.max(minH, nh))
      nw = Math.round((nh * 16) / 9)
      setPipSize(nw, nh)
      const rect = container.getBoundingClientRect()
      const { x, y } = clampPipRect(rect.left, rect.top, nw, nh)
      container.style.left = `${x}px`
      container.style.top = `${y}px`
      container.style.width = `${nw}px`
      container.style.height = `${nh}px`
      return
    }

    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    const newLeft = dragState.current.origLeft + dx
    const newTop  = dragState.current.origTop  + dy
    const w = container.offsetWidth
    const h = container.offsetHeight
    const { x, y } = clampPipRect(newLeft, newTop, w, h)
    container.style.left = `${x}px`
    container.style.top  = `${y}px`
  }

  function onPointerUp() {
    const container = containerRef.current
    if (resizeState.current && container) {
      const rect = container.getBoundingClientRect()
      const { x, y } = clampPipRect(rect.left, rect.top, rect.width, rect.height)
      setPipPosition({ x, y })
      if (x !== rect.left || y !== rect.top) {
        container.style.left = `${x}px`
        container.style.top = `${y}px`
      }
      resizeState.current = null
    }
    if (!dragState.current || !container) return
    const rect = container.getBoundingClientRect()
    const { x, y } = clampPipRect(rect.left, rect.top, rect.width, rect.height)
    setPipPosition({ x, y })
    if (x !== rect.left || y !== rect.top) {
      container.style.left = `${x}px`
      container.style.top = `${y}px`
    }
    dragState.current = null
  }

  function onDoubleClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('.pip-drag-block')) return
    if (!pipActive) {
      void toggleFullscreen()
      return
    }
    if ((e.target as HTMLElement).closest('.pip-resize')) return
    setPipActive(false)
    navigate('/player')
  }

  function getPlaybackTarget() {
    return playerInstanceRef.current ?? getVideoElement()
  }

  function revealControls() {
    if (pipActive) setShowPipChrome(true)
    else setShowFullControls(true)
  }

  function togglePlay() {
    const target = getPlaybackTarget()
    if (!target) return
    if ('paused' in target ? target.paused : target.paused()) {
      void target.play()
    } else {
      target.pause()
    }
    revealControls()
  }

  function seekTo(targetTime: number) {
    const nextTime = Math.max(0, Math.min(duration || 0, targetTime))
    const player = playerInstanceRef.current
    if (player) {
      player.currentTime(nextTime)
    } else {
      const vid = getVideoElement()
      if (vid) vid.currentTime = nextTime
    }
    revealControls()
  }

  function seekBy(delta: number) {
    seekTo(currentTime + delta)
  }

  function changeVolume(nextVolume: number) {
    const clamped = Math.min(1, Math.max(0, nextVolume))
    usePlayerStore.getState().setVolume(clamped)
    const player = playerInstanceRef.current
    if (player) player.volume(clamped)
    else {
      const vid = getVideoElement()
      if (vid) vid.volume = clamped
    }
    revealControls()
  }

  function toggleMute() {
    if (volume > 0) {
      changeVolume(0)
      return
    }
    changeVolume(prevVolumeRef.current || 1)
  }

  function changeSpeed(nextSpeed: number) {
    usePlayerStore.getState().setSpeed(nextSpeed)
    const player = playerInstanceRef.current
    if (player) player.playbackRate(nextSpeed)
    else {
      const vid = getVideoElement()
      if (vid) vid.playbackRate = nextSpeed
    }
    revealControls()
  }

  async function toggleFullscreen() {
    const container = containerRef.current
    if (!container) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    } else {
      await container.requestFullscreen?.()
    }
    revealControls()
  }

  function togglePipMode() {
    if (pipActive) {
      setPipActive(false)
      navigate('/player')
      return
    }
    setPipActive(true)
    if (location.pathname === '/player') navigate('/')
  }

  return (
    <div
      ref={containerRef}
      className={pipActive ? 'player-shell player-shell--pip' : 'player-shell'}
      style={{
        overflow: 'hidden',
        zIndex: pipActive ? 9999 : 10,
        transition: 'box-shadow 200ms, border-radius 200ms',
        // Hide (but keep mounted) until a source is loaded so that the video
        // element ref is always available for event-listener attachment above.
        ...(source ? {} : { display: 'none', pointerEvents: 'none' }),
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onMouseEnter={() => {
        setIsHoveringSurface(true)
        revealControls()
      }}
      onMouseMove={() => {
        revealControls()
      }}
      onMouseLeave={() => {
        setIsHoveringSurface(false)
      }}
    >
      <video
        ref={videoRefCallback}
        className="video-js vjs-streamvault-player vjs-big-play-centered"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }}
        playsInline
      />

      {!pipActive && source && (
        <>
          <div className={`player-overlay-top ${showFullControls ? 'is-visible' : ''}`}>
            <div className="player-overlay-pill">
              {source.platform ? <PlatformBadge platform={source.platform} size="sm" /> : null}
              <span className="player-overlay-title">{source.title}</span>
            </div>
          </div>

          <div className={`player-dock ${showFullControls ? 'is-visible' : ''}`}>
            <div className="player-dock-row player-dock-row--single">
              <button className="player-dock-btn" onClick={() => seekBy(-10)} title="Back 10 seconds">
                <Icon name="arrow-left-line" size={16} />
                <span className="player-dock-seek-label">10</span>
              </button>
              <button className="player-dock-btn player-dock-btn--primary" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                <Icon name={isPlaying ? 'pause-fill' : 'play-fill'} size={16} />
              </button>
              <button className="player-dock-btn" onClick={() => seekBy(10)} title="Forward 10 seconds">
                <span className="player-dock-seek-label">10</span>
                <Icon name="arrow-right-s-line" size={16} />
              </button>
              <span className="player-dock-time">{formatDuration(currentTime)}</span>
              <input
                className="player-dock-scrubber"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={currentTime}
                onChange={e => seekTo(Number(e.target.value))}
                style={{ '--pct': `${progressPct}%` } as React.CSSProperties}
              />
              <span className="player-dock-time">{formatDuration(duration || 0)}</span>
              <button className="player-dock-icon" onClick={toggleMute} title={volume === 0 ? 'Unmute' : 'Mute'}>
                <Icon name={volume === 0 ? 'volume-mute-line' : 'volume-up-line'} size={16} />
              </button>
              <input
                className="player-dock-volume"
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => changeVolume(Number(e.target.value))}
                style={{ '--pct': `${volumePct}%` } as React.CSSProperties}
              />
              <div className="player-speed-menu">
                <button
                  className={`player-rate-chip ${speedMenuOpen ? 'is-active' : ''}`}
                  onClick={() => setSpeedMenuOpen(v => !v)}
                  title="Playback speed"
                >
                  {speed}x
                </button>
                {speedMenuOpen && (
                  <div className="player-speed-menu-popover">
                    {SPEED_OPTIONS.map(option => (
                      <button
                        key={option}
                        className={`player-speed-option ${speed === option ? 'is-active' : ''}`}
                        onClick={() => {
                          changeSpeed(option)
                          setSpeedMenuOpen(false)
                        }}
                        title={`Set speed to ${option}x`}
                      >
                        {option}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className="player-dock-icon" onClick={togglePipMode} title="Pop out to mini player">
                <Icon name="picture-in-picture-line" size={16} />
              </button>
              <button className="player-dock-icon" onClick={toggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
                <Icon name="fullscreen-line" size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {pipActive && source && (
        <>
          <div className={`pip-ui ${showPipChrome ? 'is-visible' : ''}`}>
            <div className="pip-topbar">
              <div className="pip-title-pill">
                <span className="pip-title-text">{source.title}</span>
              </div>
              <div className="pip-topbar-actions pip-drag-block">
                <button className="pip-chip-btn" onPointerDown={e => e.stopPropagation()} onClick={togglePipMode} title="Return to player">
                  <Icon name="play-circle-line" size={16} />
                </button>
                <button className="pip-chip-btn pip-chip-btn--danger" onPointerDown={e => e.stopPropagation()} onClick={() => clear()} title="Unload player">
                  <Icon name="eject-line" size={16} />
                </button>
              </div>
            </div>

            <div className="pip-center-controls pip-drag-block">
              <button className="pip-center-btn" onPointerDown={e => e.stopPropagation()} onClick={() => seekBy(-10)} title="Back 10 seconds">
                <Icon name="arrow-left-line" size={16} />
              </button>
              <button className="pip-center-btn pip-center-btn--primary" onPointerDown={e => e.stopPropagation()} onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'}>
                <Icon name={isPlaying ? 'pause-fill' : 'play-fill'} size={20} />
              </button>
              <button className="pip-center-btn" onPointerDown={e => e.stopPropagation()} onClick={() => seekBy(10)} title="Forward 10 seconds">
                <Icon name="arrow-right-s-line" size={16} />
              </button>
            </div>

            <div className="pip-bottom">
              <span className="pip-time">{formatDuration(currentTime)}</span>
              <div className="pip-progress">
                <div
                  className="pip-progress-fill"
                  style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
              <span className="pip-time">{formatDuration(duration || 0)}</span>
            </div>
          </div>
          <div
            className="pip-resize"
            onPointerDown={onResizePointerDown}
            title="Resize"
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              zIndex: 3,
              width: 14,
              height: 14,
              cursor: 'nwse-resize',
              borderRadius: 3,
              background: 'linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.35) 50%)',
            }}
          />
        </>
      )}
    </div>
  )
}
