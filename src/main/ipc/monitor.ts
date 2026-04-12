import { ipcMain } from 'electron'
import { getMonitorStatus, setPollingInterval, startMonitor, stopMonitor } from '../monitor'
import { store } from './settings'

export function registerMonitorIpc(): void {
  ipcMain.handle('monitor:getStatus', () => getMonitorStatus())

  ipcMain.handle('monitor:setInterval', (_event, secs: number) => {
    store.set('pollingIntervalSecs', secs)
    setPollingInterval(secs)
  })

  ipcMain.handle('monitor:pause', () => stopMonitor())

  ipcMain.handle('monitor:resume', () => {
    // mainWindow is stored in monitor.ts; re-importing won't have it
    // Signal is sent via IPC so renderer can't pause without the window reference
    // We call setPollingInterval with current setting
    const secs = (store.get('pollingIntervalSecs') as number | undefined) ?? 60
    setPollingInterval(secs)
  })
}
