import { useEffect } from 'react'

import { useLocation } from 'react-router'

import { usePlayerStore } from '../stores/playerStore'

export function usePlayerPipGuard() {
  const location = useLocation()
  const setPipActive = usePlayerStore((s) => s.setPipActive)

  useEffect(() => {
    if (location.pathname === '/player') setPipActive(false)
  }, [location.pathname, setPipActive])
}
