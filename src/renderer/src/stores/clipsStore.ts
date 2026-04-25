import { create } from 'zustand'

import type { Clip } from '../types/domain'

interface ClipsState {
  clips: Clip[]
  loading: boolean
  load: () => Promise<void>
  remove: (id: number) => Promise<void>
  update: (id: number, data: Partial<Clip>) => Promise<void>
}

export const useClipsStore = create<ClipsState>((set) => ({
  clips: [],
  loading: false,

  async load() {
    set({ loading: true })
    try {
      const data = (await window.electronAPI.clipsGetAll()) as Clip[]
      set({ clips: data })
    } finally {
      set({ loading: false })
    }
  },

  async remove(id) {
    await window.electronAPI.clipsDelete(id)
    set((s) => ({ clips: s.clips.filter((c) => c.id !== id) }))
  },

  async update(id, data) {
    await window.electronAPI.clipsUpdate(id, data)
    set((s) => ({ clips: s.clips.map((c) => (c.id === id ? { ...c, ...data } : c)) }))
  },
}))
