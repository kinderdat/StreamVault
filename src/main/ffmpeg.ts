import { spawn } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { existsSync } from 'fs'
import { store } from './ipc/settings'

export function getBinPath(name: 'yt-dlp' | 'ffmpeg' | 'ffprobe'): string {
  const sanitizeOverride = (v: string | undefined): string | undefined => {
    if (!v) return undefined
    const trimmed = v.trim()
    if (!trimmed) return undefined
    // Users sometimes paste quoted absolute paths on Windows.
    return trimmed.replace(/^"(.*)"$/, '$1')
  }

  // Check user-configured override paths first
  if (name === 'yt-dlp') {
    const override = sanitizeOverride(store.get('ytdlpPath') as string | undefined)
    if (override && existsSync(override)) return override
  } else if (name === 'ffmpeg') {
    const override = sanitizeOverride(store.get('ffmpegPath') as string | undefined)
    if (override && existsSync(override)) return override
  }

  const ext = process.platform === 'win32' ? '.exe' : ''
  const exe = name + ext
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'bin', exe)
  }
  return path.join(__dirname, '../../resources/bin', exe)
}

export interface MediaMetadata {
  duration?: number
  videoCodec?: string
  audioCodec?: string
  resolution?: string
  fps?: number
  fileSize?: number
  language?: string
}

export function extractMetadata(filePath: string, timeoutMs = 30_000): Promise<MediaMetadata> {
  return new Promise((resolve) => {
    const ffprobe = getBinPath('ffprobe')
    if (!existsSync(ffprobe)) {
      resolve({})
      return
    }

    const proc = spawn(ffprobe, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-show_format',
      filePath,
    ])

    const killTimer = setTimeout(() => {
      console.warn('[ffprobe] timed out on', filePath, '— killing')
      try { proc.kill() } catch { /* already dead */ }
      resolve({})
    }, timeoutMs)
    killTimer.unref()

    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.on('close', () => {
      clearTimeout(killTimer)
      try {
        const json = JSON.parse(stdout)
        const videoStream = json.streams?.find((s: { codec_type: string }) => s.codec_type === 'video')
        const audioStream = json.streams?.find((s: { codec_type: string }) => s.codec_type === 'audio')
        const fmt = json.format

        const fps = videoStream?.r_frame_rate
          ? (() => {
              const [n, d] = (videoStream.r_frame_rate as string).split('/').map(Number)
              return d ? Math.round((n / d) * 10) / 10 : undefined
            })()
          : undefined

        const lang: string | undefined =
          audioStream?.tags?.language && audioStream.tags.language !== 'und'
            ? (audioStream.tags.language as string).toUpperCase()
            : undefined

        resolve({
          duration: fmt?.duration ? parseFloat(fmt.duration) : undefined,
          videoCodec: videoStream?.codec_name,
          audioCodec: audioStream?.codec_name,
          resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
          fps,
          fileSize: fmt?.size ? parseInt(fmt.size) : undefined,
          language: lang,
        })
      } catch {
        resolve({})
      }
    })
    proc.on('error', () => { clearTimeout(killTimer); resolve({}) })
  })
}

export function extractThumbnail(filePath: string, outputPath: string, atSecs = 30, timeoutMs = 30_000): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = getBinPath('ffmpeg')
    if (!existsSync(ffmpeg)) { resolve(false); return }

    const proc = spawn(ffmpeg, [
      '-ss', String(atSecs),
      '-i', filePath,
      '-vframes', '1',
      '-q:v', '2',
      '-y',
      outputPath,
    ])

    const killTimer = setTimeout(() => {
      console.warn('[ffmpeg] extractThumbnail timed out on', filePath, '— killing')
      try { proc.kill() } catch { /* already dead */ }
      resolve(false)
    }, timeoutMs)
    killTimer.unref()

    proc.on('close', (code) => { clearTimeout(killTimer); resolve(code === 0) })
    proc.on('error', () => { clearTimeout(killTimer); resolve(false) })
  })
}

/** Grab a single frame from a (possibly partial/live) file — seeks 60s from end */
export function captureSnapshot(inputPath: string, outputPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpeg = getBinPath('ffmpeg')
    if (!existsSync(ffmpeg) || !existsSync(inputPath)) { resolve(false); return }

    // -sseof -60: seek 60s from end; works on partial .ts files
    const proc = spawn(ffmpeg, [
      '-sseof', '-60',
      '-i', inputPath,
      '-vframes', '1',
      '-q:v', '4',
      '-y',
      outputPath,
    ])
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
    // Kill if takes too long
    const t = setTimeout(() => { proc.kill(); resolve(false) }, 15000)
    proc.on('close', () => clearTimeout(t))
  })
}

