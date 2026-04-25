import { useRecordingsStore } from '../../stores/recordingsStore'
import { SidebarItem } from './SidebarItem'
import './sidebar.css'

export function Sidebar() {
  const activeIds = useRecordingsStore((s) => s.activeIds)

  return (
    <aside className="sidebar">
      <div className="sidebar-center">
        <nav className="sidebar-nav-dock" aria-label="Primary">
          <SidebarItem to="/" icon="layout-grid-line" label="Dashboard" />
          <SidebarItem
            to="/recordings"
            icon="play-circle-line"
            label="Recordings"
            badge={activeIds.size || undefined}
          />
          <SidebarItem to="/streamers" icon="user-3-line" label="Streamers" />
          <SidebarItem to="/player" icon="tv-2-line" label="Player" />
          <SidebarItem to="/clips" icon="scissors-2-line" label="Clips" />
          <SidebarItem to="/settings" icon="settings-3-line" label="Settings" />
        </nav>
      </div>
    </aside>
  )
}
