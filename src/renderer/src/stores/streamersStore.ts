import { create } from 'zustand'
import type { Streamer } from '../types/domain'

interface StreamersState {
  streamers: Streamer[]
  load: () => Promise<void>
  add: (channelUrl: string) => Promise<Streamer>
  remove: (id: number) => Promise<void>
  setActive: (id: number, active: boolean) => Promise<void>
  checkNow: (id: number) => Promise<void>
}

export const useStreamersStore = create<StreamersState>((set, get) => ({
  streamers: [],

  async load() {
    const data = await window.electronAPI.streamersGetAll()
    set({ streamers: data as Streamer[] })
    // Background: fetch avatars for any streamers that are missing one.
    // streamersRefreshAvatars returns the full updated list — apply it directly.
    window.electronAPI.streamersRefreshAvatars().then(updated => {
      set({ streamers: updated as Streamer[] })
    }).catch(() => {})
  },

  async add(channelUrl: string) {
    const newStreamer = await window.electronAPI.streamersAdd(channelUrl) as Streamer
    set(state => ({ streamers: [newStreamer, ...state.streamers] }))
    return newStreamer
  },

  async remove(id: number) {
    await window.electronAPI.streamersRemove(id)
    set(state => ({ streamers: state.streamers.filter(s => s.id !== id) }))
  },

  async setActive(id: number, active: boolean) {
    await window.electronAPI.streamersSetActive(id, active)
    set(state => ({
      streamers: state.streamers.map(s =>
        s.id === id ? { ...s, is_active: active ? 1 : 0 } : s
      )
    }))
  },

  async checkNow(id: number) {
    await window.electronAPI.streamersCheckNow(id)
    await get().load()
  },
}))
