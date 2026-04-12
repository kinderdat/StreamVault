import { BrowserWindow, ipcMain } from 'electron'

export function registerWindowIpc(win: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => win.minimize())

  ipcMain.handle('window:maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.handle('window:close', () => win.close())

  ipcMain.handle('window:isMaximized', () => win.isMaximized())

  win.on('maximize', () => win.webContents.send('window:maximized', true))
  win.on('unmaximize', () => win.webContents.send('window:maximized', false))
}
