import { BrowserWindow, Notification } from 'electron'

import { recordings, streamers } from './db'
import { store } from './ipc/settings'
import { checkKick, checkViaYtdlp } from './platforms'
import { getActiveIds, startRecording } from './recorder'
import { COOLDOWN_MS, recentlyFinished } from './state'

let intervalHandle: ReturnType<typeof setInterval> | null = null
let mainWindow: BrowserWindow | null = null
let nextTickAt = 0
let tickInFlight = false

export function startMonitor(win: BrowserWindow): void {
  mainWindow = win
  const intervalSecs = (store.get('pollingIntervalSecs') as number | undefined) ?? 10
  scheduleInterval(intervalSecs)
}

export function stopMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}

export function setPollingInterval(secs: number): void {
  stopMonitor()
  scheduleInterval(secs)
}

function scheduleInterval(secs: number): void {
  const ms = Math.max(secs, 10) * 1000
  nextTickAt = Date.now() + ms
  intervalHandle = setInterval(tick, ms)
  // Also run immediately on start after a short delay
  setTimeout(tick, 3000)
}

export function getMonitorStatus(): { running: boolean; nextTickIn: number; activeRecordingIds: number[] } {
  return {
    running: intervalHandle !== null,
    nextTickIn: Math.max(0, nextTickAt - Date.now()),
    activeRecordingIds: getActiveIds(),
  }
}

export async function checkStreamerNow(streamerId: number): Promise<void> {
  const row = streamers.getById(streamerId) as
    | { id: number; platform: string; channel_url: string; username: string; display_name: string }
    | undefined
  if (!row) return
  await checkAndRecord(row)
}

async function tick(): Promise<void> {
  if (tickInFlight) return
  tickInFlight = true
  try {
    nextTickAt = Date.now() + ((store.get('pollingIntervalSecs') as number | undefined) ?? 10) * 1000
    const activeStreamers = streamers.getActive() as Array<{
      id: number
      platform: string
      channel_url: string
      username: string
      display_name: string
    }>
    if (!activeStreamers.length) return

    const maxConcurrent = (store.get('maxConcurrentRecordings') as number | undefined) ?? 3

    // Check active streamers in small batches to avoid hammering remote platforms.
    const BATCH = 5
    for (let i = 0; i < activeStreamers.length; i += BATCH) {
      const batch = activeStreamers.slice(i, i + BATCH)
      await Promise.allSettled(batch.map((s) => checkAndRecord(s, maxConcurrent)))
    }
  } finally {
    tickInFlight = false
  }
}

async function checkAndRecord(
  s: { id: number; platform: string; channel_url: string; username: string; display_name: string },
  maxConcurrent = 3,
): Promise<void> {
  try {
    let info: { isLive: boolean; title?: string; viewerCount?: number; category?: string }
    if (s.platform === 'kick') {
      info = await checkKick(s.username)
    } else {
      info = await checkViaYtdlp(s.channel_url)
    }

    streamers.updateChecked(s.id, Date.now(), info.isLive ? Date.now() : undefined)

    const onCooldown2 = (recentlyFinished.get(s.id) ?? 0) + COOLDOWN_MS > Date.now()
    if (info.isLive && !onCooldown2 && getActiveIds().length < maxConcurrent) {
      const existing = recordings.getActiveForStreamer(s.id)
      if (!existing) {
        const recId = recordings.add({
          streamer_id: s.id,
          title: info.title ?? `${s.display_name} stream`,
          platform: s.platform,
          stream_date: Date.now(),
          status: 'recording',
          started_at: Date.now(),
          viewer_count: info.viewerCount,
          category: info.category,
        })
        await startRecording(recId, s.id, s.channel_url, s.platform, s.display_name)
        mainWindow?.webContents.send('monitor:streamWentLive', { streamerId: s.id, recordingId: recId })
        if (store.get('notifications') !== false && Notification.isSupported()) {
          new Notification({
            title: `${s.display_name} is live`,
            body: info.title ?? `${s.display_name} started streaming`,
          }).show()
        }
      }
    }
  } catch (err) {
    console.error(`[monitor] Error checking ${s.username}:`, err)
  }
}
