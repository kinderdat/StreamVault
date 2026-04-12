import { useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { badgePulse } from '../../utils/anime'

interface SidebarItemProps {
  to: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  badge?: number
}

export function SidebarItem({ to, icon: Icon, label, collapsed, badge }: SidebarItemProps) {
  const badgeRef = useRef<HTMLSpanElement>(null)
  const prevBadge = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (
      badgeRef.current &&
      badge != null &&
      badge > 0 &&
      prevBadge.current != null &&
      badge !== prevBadge.current
    ) {
      badgePulse(badgeRef.current)
    }
    prevBadge.current = badge
  }, [badge])

  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        ['sidebar-item', isActive ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')
      }
      title={collapsed ? label : undefined}
    >
      <span className="sidebar-item-icon">
        <Icon size={20} strokeWidth={1.75} />
        {badge != null && badge > 0 && (
          <span ref={badgeRef} className="sidebar-badge">{badge > 99 ? '99+' : badge}</span>
        )}
      </span>
      <span className={['sidebar-item-label', collapsed ? 'sidebar-item-label--hidden' : ''].filter(Boolean).join(' ')}>
        {label}
      </span>
    </NavLink>
  )
}
