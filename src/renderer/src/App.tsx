import { useEffect, useState } from 'react'

import { RouterProvider, createHashRouter, useNavigate, useRouteError } from 'react-router'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { ClipsLibrary } from './features/clips/ClipsLibrary'
import { Dashboard } from './features/dashboard/Dashboard'
import { Player } from './features/player/Player'
import { Recordings } from './features/recordings/Recordings'
import { Settings } from './features/settings/Settings'
import { Streamers } from './features/streamers/Streamers'
import { useIpcListener } from './hooks/useIpcListener'
import { useRecordingsStore } from './stores/recordingsStore'
import { useSettingsStore } from './stores/settingsStore'
import { useStreamersStore } from './stores/streamersStore'
import './styles/shared/cmdk.css'
import './styles/shared/ui.css'

function RouteError() {
  const error = useRouteError() as Error | null
  const navigate = useNavigate()
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        gap: 16,
        padding: 32,
        fontFamily: 'var(--font-ui)',
      }}
    >
      <div style={{ fontSize: 32 }}>⚠</div>
      <h2 style={{ color: 'var(--text-display)', margin: 0, fontSize: 18, fontWeight: 700 }}>Page Error</h2>
      <p
        style={{
          color: 'var(--text-secondary)',
          margin: 0,
          fontSize: 13,
          textAlign: 'center',
          maxWidth: 420,
        }}
      >
        {error?.message ?? 'An unexpected error occurred on this page.'}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Go Home
        </button>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload App
        </button>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
const recordingQueryKey = (id: number | string) => ['recording', String(id)] as const

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard />, errorElement: <RouteError /> },
      { path: 'recordings', element: <Recordings />, errorElement: <RouteError /> },
      { path: 'streamers', element: <Streamers />, errorElement: <RouteError /> },
      { path: 'settings', element: <Settings />, errorElement: <RouteError /> },
      { path: 'player', element: <Player />, errorElement: <RouteError /> },
      { path: 'clips', element: <ClipsLibrary />, errorElement: <RouteError /> },
    ],
  },
])

export function App() {
  const [hydrated, setHydrated] = useState(false)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const hydrateSettings = useSettingsStore((s) => s.hydrate)
  const loadStreamers = useStreamersStore((s) => s.load)
  const loadRecordings = useRecordingsStore((s) => s.load)
  const markCompleted = useRecordingsStore((s) => s.markCompleted)
  const markFailed = useRecordingsStore((s) => s.markFailed)
  const addActive = useRecordingsStore((s) => s.addActive)
  const updateSnapshot = useRecordingsStore((s) => s.updateSnapshot)
  const updateMeta = useRecordingsStore((s) => s.updateMeta)
  const updateSize = useRecordingsStore((s) => s.updateSize)

  useEffect(() => {
    let cancelled = false
    Promise.allSettled([hydrateSettings(), loadStreamers(), loadRecordings()])
      .then((results) => {
        if (cancelled) return
        const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        if (failed.length > 0) {
          const reason = failed[0]?.reason
          const message = reason instanceof Error ? reason.message : String(reason ?? 'Unknown startup error')
          console.error('[bootstrap] init failed:', reason)
          setBootstrapError(message)
        }
        setHydrated(true)
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error ?? 'Unknown startup error')
        console.error('[bootstrap] unexpected init error:', error)
        setBootstrapError(message)
        setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useIpcListener(window.electronAPI.onRecordingCompleted, ({ recordingId }) => {
    markCompleted(recordingId)
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
    setTimeout(() => {
      loadRecordings()
      queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
    }, 2500) // reload after remux finishes
  })

  useIpcListener(window.electronAPI.onRecordingFailed, ({ recordingId }) => {
    markFailed(recordingId)
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  useIpcListener(window.electronAPI.onStreamWentLive, ({ recordingId }) => addActive(recordingId))

  useIpcListener(window.electronAPI.onRecordingSnapshot, ({ recordingId, snapshotPath }) => {
    updateSnapshot(recordingId, snapshotPath)
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  useIpcListener(window.electronAPI.onRecordingMetaUpdate, ({ recordingId, meta }) => {
    updateMeta(recordingId, meta as Partial<import('./types/domain').Recording>)
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  useIpcListener(window.electronAPI.onRecordingSizeUpdate, ({ recordingId, fileSize }) => {
    updateSize(recordingId, fileSize)
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  useIpcListener(window.electronAPI.onRecordingStopping, ({ recordingId }) => {
    // Mark processing immediately so the UI leaves "recording" state before remux completes
    queryClient.setQueryData(recordingQueryKey(recordingId), (old: unknown) => {
      if (old && typeof old === 'object' && 'status' in old) {
        return { ...(old as object), status: 'processing' }
      }
      return old
    })
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  if (!hydrated)
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--black)',
        }}
      >
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )

  if (bootstrapError) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 12,
          padding: 24,
          background: 'var(--black)',
          color: 'var(--text-display)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Startup failed</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 560 }}>
          StreamVault could not finish initializing. The app process is running, but the renderer failed to
          hydrate all required data.
        </p>
        <code style={{ color: '#fca5a5', textAlign: 'center', whiteSpace: 'pre-wrap' }}>{bootstrapError}</code>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          Reload App
        </button>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
