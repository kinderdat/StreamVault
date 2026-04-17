import { ipcMain } from 'electron'
import { getMonitorStatus, setPollingInterval, stopMonitor } from '../monitor'
import { store } from './settings'

export function registerMonitorIpc(): void {
  ipcMain.handle('monitor:getStatus', () => getMonitorStatus())

  ipcMain.handle('monitor:setInterval', (_event, secs: number) => {
    const safeSecs = Number.isFinite(secs) ? Math.max(10, Math.round(secs)) : 10
    store.set('pollingIntervalSecs', safeSecs)
    setPollingInterval(safeSecs)
  })

  ipcMain.handle('monitor:pause', () => stopMonitor())

  ipcMain.handle('monitor:resume', () => {
    // mainWindow is stored in monitor.ts; re-importing won't have it
    // Signal is sent via IPC so renderer can't pause without the window reference
    // We call setPollingInterval with current setting
    const secs = Math.max(10, Number((store.get('pollingIntervalSecs') as number | undefined) ?? 10) || 10)
    setPollingInterval(secs)
  })
}
