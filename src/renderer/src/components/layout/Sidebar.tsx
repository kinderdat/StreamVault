import { Icon } from '../Icon'
import { useUIStore } from '../../stores/uiStore'
import { useRecordingsStore } from '../../stores/recordingsStore'
import { SidebarItem } from './SidebarItem'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const activeIds = useRecordingsStore(s => s.activeIds)

  return (
    <aside className={['sidebar', sidebarCollapsed ? 'sidebar--collapsed' : ''].filter(Boolean).join(' ')}>
      <nav className="sidebar-nav">
        <SidebarItem to="/" icon="layout-grid-line" label="Dashboard" collapsed={sidebarCollapsed} />
        <SidebarItem to="/recordings" icon="play-circle-line" label="Recordings" collapsed={sidebarCollapsed} badge={activeIds.size || undefined} />
        <SidebarItem to="/streamers" icon="user-3-line" label="Streamers" collapsed={sidebarCollapsed} />
        <SidebarItem to="/player" icon="tv-2-line" label="Player" collapsed={sidebarCollapsed} />
        <SidebarItem to="/clips" icon="scissors-2-line" label="Clips" collapsed={sidebarCollapsed} />
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-bottom">
        <SidebarItem to="/settings" icon="settings-3-line" label="Settings" collapsed={sidebarCollapsed} />
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <Icon name="arrow-right-s-line" size={16} /> : <Icon name="arrow-left-s-line" size={16} />}
        </button>
      </div>
    </aside>
  )
}
