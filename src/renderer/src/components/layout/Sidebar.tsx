import { LayoutDashboard, Video, Settings, ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useRecordingsStore } from '../../stores/recordingsStore'
import { SidebarItem } from './SidebarItem'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const activeIds = useRecordingsStore(s => s.activeIds)

  return (
    <aside className={['sidebar', sidebarCollapsed ? 'sidebar--collapsed' : ''].filter(Boolean).join(' ')}>
      <nav className="sidebar-nav">
        <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" collapsed={sidebarCollapsed} />
        <SidebarItem to="/recordings" icon={Video} label="Recordings" collapsed={sidebarCollapsed} badge={activeIds.size || undefined} />
        <SidebarItem to="/streamers" icon={Users} label="Streamers" collapsed={sidebarCollapsed} />
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-bottom">
        <SidebarItem to="/settings" icon={Settings} label="Settings" collapsed={sidebarCollapsed} />
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  )
}
