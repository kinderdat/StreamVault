import { BrowserWindow, ipcMain } from 'electron'
import { z } from 'zod'

import { streamers } from '../db'
import { checkStreamerNow } from '../monitor'
import { detectPlatform, extractUsername, fetchAvatarUrl } from '../platforms'

const streamerIdSchema = z.number().int().positive()
const channelUrlSchema = z.string().trim().url().max(512)
const activeSchema = z.boolean()

export function setStreamersWindow(_win: BrowserWindow): void {}

export function registerStreamersIpc(): void {
  ipcMain.handle('streamers:getAll', () => streamers.getAll())

  ipcMain.handle('streamers:add', async (_event, channelUrl: string) => {
    const safeChannelUrl = channelUrlSchema.parse(channelUrl)
    const parsedUrl = new URL(safeChannelUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http/https channel URLs are allowed')
    }
    const platform = detectPlatform(safeChannelUrl)
    const username = extractUsername(safeChannelUrl, platform)
    try {
      const row = streamers.add({
        platform,
        username,
        channel_url: safeChannelUrl,
        display_name: username,
      }) as Record<string, unknown>
      const id = row.id as number
      // Block on avatar fetch so PFP is included in the returned row immediately
      try {
        const avatarUrl = await fetchAvatarUrl(platform, username)
        if (avatarUrl) {
          streamers.updateMeta(id, { avatar_url: avatarUrl })
          row.avatar_url = avatarUrl
        }
      } catch {
        /* non-critical — streamer still added */
      }
      return row
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('UNIQUE')) throw new Error('Streamer already added')
      throw err
    }
  })

  ipcMain.handle('streamers:remove', (_event, id: number) => {
    streamers.remove(streamerIdSchema.parse(id))
  })

  ipcMain.handle('streamers:setActive', (_event, id: number, active: boolean) => {
    streamers.setActive(streamerIdSchema.parse(id), activeSchema.parse(active))
  })

  ipcMain.handle('streamers:checkNow', (_event, id: number) => {
    return checkStreamerNow(streamerIdSchema.parse(id))
  })

  // Refresh avatars for all streamers that don't have one yet
  ipcMain.handle('streamers:refreshAvatars', async () => {
    const all = streamers.getAll() as Array<{
      id: number
      platform: string
      username: string
      avatar_url: string | null
    }>
    const missing = all.filter((s) => !s.avatar_url)
    await Promise.allSettled(
      missing.map(async (s) => {
        const url = await fetchAvatarUrl(s.platform, s.username)
        if (url) streamers.updateMeta(s.id, { avatar_url: url })
      }),
    )
    return streamers.getAll()
  })
}
