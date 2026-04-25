import { useEffect, useRef } from 'react'

import { NavLink } from 'react-router'

import { badgePulse } from '../../utils/anime'
import { Icon } from '../Icon'

interface SidebarItemProps {
  to: string
  icon: string
  label: string
  badge?: number
}

export function SidebarItem({ to, icon: iconName, label, badge }: SidebarItemProps) {
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
      title={label}
      className={({ isActive }) =>
        ['sidebar-item', isActive ? 'sidebar-item--active' : ''].filter(Boolean).join(' ')
      }
    >
      <span className="sidebar-item-icon">
        <Icon name={iconName} size={22} />
        {badge != null && badge > 0 && (
          <span ref={badgeRef} className="sidebar-badge">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </span>
      <span className="sidebar-item-label visually-hidden">{label}</span>
    </NavLink>
  )
}
