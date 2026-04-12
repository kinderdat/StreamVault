import { spawn, ChildProcess } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { BrowserWindow, Notification } from 'electron'
import { statSync } from 'fs'
import { getBinPath, extractMetadata, extractThumbnail, captureSnapshot } from './ffmpeg'
import { recordings } from './db'
import { store } from './ipc/settings'
import { findKickVodM3u8 } from './platforms'
import { unlink } from 'fs/promises'
import { markRecordingFinished } from './state'

interface ActiveRecording {
  process: ChildProcess
  recordingId: number
  streamerId: number
  startedAt: number
  outputPath: string
  platform: string
  snapshotTimer?: ReturnType<typeof setInterval>
  forceKillTimer?: ReturnType<typeof setTimeout>
}

const active = new Map<number, ActiveRecording>()
// Track recordings the user explicitly stopped so the close handler treats them as complete, not failed
const manuallyStopped = new Set<number>()
let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow): void {
  mainWindow = win
}

function send(channel: string, data: unknown): void {
  mainWindow?.webContents.send(channel, data)
}

function getStoragePath(): string {
  const p = store.get('storagePath') as string | undefined
  return p || require('path').join(require('os').homedir(), 'Videos', 'StreamVault')
}

function getQualityFormat(quality?: string, platform?: string): string {
  // Twitch HLS exposes named quality tiers — filter selectors don't work
  if (platform === 'twitch') {
    switch (quality) {
      case '1080p60': return '1080p60/best'
      case '1080':    return '1080p60/1080p/best'
      case '720':     return '720p60/720p/best'
      case '480':     return '480p/best'
      default:        return 'best'
    }
  }
  // Kick HLS also uses named quality levels
  if (platform === 'kick') {
    switch (quality) {
      case '1080p60': return '1080p60/1080p/best'
      case '1080':    return '1080p/best'
      case '720':     return '720p60/720p/best'
      case '480':     return '480p/best'
      default:        return 'best'
    }
  }
  // YouTube and others support full yt-dlp format selectors
  switch (quality) {
    case '1080p60': return 'bestvideo[height<=1080][fps<=60]+bestaudio/bestvideo[height<=1080]+bestaudio/best'
    case '1080':    return 'bestvideo[height<=1080]+bestaudio/best'
    case '720':     return 'bestvideo[height<=720]+bestaudio/best'
    case '480':     return 'bestvideo[height<=480]+bestaudio/best'
    default:        return 'bestvideo[height<=1080][fps<=60]+bestaudio/bestvideo[height<=1080]+bestaudio/best'
  }
}

function sanitize(s: string): string {
  return s.replace(/[<>:"/\\|?*]/g, '_').slice(0, 80)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function buildFileName(streamer: string, platform: string, title?: string): string {
  const pattern = (store.get('fileNamePattern') as string | undefined) ?? '{streamer}_{date}_{time}'
  const now = new Date()
  return pattern
    .replace('{streamer}', sanitize(streamer))
    .replace('{platform}', platform)
    .replace('{date}', `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`)
    .replace('{time}', `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`)
    .replace('{title}', sanitize(title ?? 'stream'))
    .slice(0, 120)
}

export async function startRecording(
  recordingId: number,
  streamerId: number,
  channelUrl: string,
  platform: string,
  streamerName: string,
): Promise<void> {
  const storagePath = getStoragePath()
  mkdirSync(storagePath, { recursive: true })

  const outputFormat = (store.get('outputFormat') as string | undefined) ?? 'mp4'
  const baseName = buildFileName(streamerName, platform)
  const finalExt = outputFormat === 'ts' ? '.ts' : '.mp4'
  const finalPath = path.join(storagePath, baseName + finalExt)

  recordings.update(recordingId, { file_path: finalPath })

  // Kick VOD: use direct M3U8 + ffmpeg
  if (platform === 'kick_vod') {
    const m3u8 = await findKickVodM3u8(channelUrl)
    if (!m3u8) {
      recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
      send('recording:failed', { recordingId, error: 'Could not find Kick VOD M3U8 URL' })
      markRecordingFinished(streamerId)
      return
    }
    spawnFfmpegDownload(recordingId, streamerId, m3u8, finalPath, finalPath)
    return
  }

  const ytdlp = getBinPath('yt-dlp')
  const quality = store.get('defaultQuality') as string | undefined
  const format = getQualityFormat(quality, platform)

  // Use a temp .ts file during download (crash-safe), then ffmpeg remux to final format.
  // yt-dlp writes MPEG-TS segments live; remux happens after the stream ends.
  const tempPath = path.join(storagePath, baseName + '.ts')

  // --live-from-start only works on platforms that expose full VOD replay (e.g. YouTube).
  // Twitch/Kick don't support it — use --no-live-from-start to record from current position.
  const supportsLiveFromStart = platform === 'youtube'

  const args = [
    ...(supportsLiveFromStart ? ['--live-from-start'] : ['--no-live-from-start']),
    '--hls-use-mpegts',        // MPEG-TS during download (crash-safe for live streams)
    '--no-part',
    '--newline',
    '--progress',
    '--retries', String((store.get('maxRetries') as number | undefined) ?? 3),
    '--fragment-retries', String((store.get('maxRetries') as number | undefined) ?? 3),
    '--socket-timeout', '30',
    '--no-continue',
    '--format', format,
    '-o', tempPath,
    channelUrl,
  ]

  // Pipe stdin so we can send 'q' for graceful stop; pipe stdout/stderr for progress parsing
  const proc = spawn(ytdlp, args, { stdio: ['pipe', 'pipe', 'pipe'] })
  proc.stderr?.on('data', (d: Buffer) => console.log('[yt-dlp]', d.toString().trim()))
  // Must drain stdout — if we don't read it the process blocks on full pipe buffer
  // (actual progress parsing happens below on proc.stdout.on('data'))

  // ── Watchdog: kill if file stops growing (stream silently died) ──
  let lastSize = 0
  let staleTicks = 0
  const watchdog = setInterval(() => {
    if (!active.has(recordingId)) { clearInterval(watchdog); return }
    try {
      const { size } = statSync(tempPath)
      if (size === lastSize) {
        staleTicks++
        if (staleTicks >= 4) { // ~4 min of no growth
          console.log(`[recorder] watchdog: no file growth for ${staleTicks} ticks, killing ${recordingId}`)
          clearInterval(watchdog)
          proc.kill()
        }
      } else {
        staleTicks = 0
        lastSize = size
      }
    } catch { /* file not yet created */ }
  }, 60_000)
  const rec: ActiveRecording = { process: proc, recordingId, streamerId, startedAt: Date.now(), outputPath: tempPath, platform }
  active.set(recordingId, rec)

  // ── Early probe: 10s after start, run ffprobe on the temp .ts ──
  setTimeout(async () => {
    if (!active.has(recordingId)) return
    if (!existsSync(tempPath)) return
    const meta = await extractMetadata(tempPath)
    if (meta.videoCodec || meta.resolution) {
      recordings.update(recordingId, {
        video_codec: meta.videoCodec,
        audio_codec: meta.audioCodec,
        resolution: meta.resolution,
        fps: meta.fps,
        language: meta.language,
      })
      send('recording:metaUpdate', { recordingId, meta })
    }
  }, 10000)

  // ── Snapshot + file-size update every 30s ──────────────────────
  rec.snapshotTimer = setInterval(async () => {
    if (!existsSync(tempPath)) return
    try {
      const { size } = statSync(tempPath)
      recordings.update(recordingId, { file_size_bytes: size })
      send('recording:sizeUpdate', { recordingId, fileSize: size })
    } catch { /* ignore */ }
    const snapshotPath = tempPath.replace(/\.[^.]+$/, '_snap.jpg')
    const ok = await captureSnapshot(tempPath, snapshotPath)
    if (ok) {
      recordings.update(recordingId, { thumbnail_path: snapshotPath })
      send('recording:snapshot', { recordingId, snapshotPath })
    }
  }, 30000)
  setTimeout(async () => {
    if (!active.has(recordingId) || !existsSync(tempPath)) return
    const snapshotPath = tempPath.replace(/\.[^.]+$/, '_snap.jpg')
    const ok = await captureSnapshot(tempPath, snapshotPath)
    if (ok) {
      recordings.update(recordingId, { thumbnail_path: snapshotPath })
      send('recording:snapshot', { recordingId, snapshotPath })
    }
  }, 45000)

  proc.stdout.on('data', (data: Buffer) => {
    const line = data.toString().trim()
    const fragMatch = line.match(/Downloading segment (\d+)/)
    if (fragMatch) send('recording:progress', { recordingId, fragments: parseInt(fragMatch[1]) })
    const pctMatch = line.match(/(\d+\.?\d*)%/)
    if (pctMatch) send('recording:progress', { recordingId, percent: parseFloat(pctMatch[1]) })
  })

  proc.on('close', async (code) => {
    clearInterval(watchdog)
    if (rec.snapshotTimer) clearInterval(rec.snapshotTimer)
    if (rec.forceKillTimer) clearTimeout(rec.forceKillTimer) // cancel fallback if process exited cleanly
    active.delete(recordingId)
    const wasManualStop = manuallyStopped.delete(recordingId)
    console.log(`[recorder] yt-dlp exited (code ${code}, manual=${wasManualStop}) for recording ${recordingId}`)
    if (!wasManualStop && code !== 0) {
      // Unexpected error exit — set cooldown so monitor doesn't spam retries
      markRecordingFinished(streamerId)
      recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
      send('recording:failed', { recordingId, error: `yt-dlp exited with code ${code}` })
      return
    }
    // Clean end (stream over) or user manually stopped — both go through normal finish
    // Wrap in try/catch so a remux crash never leaves status stuck on 'processing'
    try {
      await onRecordingFinished(recordingId, tempPath, finalPath)
    } catch (err) {
      console.error('[recorder] onRecordingFinished threw unexpectedly:', err)
      try {
        recordings.update(recordingId, { status: 'failed', completed_at: Date.now(), file_path: existsSync(finalPath) ? finalPath : existsSync(tempPath) ? tempPath : undefined })
      } catch { /* db may also be broken — nothing left to do */ }
      send('recording:failed', { recordingId, error: String(err) })
    }
  })

  proc.on('error', async (err) => {
    clearInterval(watchdog)
    if (rec.snapshotTimer) clearInterval(rec.snapshotTimer)
    active.delete(recordingId)
    console.error('[recorder] yt-dlp spawn error:', err)
    recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
    send('recording:failed', { recordingId, error: 'yt-dlp spawn error' })
    markRecordingFinished(streamerId)
  })
}

function spawnFfmpegDownload(recordingId: number, streamerId: number, inputUrl: string, outputPath: string, finalPath: string): void {
  const ffmpeg = getBinPath('ffmpeg')
  // Download directly to mp4 with faststart for Kick VODs
  const proc = spawn(ffmpeg, ['-i', inputUrl, '-c', 'copy', '-movflags', '+faststart', '-y', finalPath])
  active.set(recordingId, { process: proc, recordingId, streamerId, startedAt: Date.now(), outputPath: finalPath, platform: 'kick_vod' })

  proc.on('close', async () => {
    active.delete(recordingId)
    markRecordingFinished(streamerId)
    await onRecordingFinished(recordingId, finalPath, finalPath)
  })
  proc.on('error', async () => {
    active.delete(recordingId)
    recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
    send('recording:failed', { recordingId, error: 'ffmpeg spawn error' })
    markRecordingFinished(streamerId)
  })
}

/** Remux with a hard timeout — spawns ffmpeg directly so we can kill it cleanly on timeout */
function remuxWithTimeout(tsPath: string, finalPath: string, timeoutMs = 120_000): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegBin = getBinPath('ffmpeg')
    if (!existsSync(ffmpegBin) || !existsSync(tsPath)) { resolve(false); return }

    console.log('[recorder] remuxing', tsPath, '->', finalPath)
    const proc = spawn(ffmpegBin, [
      '-i', tsPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      '-y',
      finalPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] })

    let stderr = ''
    proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString() })

    const killTimer = setTimeout(() => {
      console.warn('[recorder] remux timed out after', timeoutMs / 1000, 's — killing ffmpeg')
      try { proc.kill() } catch { /* already dead */ }
      resolve(false)
    }, timeoutMs)
    killTimer.unref()

    proc.on('close', (code) => {
      clearTimeout(killTimer)
      if (code !== 0) console.error('[recorder] remux failed (exit', code, '):\n', stderr.slice(-800))
      else console.log('[recorder] remux OK')
      resolve(code === 0)
    })
    proc.on('error', (err) => {
      clearTimeout(killTimer)
      console.error('[recorder] remux spawn error:', err)
      resolve(false)
    })
  })
}

async function onRecordingFinished(recordingId: number, tsPath: string, finalPath: string): Promise<void> {
  if (!existsSync(tsPath)) {
    recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
    send('recording:failed', { recordingId, error: 'Output file not found' })
    return
  }

  let finalFile = finalPath
  if (tsPath !== finalPath) {
    // Remux .ts → target container (stream copy, no re-encode)
    const ok = await remuxWithTimeout(tsPath, finalPath)
    if (ok) {
      try { await unlink(tsPath) } catch { /* ignore */ }
    } else {
      finalFile = tsPath
      recordings.update(recordingId, { file_path: tsPath })
    }
  }

  const meta = await extractMetadata(finalFile)
  const thumbPath = finalFile.replace(/\.[^.]+$/, '_thumb.jpg')
  await extractThumbnail(finalFile, thumbPath, Math.min(30, (meta.duration ?? 60) * 0.1))

  const rec = recordings.getById(recordingId) as { title?: string; streamer_id?: number } | undefined
  recordings.update(recordingId, {
    status: 'completed',
    completed_at: Date.now(),
    duration_secs: meta.duration,
    file_size_bytes: meta.fileSize,
    video_codec: meta.videoCodec,
    audio_codec: meta.audioCodec,
    resolution: meta.resolution,
    fps: meta.fps,
    language: meta.language,
    thumbnail_path: existsSync(thumbPath) ? thumbPath : undefined,
  })

  send('recording:completed', { recordingId })

  // Mark streamer on cooldown so monitor won't immediately re-start a recording
  if (rec?.streamer_id) markRecordingFinished(rec.streamer_id)

  if (store.get('notifyOnComplete') === true && Notification.isSupported()) {
    new Notification({
      title: 'Recording complete',
      body: rec?.title ?? 'A recording has finished.',
    }).show()
  }
}

export async function stopRecording(recordingId: number): Promise<void> {
  // Update DB and notify renderer BEFORE anything else — even orphaned recordings must unblock
  recordings.update(recordingId, { status: 'processing' as never })
  send('recording:stopping', { recordingId })

  const rec = active.get(recordingId)
  if (!rec) {
    console.log(`[recorder] stopRecording: no active process for id ${recordingId}, marking failed`)
    recordings.update(recordingId, { status: 'failed', completed_at: Date.now() })
    send('recording:failed', { recordingId, error: 'Process not found (orphaned recording)' })
    return
  }

  // Mark as manual stop BEFORE sending 'q' so the close handler routes to onRecordingFinished
  manuallyStopped.add(recordingId)
  if (rec.snapshotTimer) clearInterval(rec.snapshotTimer)
  markRecordingFinished(rec.streamerId)

  // Step 1 — Graceful: write 'q\n' so yt-dlp/ffmpeg finishes the current segment + writes trailer
  try {
    if (rec.process.stdin && !rec.process.stdin.destroyed) {
      rec.process.stdin.write('q\n')
      rec.process.stdin.end()
    }
  } catch { /* stdin already closed */ }

  // Step 2 — Force-kill watchdog: if process hasn't exited within 10 s, kill it hard
  const forceKillTimer = setTimeout(() => {
    if (!active.has(recordingId)) return // already exited cleanly via 'q'
    console.log(`[recorder] force-killing ${recordingId} after 10s graceful timeout`)
    try { rec.process.kill() } catch { /* already dead */ }
    if (process.platform === 'win32' && rec.process.pid) {
      spawn('taskkill', ['/F', '/T', '/PID', String(rec.process.pid)], { stdio: 'ignore' }).unref()
    }
  }, 10000)
  forceKillTimer.unref() // don't prevent app exit
  rec.forceKillTimer = forceKillTimer
  // Do NOT delete from active here — the close handler does it after onRecordingFinished
}

export async function stopAll(): Promise<void> {
  const promises: Promise<void>[] = []
  for (const [id] of active) {
    promises.push(stopRecording(id))
  }
  await Promise.all(promises)
}

/** Hard-kill every child process tracked by the recorder.
 *  Called on app exit to prevent yt-dlp / ffmpeg orphan processes. */
export function killAllProcesses(): void {
  for (const [, rec] of active) {
    try {
      if (rec.snapshotTimer) clearInterval(rec.snapshotTimer)
      // SIGKILL on Windows via taskkill to ensure the process tree is killed
      if (process.platform === 'win32' && rec.process.pid) {
        const { spawnSync } = require('child_process')
        spawnSync('taskkill', ['/F', '/T', '/PID', String(rec.process.pid)])
      } else {
        rec.process.kill('SIGKILL')
      }
    } catch { /* already dead */ }
  }
  active.clear()
}

export function getActiveIds(): number[] {
  return Array.from(active.keys())
}

export function isActivelyRecording(streamerId: number, recordingIds: number[]): boolean {
  return recordingIds.some(id => active.has(id))
}

export async function deleteRecordingFile(filePath: string): Promise<void> {
  try { await unlink(filePath) } catch { /* already gone */ }
}
