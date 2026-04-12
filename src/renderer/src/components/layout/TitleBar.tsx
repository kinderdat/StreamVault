import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    const off = window.electronAPI.onMaximizeChange(setIsMaximized)
    return off
  }, [])

  return (
    <div className="titlebar" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="titlebar-identity" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* StreamVault logo: red recording dot */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#7c6af7" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" opacity="0.5">
            <animate attributeName="r" values="4;7;4" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </svg>
        <span className="titlebar-name">StreamVault</span>
      </div>

      <div className="titlebar-drag" />

      <div className="titlebar-controls" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button className="win-btn win-btn-min" onClick={() => window.electronAPI.minimize()} aria-label="Minimize">
          <Minus size={12} />
        </button>
        <button className="win-btn win-btn-max" onClick={() => window.electronAPI.maximize()} aria-label={isMaximized ? 'Restore' : 'Maximize'}>
          {isMaximized ? <Square size={11} /> : <Maximize2 size={11} />}
        </button>
        <button className="win-btn win-btn-close" onClick={() => window.electronAPI.close()} aria-label="Close">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}
