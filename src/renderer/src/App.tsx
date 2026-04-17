import { useEffect, useState } from 'react'
import { useIpcListener } from './hooks/useIpcListener'
import { createHashRouter, RouterProvider, useRouteError, useNavigate } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Recordings } from './pages/Recordings'
import { RecordingDetail, recordingQueryKey } from './pages/RecordingDetail'
import { Settings } from './pages/Settings'
import { Streamers } from './pages/Streamers'
import { Player } from './pages/Player'
import { ClipsLibrary } from './pages/ClipsLibrary'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useSettingsStore } from './stores/settingsStore'
import { useStreamersStore } from './stores/streamersStore'
import { useRecordingsStore } from './stores/recordingsStore'

function RouteError() {
  const error = useRouteError() as Error | null
  const navigate = useNavigate()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16, padding: 32, fontFamily: 'var(--font-ui)',
    }}>
      <div style={{ fontSize: 32 }}>⚠</div>
      <h2 style={{ color: 'var(--text-display)', margin: 0, fontSize: 18, fontWeight: 700 }}>
        Page Error
      </h2>
      <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: 13, textAlign: 'center', maxWidth: 420 }}>
        {error?.message ?? 'An unexpected error occurred on this page.'}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>Go Home</button>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload App</button>
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

const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Dashboard />, errorElement: <RouteError /> },
      { path: 'recordings', element: <Recordings />, errorElement: <RouteError /> },
      { path: 'recordings/:id', element: <RecordingDetail />, errorElement: <RouteError /> },
      { path: 'streamers', element: <Streamers />, errorElement: <RouteError /> },
      { path: 'settings', element: <Settings />, errorElement: <RouteError /> },
      { path: 'player', element: <Player />, errorElement: <RouteError /> },
      { path: 'clips', element: <ClipsLibrary />, errorElement: <RouteError /> },
    ],
  },
])

export function App() {
  const [hydrated, setHydrated] = useState(false)
  const hydrateSettings = useSettingsStore(s => s.hydrate)
  const loadStreamers  = useStreamersStore(s => s.load)
  const loadRecordings = useRecordingsStore(s => s.load)
  const markCompleted  = useRecordingsStore(s => s.markCompleted)
  const markFailed     = useRecordingsStore(s => s.markFailed)
  const addActive      = useRecordingsStore(s => s.addActive)
  const updateSnapshot = useRecordingsStore(s => s.updateSnapshot)
  const updateMeta     = useRecordingsStore(s => s.updateMeta)
  const updateSize     = useRecordingsStore(s => s.updateSize)

  useEffect(() => {
    Promise.all([hydrateSettings(), loadStreamers(), loadRecordings()])
      .then(() => setHydrated(true))
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
        return { ...old as object, status: 'processing' }
      }
      return old
    })
    queryClient.invalidateQueries({ queryKey: recordingQueryKey(recordingId) })
  })

  if (!hydrated) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--black)' }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
