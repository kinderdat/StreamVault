import { app, BrowserWindow, shell, ipcMain, protocol, Tray, Menu, nativeImage } from 'electron'
import { join, extname } from 'path'
import { existsSync, statSync, createReadStream } from 'fs'
import { Readable } from 'stream'
import { cleanupPlaybackCache, ensurePlayableMp4, mediaRequestToFilePath, prepareLocalPlaybackHref } from './mediaPrepare'

let isQuitting = false

// ── Codec flags (before app.whenReady) ───────────────────────────
app.commandLine.appendSwitch('enable-features',
  'PlatformHEVCDecoderSupport,HardwareMediaKeyHandling,MediaSessionService'
)
app.commandLine.appendSwitch('enable-accelerated-video-decode')
app.commandLine.appendSwitch('enable-gpu-rasterization')
// Keep Chromium in full-resolution rendering mode on Windows displays
app.commandLine.appendSwitch('high-dpi-support', '1')
app.commandLine.appendSwitch('force-device-scale-factor', '1')

// ── media:// protocol — serves local files (images + video with range support) ──
// Must register scheme before app is ready
protocol.registerSchemesAsPrivileged([{
  scheme: 'media',
  privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true, stream: true },
}])

import { registerWindowIpc } from './ipc/window'
import { registerSettingsIpc } from './ipc/settings'
import { registerStreamersIpc, setStreamersWindow } from './ipc/streamers'
import { registerRecordingsIpc } from './ipc/recordings'
import { registerMonitorIpc } from './ipc/monitor'
import { registerClipsIpc } from './ipc/clips'
import { setMainWindow, stopAll, killAllProcesses } from './recorder'
import { startMonitor, stopMonitor } from './monitor'
import { store } from './ipc/settings'

ipcMain.handle('media:preparePlayback', async (_e, rawPath: unknown) => {
  if (typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new Error('Invalid path')
  }
  return prepareLocalPlaybackHref(rawPath)
})

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function resolveTrayIcon(): Electron.NativeImage {
  const candidates = [
    join(process.resourcesPath, 'icon.ico'),
    join(process.resourcesPath, 'icon.png'),
    join(app.getAppPath(), 'resources', 'icon.ico'),
    join(app.getAppPath(), 'resources', 'icon.png'),
    join(__dirname, '../../resources/icon.ico'),
    join(__dirname, '../../resources/icon.png'),
    process.execPath,
  ]

  for (const iconPath of candidates) {
    if (!existsSync(iconPath)) continue
    const image = nativeImage.createFromPath(iconPath)
    if (!image.isEmpty()) {
      return image.resize({ width: 16, height: 16 })
    }
  }

  // High-contrast fallback so tray icon is always visible.
  return nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAv0lEQVQoz53SMUoDQRAG4E8R0QhW8Qm2lnY2Vha2Ns7A0sJCSy0tLMTCQhI8g2i0EbxAJWJrY2FhWJj8k8n6DIf5mR3+79j5mQEeQWz6b4A2q6B8j4QkJwR2r9mJ+E2K6m8xJfQ6JkqfQx0p6Q3Qy5G8mQ7wqQ6h6tG0k8z5rQf4k1Vj2jvN0mJfR7rN9wH3y4wC4yqHq0QxkN9hM1b6f2u8Lz+q0G3i9j2r8s2v8zvYHn0YQw3Y1v0x8Q0y9vF7N4y5F1n0m5Vn0o8o2j9g8f5nQfQf3N5xk2W0tJd1gAAAABJRU5ErkJggg=='
  )
}

function createWindow(): void {
  protocol.handle('media', async (request) => {
    try {
      let filePath = mediaRequestToFilePath(request.url)
      if (!filePath || !existsSync(filePath)) {
        console.warn('[media] not found or bad URL', request.url, '→', filePath)
        return new Response('Not found', { status: 404 })
      }

      let ext = extname(filePath).toLowerCase()

      // Chromium cannot decode video/mp2t on Windows — transparently remux .ts → MP4
      if (ext === '.ts') {
        const playable = await ensurePlayableMp4(filePath)
        if (playable) {
          filePath = playable
          ext = '.mp4'
        }
      }

      const mime =
        ext === '.mp4'  ? 'video/mp4' :
        ext === '.ts'   ? 'video/mp2t' :
        ext === '.mkv'  ? 'video/x-matroska' :
        ext === '.webm' ? 'video/webm' :
        ext === '.mov'  ? 'video/quicktime' :
        ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
        ext === '.png'  ? 'image/png'  :
        ext === '.webp' ? 'image/webp' : 'application/octet-stream'

      const stat = statSync(filePath)
      const fileSize = stat.size
      const rangeHeader = request.headers.get('range')

      if (rangeHeader) {
        const [, rangeStr] = rangeHeader.split('=')
        const [startStr, endStr] = (rangeStr ?? '').split('-')
        const start = parseInt(startStr, 10)
        const end = endStr ? parseInt(endStr, 10) : fileSize - 1
        if (!Number.isFinite(start) || start < 0 || end < start || start >= fileSize) {
          return new Response('Invalid range', { status: 416 })
        }
        const chunkSize = end - start + 1
        const stream = createReadStream(filePath, { start, end })
        const body = Readable.toWeb(stream) as ReadableStream
        return new Response(body, {
          status: 206,
          headers: {
            'Content-Type': mime,
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
          },
        })
      }

      const stream = createReadStream(filePath)
      const body = Readable.toWeb(stream) as ReadableStream
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(fileSize),
        },
      })
    } catch (e) {
      console.error('[media] handler error', request.url, e)
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
      // Local <video> + Vite dev (http://): allow loading media:// / file resources reliably.
      webSecurity: false,
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
  const trayIcon = resolveTrayIcon()
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
    if (isSafeExternalUrl(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  registerWindowIpc(mainWindow)
  registerSettingsIpc()
  registerStreamersIpc()
  registerRecordingsIpc()
  registerMonitorIpc()
  registerClipsIpc()

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    if (isSafeExternalUrl(url)) await shell.openExternal(url)
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

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(createWindow)
app.whenReady().then(() => cleanupPlaybackCache())

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

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

// Also catch SIGTERM / SIGINT (Task Manager, Ctrl+C in terminal)
process.on('SIGTERM', () => { killAllProcesses(); process.exit(0) })
process.on('SIGINT',  () => { killAllProcesses(); process.exit(0) })
