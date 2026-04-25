import { useEffect, useRef } from 'react'

import { Outlet, useLocation } from 'react-router'

import { usePlayerPipGuard } from '../../hooks/usePlayerPipGuard'
import { routeContentEnter, shellStageReveal } from '../../utils/anime'
import { CommandPalette } from '../CommandPalette'
import { PersistentVideoMount } from '../player/PersistentVideoMount'
import { Sidebar } from './Sidebar'
import { TelemetryBar } from './TelemetryBar'
import { TitleBar } from './TitleBar'
import { WindowControlsDock } from './WindowControlsDock'
import './app-shell.css'

function RoutedContent() {
  const location = useLocation()
  const outletRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = outletRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      routeContentEnter(el)
    })
    return () => cancelAnimationFrame(id)
  }, [location.pathname])

  return (
    <div ref={outletRef} className="app-outlet-surface">
      <Outlet />
    </div>
  )
}

export function AppShell() {
  usePlayerPipGuard()
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    shellStageReveal(el)
  }, [])

  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-shell-maincol">
        <svg className="viewport-logo" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="#7c6af7" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" />
          <circle cx="12" cy="12" r="4" fill="#ef4444" opacity="0.5">
            <animate attributeName="r" values="4;7;4" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.5;0;0.5" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </svg>
        <div className="app-body">
          <Sidebar />
          <div ref={stageRef} className="app-stage">
            <main className="app-main">
              <RoutedContent />
            </main>
          </div>
        </div>
        <WindowControlsDock />
        <TelemetryBar />
      </div>
      <PersistentVideoMount />
      <CommandPalette />
    </div>
  )
}
