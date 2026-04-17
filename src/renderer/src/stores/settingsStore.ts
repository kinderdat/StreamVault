import { create } from 'zustand'

interface Settings {
  storagePath: string
  defaultQuality: string
  outputFormat: string        // 'mp4' | 'ts' | 'mkv'
  maxConcurrentRecordings: number
  pollingIntervalSecs: number
  notifications: boolean
  notifyOnComplete: boolean
  autoDeleteAfterDays: number // 0 = never
  startMinimized: boolean
  // New settings
  fileNamePattern: string     // e.g. '{streamer}_{date}_{time}'
  ytdlpPath: string           // override path to yt-dlp binary
  ffmpegPath: string          // override path to ffmpeg binary
  maxRetries: number          // yt-dlp --retries value
}

interface SettingsState extends Settings {
  settings: Settings          // expose as nested object for components that need raw access
  hydrate: () => Promise<void>
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>
}

const defaults: Settings = {
  storagePath: '',
  defaultQuality: '1080p60',
  outputFormat: 'mp4',
  maxConcurrentRecordings: 3,
  pollingIntervalSecs: 10,
  notifications: true,
  notifyOnComplete: false,
  autoDeleteAfterDays: 0,
  startMinimized: false,
  fileNamePattern: '{streamer}_{date}_{time}',
  ytdlpPath: '',
  ffmpegPath: '',
  maxRetries: 3,
}

export const useSettingsStore = create<SettingsState>((setState, getState) => ({
  ...defaults,
  settings: defaults,

  async hydrate() {
    const all = await window.electronAPI.getAllSettings()
    const merged: Settings = {
      storagePath:             (all.storagePath as string)             ?? '',
      defaultQuality:          (all.defaultQuality as string)          ?? '1080p60',
      outputFormat:            (all.outputFormat as string)            ?? 'mp4',
      maxConcurrentRecordings: (all.maxConcurrentRecordings as number) ?? 3,
      pollingIntervalSecs:     (all.pollingIntervalSecs as number)     ?? 10,
      notifications:           (all.notifications as boolean)          ?? true,
      notifyOnComplete:        (all.notifyOnComplete as boolean)       ?? false,
      autoDeleteAfterDays:     (all.autoDeleteAfterDays as number)     ?? 0,
      startMinimized:          (all.startMinimized as boolean)         ?? false,
      fileNamePattern:         (all.fileNamePattern as string)         ?? '{streamer}_{date}_{time}',
      ytdlpPath:               (all.ytdlpPath as string)               ?? '',
      ffmpegPath:              (all.ffmpegPath as string)              ?? '',
      maxRetries:              (all.maxRetries as number)              ?? 3,
    }
    setState({ ...merged, settings: merged })
  },

  async set(key, value) {
    setState(state => ({ [key]: value, settings: { ...state.settings, [key]: value } } as Partial<SettingsState>))
    await window.electronAPI.setSetting(key, value)
  },
}))
