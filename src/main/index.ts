import { app, BrowserWindow, shell, ipcMain, protocol, Tray, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import { join, normalize, extname } from 'path'
import { existsSync, readFileSync } from 'fs'

let isQuitting = false

// ── Codec flags (before app.whenReady) ───────────────────────────
app.commandLine.appendSwitch('enable-features',
  'PlatformHEVCDecoderSupport,HardwareMediaKeyHandling,MediaSessionService'
)
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-gpu-rasterization')

// ── media:// protocol — serves local images (thumbnails/snapshots) ──
// Must register scheme before app is ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'media',
  privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true },
}])

import { registerWindowIpc } from './ipc/window'
import { registerSettingsIpc } from './ipc/settings'
import { registerStreamersIpc, setStreamersWindow } from './ipc/streamers'
import { registerRecordingsIpc } from './ipc/recordings'
import { registerMonitorIpc } from './ipc/monitor'
import { setMainWindow, stopAll, killAllProcesses } from './recorder'
import { startMonitor, stopMonitor } from './monitor'
import { store } from './ipc/settings'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow(): void {
  protocol.handle('media', (request) => {
    try {
      const url = new URL(request.url)
      const rawPath = decodeURIComponent(url.pathname)
      const filePath = normalize(process.platform === 'win32' ? rawPath.replace(/^\//, '') : rawPath)
      if (!existsSync(filePath)) return new Response('Not found', { status: 404 })
      const ext = extname(filePath).toLowerCase()
      const mime =
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.png'  ? 'image/png'  :
        ext === '.webp' ? 'image/webp' : 'application/octet-stream'
      const data = readFileSync(filePath)
      return new Response(data, { status: 200, headers: { 'Content-Type': mime } })
    } catch {
      return new Response('Error', { status: 500 })
    }
  })

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 620,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // webSecurity enabled (default true) — media:// protocol has its own CORS config
    },
  })

  if (process.platform === 'win32') {
    try { mainWindow.setBackgroundMaterial('acrylic') } catch { /* no-op */ }
  }

  mainWindow.on('ready-to-show', () => {
    const startMin = store.get('startMinimized') as boolean | undefined
    if (startMin) {
      mainWindow?.hide()
    } else {
      mainWindow?.show()
    }
  })

  // ── System tray ─────────────────────────────────────────────────
  const iconPath = join(__dirname, '../../resources/icon.ico')
  const trayIcon = existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createFromDataURL(
        // minimal 16x16 red square as fallback
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAH0lEQVQ4T2P8z8BQDwAEgAF/QualIQAAAABJRU5ErkJggg=='
      )
  tray = new Tray(trayIcon)
  tray.setToolTip('StreamVault')
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Show StreamVault', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.quit() } },
  ]))
  tray.on('click', () => {
    if (mainWindow?.isVisible()) { mainWindow.focus() }
    else { mainWindow?.show(); mainWindow?.focus() }
  })

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
      tray?.displayBalloon?.({
        title: 'StreamVault',
        content: 'Still running in the background. Active recordings continue.',
        icon: trayIcon,
      })
    }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  registerWindowIpc(mainWindow)
  registerSettingsIpc()
  registerStreamersIpc()
  registerRecordingsIpc()
  registerMonitorIpc()

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (/^https?:\/\//i.test(url)) await shell.openExternal(url)
  })

  ipcMain.handle('updater:installAndRestart', () => {
    isQuitting = true
    autoUpdater.quitAndInstall()
  })

  setMainWindow(mainWindow)
  setStreamersWindow(mainWindow)
  startMonitor(mainWindow)

  // ── Cleanup orphaned recordings from previous session ────────────
  // Any recording still marked 'recording' or 'processing' when the app starts
  // has no live process — mark them failed so the UI doesn't get stuck.
  try {
    const { getDb } = require('./db')
    getDb().prepare(
      "UPDATE recordings SET status = 'failed', completed_at = ? WHERE status IN ('recording', 'processing')"
    ).run(Date.now())
  } catch { /* ignore */ }

  // ── Auto-updater ─────────────────────────────────────────────────
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()
    autoUpdater.on('update-available', () => {
      mainWindow?.webContents.send('updater:available')
    })
    autoUpdater.on('update-downloaded', () => {
      mainWindow?.webContents.send('updater:downloaded')
    })
  }

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  // Don't quit — app lives in system tray. Only quit via tray menu or before-quit.
  if (process.platform === 'darwin') app.quit()
})

app.on('before-quit', async () => {
  isQuitting = true
  stopMonitor()
  killAllProcesses() // hard-kill immediately so no orphans
  await stopAll()    // graceful cleanup of DB state
})

process.on('uncaughtException', async (err) => {
  console.error('[uncaughtException]', err)
  stopMonitor()
  killAllProcesses()
  await stopAll()
})

// Also catch SIGTERM / SIGINT (Task Manager, Ctrl+C in terminal)
process.on('SIGTERM', () => { killAllProcesses(); process.exit(0) })
process.on('SIGINT',  () => { killAllProcesses(); process.exit(0) })
