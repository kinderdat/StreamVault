import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'
import { usePlayerStore } from '../stores/playerStore'

/**
 * Watches route changes and manages PiP activation:
 * - Navigating AWAY from /player while something is loaded → activate PiP
 * - Navigating TO /player → deactivate PiP
 *
 * Call once inside AppShell.
 */
export function usePlayerPipGuard() {
  const location   = useLocation()
  const source     = usePlayerStore(s => s.source)
  const setPipActive = usePlayerStore(s => s.setPipActive)
  const prevPathRef  = useRef(location.pathname)

  useEffect(() => {
    const prev = prevPathRef.current
    const curr = location.pathname
    prevPathRef.current = curr

    if (curr === '/player') {
      setPipActive(false)
    } else if (prev === '/player' && source !== null) {
      setPipActive(true)
    }
  }, [location.pathname])
}
