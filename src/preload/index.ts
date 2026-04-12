import { contextBridge, ipcRenderer } from 'electron'

type Unsubscribe = () => void

const electronAPI = {
  // Window
  minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
  maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
  close: (): Promise<void> => ipcRenderer.invoke('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:isMaximized'),
  onMaximizeChange: (cb: (maximized: boolean) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, v: boolean) => cb(v)
    ipcRenderer.on('window:maximized', h)
    return () => ipcRenderer.off('window:maximized', h)
  },

  // Settings
  getSetting: (key: string): Promise<unknown> => ipcRenderer.invoke('settings:get', key),
  setSetting: (key: string, value: unknown): Promise<void> => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: (): Promise<Record<string, unknown>> => ipcRenderer.invoke('settings:getAll'),
  pickFolder: (): Promise<string | null> => ipcRenderer.invoke('settings:pickFolder'),
  getDiskSpace: (folderPath: string): Promise<{ free: number; total: number } | null> =>
    ipcRenderer.invoke('settings:getDiskSpace', folderPath),
  openAppDataFolder: (): Promise<void> => ipcRenderer.invoke('settings:openAppData'),
  openRecordingsFolder: (): Promise<void> => ipcRenderer.invoke('settings:openRecordingsFolder'),

  // Streamers
  streamersGetAll: (): Promise<unknown[]> => ipcRenderer.invoke('streamers:getAll'),
  streamersAdd: (channelUrl: string): Promise<unknown> => ipcRenderer.invoke('streamers:add', channelUrl),
  streamersRemove: (id: number): Promise<void> => ipcRenderer.invoke('streamers:remove', id),
  streamersSetActive: (id: number, active: boolean): Promise<void> =>
    ipcRenderer.invoke('streamers:setActive', id, active),
  streamersCheckNow: (id: number): Promise<void> => ipcRenderer.invoke('streamers:checkNow', id),
  streamersRefreshAvatars: (): Promise<unknown[]> => ipcRenderer.invoke('streamers:refreshAvatars'),

  // Recordings
  recordingsGetAll: (): Promise<unknown[]> => ipcRenderer.invoke('recordings:getAll'),
  recordingsGetByStreamer: (streamerId: number): Promise<unknown[]> =>
    ipcRenderer.invoke('recordings:getByStreamer', streamerId),
  recordingsGetById: (id: number): Promise<unknown> => ipcRenderer.invoke('recordings:getById', id),
  recordingsGetStats: (): Promise<{ total: number; active: number; failed: number; total_duration: number; last_24h: number }> =>
    ipcRenderer.invoke('recordings:getStats'),
  recordingsClearFailed: (): Promise<void> => ipcRenderer.invoke('recordings:clearFailed'),
  recordingsStop: (id: number): Promise<void> => ipcRenderer.invoke('recordings:stop', id),
  recordingsDelete: (id: number): Promise<void> => ipcRenderer.invoke('recordings:delete', id),
  recordingsOpenFolder: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('recordings:openFolder', filePath),
  recordingsOpenFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('recordings:openFile', filePath),

  // Monitor
  monitorGetStatus: (): Promise<{ running: boolean; nextTickIn: number; activeRecordingIds: number[] }> =>
    ipcRenderer.invoke('monitor:getStatus'),
  monitorSetInterval: (secs: number): Promise<void> =>
    ipcRenderer.invoke('monitor:setInterval', secs),
  monitorPause: (): Promise<void> => ipcRenderer.invoke('monitor:pause'),
  monitorResume: (): Promise<void> => ipcRenderer.invoke('monitor:resume'),

  // Shell
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),

  // Updater
  updaterInstallAndRestart: (): Promise<void> => ipcRenderer.invoke('updater:installAndRestart'),
  onUpdaterAvailable: (cb: () => void): (() => void) => {
    const h = () => cb()
    ipcRenderer.on('updater:available', h)
    return () => ipcRenderer.off('updater:available', h)
  },
  onUpdaterDownloaded: (cb: () => void): (() => void) => {
    const h = () => cb()
    ipcRenderer.on('updater:downloaded', h)
    return () => ipcRenderer.off('updater:downloaded', h)
  },

  // Push events from main process
  onRecordingProgress: (cb: (data: { recordingId: number; percent?: number; fragments?: number }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number; percent?: number; fragments?: number }) => cb(d)
    ipcRenderer.on('recording:progress', h)
    return () => ipcRenderer.off('recording:progress', h)
  },
  onRecordingCompleted: (cb: (data: { recordingId: number }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number }) => cb(d)
    ipcRenderer.on('recording:completed', h)
    return () => ipcRenderer.off('recording:completed', h)
  },
  onRecordingFailed: (cb: (data: { recordingId: number; error: string }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number; error: string }) => cb(d)
    ipcRenderer.on('recording:failed', h)
    return () => ipcRenderer.off('recording:failed', h)
  },
  onStreamWentLive: (cb: (data: { streamerId: number; recordingId: number }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { streamerId: number; recordingId: number }) => cb(d)
    ipcRenderer.on('monitor:streamWentLive', h)
    return () => ipcRenderer.off('monitor:streamWentLive', h)
  },
  onRecordingSnapshot: (cb: (data: { recordingId: number; snapshotPath: string }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number; snapshotPath: string }) => cb(d)
    ipcRenderer.on('recording:snapshot', h)
    return () => ipcRenderer.off('recording:snapshot', h)
  },
  onRecordingMetaUpdate: (cb: (data: { recordingId: number; meta: Record<string, unknown> }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number; meta: Record<string, unknown> }) => cb(d)
    ipcRenderer.on('recording:metaUpdate', h)
    return () => ipcRenderer.off('recording:metaUpdate', h)
  },
  onRecordingSizeUpdate: (cb: (data: { recordingId: number; fileSize: number }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number; fileSize: number }) => cb(d)
    ipcRenderer.on('recording:sizeUpdate', h)
    return () => ipcRenderer.off('recording:sizeUpdate', h)
  },
  onRecordingStopping: (cb: (data: { recordingId: number }) => void): Unsubscribe => {
    const h = (_: Electron.IpcRendererEvent, d: { recordingId: number }) => cb(d)
    ipcRenderer.on('recording:stopping', h)
    return () => ipcRenderer.off('recording:stopping', h)
  },
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
