import { Icon } from '@renderer/components/Icon'
import { usePlayerStore } from '@renderer/stores/playerStore'

export function Player() {
  const source = usePlayerStore((s) => s.source)

  if (!source) {
    return (
      <div className="page">
        <div className="empty-state">
          <Icon name="play-circle-line" size={20} className="empty-state-icon" />
          <h3>Nothing playing</h3>
          <p>Click the play button on any recording or clip to watch it here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page player-page">
      <div id="player-full-slot" className="player-full-slot" />
    </div>
  )
}
