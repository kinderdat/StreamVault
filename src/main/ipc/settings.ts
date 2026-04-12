import { ipcMain, app, dialog, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import path from 'path'
import { statfs } from 'fs/promises'

class JsonStore {
  private file: string | null = null
  private data: Record<string, unknown> = {}
  private name: string

  constructor(name: string) {
    this.name = name
  }

  private init(): void {
    if (this.file) return
    const dir = app.getPath('userData')
    mkdirSync(dir, { recursive: true })
    this.file = path.join(dir, `${this.name}.json`)
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf8'))
      } catch {
        this.data = {}
      }
    }
  }

  get(key: string): unknown {
    this.init()
    return this.data[key]
  }

  set(key: string, value: unknown): void {
    this.init()
    this.data[key] = value
    writeFileSync(this.file!, JSON.stringify(this.data, null, 2), 'utf8')
  }

  delete(key: string): void {
    this.init()
    delete this.data[key]
    writeFileSync(this.file!, JSON.stringify(this.data, null, 2), 'utf8')
  }

  getAll(): Record<string, unknown> {
    this.init()
    return { ...this.data }
  }
}

export const store = new JsonStore('streamvault-prefs')

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', (_event, key: string) => store.get(key))
  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => store.set(key, value))
  ipcMain.handle('settings:delete', (_event, key: string) => store.delete(key))
  ipcMain.handle('settings:getAll', () => store.getAll())

  ipcMain.handle('settings:pickFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('settings:getDiskSpace', async (_event, folderPath: string) => {
    try {
      const stats = await statfs(folderPath)
      return {
        free: stats.bfree * stats.bsize,
        total: stats.blocks * stats.bsize,
      }
    } catch {
      return null
    }
  })

  ipcMain.handle('settings:openAppData', async () => {
    await shell.openPath(app.getPath('userData'))
  })

  ipcMain.handle('settings:openRecordingsFolder', async () => {
    const p = (store.get('storagePath') as string | undefined)
      || path.join(require('os').homedir(), 'Videos', 'StreamVault')
    await shell.openPath(p)
  })
}
