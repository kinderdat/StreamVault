import { useEffect, useState } from 'react'

import { Icon } from '../Icon'

export function WindowControlsDock() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.electronAPI.isMaximized().then(setIsMaximized)
    const off = window.electronAPI.onMaximizeChange(setIsMaximized)
    return off
  }, [])

  return (
    <div className="window-controls-dock" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button className="side-win-btn side-win-btn-min" onClick={() => window.electronAPI.minimize()} aria-label="Minimize">
        <Icon name="subtract-line" size={18} />
      </button>
      <button
        className="side-win-btn side-win-btn-max"
        onClick={() => window.electronAPI.maximize()}
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? <Icon name="checkbox-blank-line" size={18} /> : <Icon name="window-line" size={18} />}
      </button>
      <button className="side-win-btn side-win-btn-close" onClick={() => window.electronAPI.close()} aria-label="Close">
        <Icon name="close-line" size={18} />
      </button>
    </div>
  )
}
