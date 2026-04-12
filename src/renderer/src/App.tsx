import { useEffect } from 'react'
import { createHashRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Recordings } from './pages/Recordings'
import { RecordingDetail } from './pages/RecordingDetail'
import { Settings } from './pages/Settings'
import { Streamers } from './pages/Streamers'
import { useSettingsStore } from './stores/settingsStore'
import { useStreamersStore } from './stores/streamersStore'
import { useRecordingsStore } from './stores/recordingsStore'

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
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'recordings', element: <Recordings /> },
      { path: 'recordings/:id', element: <RecordingDetail /> },
      { path: 'streamers', element: <Streamers /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
])

export function App() {
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

    const off1 = window.electronAPI.onRecordingCompleted(({ recordingId }) => {
      markCompleted(recordingId)
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
      setTimeout(() => {
        loadRecordings()
        queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
      }, 2500) // reload after remux finishes
    })
    const off2 = window.electronAPI.onRecordingFailed(({ recordingId }) => {
      markFailed(recordingId)
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
    })
    const off3 = window.electronAPI.onStreamWentLive(({ recordingId }) => addActive(recordingId))
    const off4 = window.electronAPI.onRecordingSnapshot(({ recordingId, snapshotPath }) => {
      updateSnapshot(recordingId, snapshotPath)
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
    })
    const off5 = window.electronAPI.onRecordingMetaUpdate(({ recordingId, meta }) => {
      updateMeta(recordingId, meta as Partial<import('./types/domain').Recording>)
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
    })
    const off6 = window.electronAPI.onRecordingSizeUpdate(({ recordingId, fileSize }) => {
      updateSize(recordingId, fileSize)
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
    })
    const off7 = window.electronAPI.onRecordingStopping(({ recordingId }) => {
      // Mark processing immediately so the UI leaves "recording" state before remux completes
      queryClient.setQueryData(['recording', String(recordingId)], (old: unknown) => {
        if (old && typeof old === 'object' && 'status' in old) {
          return { ...old as object, status: 'processing' }
        }
        return old
      })
      queryClient.invalidateQueries({ queryKey: ['recording', String(recordingId)] })
    })

    return () => { off1(); off2(); off3(); off4(); off5(); off6(); off7() }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
