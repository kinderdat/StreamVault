import { create } from 'zustand'
import type { Recording } from '../types/domain'

interface RecordingsState {
  recordings: Recording[]
  activeIds: Set<number>
  loading: boolean
  load: () => Promise<void>
  delete: (id: number) => Promise<void>
  stop: (id: number) => Promise<void>
  markCompleted: (id: number) => void
  markFailed: (id: number) => void
  addActive: (id: number) => void
  updateSnapshot: (id: number, snapshotPath: string) => void
  updateMeta: (id: number, meta: Partial<Recording>) => void
  updateSize: (id: number, fileSize: number) => void
}

export const useRecordingsStore = create<RecordingsState>((set, get) => ({
  recordings: [],
  activeIds: new Set(),
  loading: false,

  async load() {
    set({ loading: true })
    const data = await window.electronAPI.recordingsGetAll()
    const recs = data as Recording[]
    const activeIds = new Set<number>(recs.filter(r => r.status === 'recording').map(r => r.id))
    set({ recordings: recs, activeIds, loading: false })
  },

  async delete(id: number) {
    await window.electronAPI.recordingsDelete(id)
    set(state => ({
      recordings: state.recordings.filter(r => r.id !== id),
      activeIds: new Set([...state.activeIds].filter(x => x !== id)),
    }))
  },

  async stop(id: number) {
    // Immediately reflect processing state in store so UI updates right away
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, status: 'processing' as const } : r
      ),
      activeIds: new Set([...state.activeIds].filter(x => x !== id)),
    }))
    await window.electronAPI.recordingsStop(id)
  },

  markCompleted(id: number) {
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, status: 'completed' as const, completed_at: Date.now() } : r
      ),
      activeIds: new Set([...state.activeIds].filter(x => x !== id)),
    }))
  },

  markFailed(id: number) {
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, status: 'failed' as const } : r
      ),
      activeIds: new Set([...state.activeIds].filter(x => x !== id)),
    }))
  },

  addActive(id: number) {
    set(state => ({ activeIds: new Set([...state.activeIds, id]) }))
    get().load()
  },

  updateSnapshot(id: number, snapshotPath: string) {
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, thumbnail_path: snapshotPath } : r
      ),
    }))
  },

  updateMeta(id: number, meta: Partial<Recording>) {
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, ...meta } : r
      ),
    }))
  },

  updateSize(id: number, fileSize: number) {
    set(state => ({
      recordings: state.recordings.map(r =>
        r.id === id ? { ...r, file_size_bytes: fileSize } : r
      ),
    }))
  },
}))
