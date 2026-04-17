import { useState } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { PlatformBadge } from '../PlatformBadge'
import { CreateClipModal } from './CreateClipModal'
import { Icon } from '../Icon'

export function PlayerToolbar() {
  const source   = usePlayerStore(s => s.source)
  const clear    = usePlayerStore(s => s.clear)
  const [clipOpen, setClipOpen] = useState(false)

  if (!source) return null

  return (
    <div className="player-toolbar">
      <div className="player-toolbar-title">
        {source.platform && <PlatformBadge platform={source.platform} size="sm" />}
        <span className="player-toolbar-name">{source.title}</span>
      </div>
      <div className="player-toolbar-actions">
        <button
          className="btn btn-ghost"
          style={{ gap: 6, fontSize: 13 }}
          onClick={() => setClipOpen(true)}
          title="Create clip from current position"
        >
          <Icon name="scissors-2-line" size={16} /> Clip
        </button>
        <button
          className="btn btn-ghost player-unload-btn"
          style={{ gap: 6, fontSize: 13 }}
          onClick={() => clear()}
          title="Unload player"
        >
          <Icon name="eject-line" size={16} /> Unload
        </button>
      </div>

      <CreateClipModal
        open={clipOpen}
        onClose={() => setClipOpen(false)}
        source={source}
      />
    </div>
  )
}
