import { spawn } from 'child_process'
import { createHash } from 'crypto'
import { app } from 'electron'
import { existsSync, mkdirSync, readdirSync, statSync } from 'fs'
import { unlink } from 'fs/promises'
import { pathToFileURL } from 'node:url'
import { extname, join, normalize } from 'path'

import { getBinPath } from './ffmpeg'

/** In-flight .ts → MP4 remux (dedupe concurrent requests). */
const pendingTs = new Map<string, Promise<string | null>>()
const PLAYBACK_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

function getPlaybackCacheDir(): string {
  const dir = join(app.getPath('userData'), 'cache', 'playback')
  mkdirSync(dir, { recursive: true })
  return dir
}

export function cleanupPlaybackCache(maxAgeMs = PLAYBACK_CACHE_MAX_AGE_MS): void {
  const cacheDir = getPlaybackCacheDir()
  const now = Date.now()
  for (const fileName of readdirSync(cacheDir)) {
    if (!fileName.startsWith('sv_play_') || !fileName.endsWith('.mp4')) continue
    const fullPath = join(cacheDir, fileName)
    try {
      const ageMs = now - statSync(fullPath).mtimeMs
      if (ageMs > maxAgeMs) {
        void unlink(fullPath).catch(() => {})
      }
    } catch {
      /* ignore unreadable files */
    }
  }
}

function runFfmpeg(args: string[], timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const ffmpegBin = getBinPath('ffmpeg')
    if (!existsSync(ffmpegBin)) {
      resolve(false)
      return
    }

    const proc = spawn(ffmpegBin, args, { stdio: 'ignore' })
    const timer = setTimeout(() => {
      try {
        proc.kill()
      } catch {
        /* ignore */
      }
      resolve(false)
    }, timeoutMs)
    timer.unref()

    proc.on('close', (code) => {
      clearTimeout(timer)
      resolve(code === 0)
    })
    proc.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

/** Remux or transcode MPEG-TS to a temp MP4 Chromium can decode on Windows. */
export async function ensurePlayableMp4(tsPath: string): Promise<string | null> {
  let mtimeMs = 0
  try {
    mtimeMs = statSync(tsPath).mtimeMs
  } catch {
    /* ignore */
  }
  const hash = createHash('md5')
    .update(tsPath + String(mtimeMs))
    .digest('hex')
    .slice(0, 16)
  const tempMp4 = join(getPlaybackCacheDir(), `sv_play_${hash}.mp4`)

  if (existsSync(tempMp4)) return tempMp4
  if (pendingTs.has(tsPath)) return pendingTs.get(tsPath)!

  const promise = new Promise<string | null>((resolve) => {
    ;(async () => {
      const remuxOk = await runFfmpeg(
        [
          '-fflags',
          '+genpts',
          '-i',
          tsPath,
          '-c',
          'copy',
          '-f',
          'mp4',
          '-movflags',
          '+faststart+frag_keyframe+empty_moov',
          '-avoid_negative_ts',
          '1',
          '-y',
          tempMp4,
        ],
        90_000,
      )

      if (remuxOk && existsSync(tempMp4)) {
        pendingTs.delete(tsPath)
        resolve(tempMp4)
        return
      }

      await unlink(tempMp4).catch(() => {})
      const transcodeOk = await runFfmpeg(
        [
          '-fflags',
          '+genpts',
          '-i',
          tsPath,
          '-c:v',
          'libx264',
          '-preset',
          'veryfast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-movflags',
          '+faststart',
          '-pix_fmt',
          'yuv420p',
          '-y',
          tempMp4,
        ],
        180_000,
      )

      pendingTs.delete(tsPath)
      resolve(transcodeOk && existsSync(tempMp4) ? tempMp4 : null)
    })().catch(() => {
      pendingTs.delete(tsPath)
      resolve(null)
    })
  })
  pendingTs.set(tsPath, promise)
  return promise
}

/** Resolve filesystem path from a media:// request (Windows URL shapes differ by Chromium build). */
export function mediaRequestToFilePath(requestUrl: string): string | null {
  try {
    const u = new URL(requestUrl)
    const isWin = process.platform === 'win32'
    const safeDecode = (s: string): string => {
      try {
        return decodeURIComponent(s)
      } catch {
        return s
      }
    }

    const pathname = safeDecode(u.pathname || '')
    const host = u.hostname || ''

    const candidates: string[] = []

    if (isWin) {
      if (host.length === 1 && /^[A-Za-z]$/.test(host) && pathname) {
        candidates.push(`${host.toUpperCase()}:${pathname}`)
      }
      const p = pathname.replace(/^\/+/, '')
      if (p) candidates.push(p)
      if (/^\/\/[^/]+\//.test(pathname)) {
        candidates.push('\\\\' + pathname.replace(/^\/\//, '').replace(/\//g, '\\'))
      }
    } else if (pathname) {
      candidates.push(pathname)
    }

    for (const c of candidates) {
      const n = normalize(c)
      if (existsSync(n)) return n
    }
    if (candidates.length > 0) return normalize(candidates[0])
    return null
  } catch {
    return null
  }
}

/**
 * Returns a file:// href the renderer can assign to <video src>.
 * TS sources are remuxed to a temp MP4 first (Windows / Chromium cannot play raw .ts reliably).
 */
export async function prepareLocalPlaybackHref(rawPath: string): Promise<string> {
  const normalized = normalize(rawPath.trim())
  if (!normalized || !existsSync(normalized)) {
    throw new Error(`File not found: ${normalized}`)
  }
  let servePath = normalized
  if (extname(normalized).toLowerCase() === '.ts') {
    const mp4 = await ensurePlayableMp4(normalized)
    if (!mp4) throw new Error('Could not remux .ts for playback (ffmpeg failed)')
    servePath = mp4
  }
  return pathToFileURL(servePath).href
}
