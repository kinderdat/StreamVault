import { useEffect } from 'react'

import { useLocation } from 'react-router'

import { usePlayerStore } from '../stores/playerStore'

/**
 * Watches route changes and manages PiP activation:
 * - Navigating TO /player → deactivate PiP
 *
 * Call once inside AppShell.
 */
export function usePlayerPipGuard() {
  const location = useLocation()
  const setPipActive = usePlayerStore((s) => s.setPipActive)

  useEffect(() => {
    if (location.pathname === '/player') setPipActive(false)
  }, [location.pathname, setPipActive])
}
