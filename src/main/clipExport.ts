import { spawn } from 'child_process'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'

import { getBinPath } from './ffmpeg'
import { store } from './ipc/settings'

export function getClipsOutputDir(): string {
  const base = (store.get('storagePath') as string | undefined) ?? app.getPath('videos')
  const dir = path.join(base, 'clips')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function getClipsThumbsDir(): string {
  const dir = path.join(app.getPath('userData'), 'thumbs', 'clips')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Extract [start_secs, end_secs] from a recording into a standalone MP4 clip file.
 */
export function extractClipSegment(
  recordingPath: string,
  startSecs: number,
  endSecs: number,
  outputPath: string,
): Promise<void> {
  const duration = endSecs - startSecs
  if (!(duration > 0) || !existsSync(recordingPath)) {
    return Promise.reject(new Error('Invalid clip range or missing recording file'))
  }

  const ffmpeg = getBinPath('ffmpeg')
  const ext = path.extname(recordingPath).toLowerCase()
  // Stream copy is fast for MP4/MKV; TS / odd streams get a safe re-encode.
  const useCopy = ext === '.mp4' || ext === '.mkv' || ext === '.mov'
  const args = useCopy
    ? [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(startSecs),
        '-i',
        recordingPath,
        '-t',
        String(duration),
        '-c',
        'copy',
        '-movflags',
        '+faststart',
        outputPath,
      ]
    : [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(startSecs),
        '-i',
        recordingPath,
        '-t',
        String(duration),
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
        outputPath,
      ]

  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: 'ignore' })
    proc.on('close', (code) => {
      if (code === 0 && existsSync(outputPath)) resolve()
      else reject(new Error(`ffmpeg clip export exited ${code}`))
    })
    proc.on('error', reject)
  })
}
