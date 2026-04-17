import { Icon } from '../components/Icon'
import { usePlayerStore } from '../stores/playerStore'
import { PlayerToolbar } from '../components/player/PlayerToolbar'

export function Player() {
  const source = usePlayerStore(s => s.source)

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
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0, padding: 0 }}>
      <PlayerToolbar />

      {/* Placeholder div that PersistentVideoMount mirrors with position:fixed */}
      <div
        id="player-full-slot"
        style={{
          flex: 1,
          minHeight: 0,
          background: '#000',
          position: 'relative',
        }}
      />
    </div>
  )
}
