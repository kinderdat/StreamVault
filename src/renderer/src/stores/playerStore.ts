import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { PlayerSource } from '../types/domain'

interface PlayerState {
  source: PlayerSource | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number // persisted
  speed: number // persisted
  pipActive: boolean
  pipPosition: { x: number; y: number } // persisted
  pipWidth: number
  pipHeight: number
  // Actions
  load: (source: PlayerSource) => void
  setPlaying: (v: boolean) => void
  setCurrentTime: (v: number) => void
  setDuration: (v: number) => void
  setVolume: (v: number) => void
  setSpeed: (v: number) => void
  setPipActive: (v: boolean) => void
  setPipPosition: (pos: { x: number; y: number }) => void
  setPipSize: (w: number, h: number) => void
  clear: () => void
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      source: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 1,
      speed: 1,
      pipActive: false,
      pipPosition: { x: 0, y: 0 },
      pipWidth: 320,
      pipHeight: 180,

      load: (source) => set({ source, isPlaying: false, currentTime: 0, duration: 0, pipActive: false }),
      setPlaying: (v) => set({ isPlaying: v }),
      setCurrentTime: (v) => set({ currentTime: v }),
      setDuration: (v) => set({ duration: v }),
      setVolume: (v) => set({ volume: v }),
      setSpeed: (v) => set({ speed: v }),
      setPipActive: (v) => set({ pipActive: v }),
      setPipPosition: (pos) => set({ pipPosition: pos }),
      setPipSize: (w, h) => set({ pipWidth: Math.round(w), pipHeight: Math.round(h) }),
      clear: () => set({ source: null, isPlaying: false, currentTime: 0, duration: 0, pipActive: false }),
    }),
    {
      name: 'streamvault-player',
      // Only persist user preferences — not ephemeral playback state
      partialize: (state) => ({
        volume: state.volume,
        speed: state.speed,
        pipPosition: state.pipPosition,
        pipWidth: state.pipWidth,
        pipHeight: state.pipHeight,
      }),
    },
  ),
)
