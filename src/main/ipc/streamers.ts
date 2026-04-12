import { ipcMain, BrowserWindow } from 'electron'
import { streamers } from '../db'
import { detectPlatform, extractUsername, fetchAvatarUrl } from '../platforms'
import { checkStreamerNow } from '../monitor'

let _win: BrowserWindow | null = null
export function setStreamersWindow(win: BrowserWindow): void { _win = win }

function sendToRenderer(channel: string, data: unknown): void {
  _win?.webContents.send(channel, data)
}

export function registerStreamersIpc(): void {
  ipcMain.handle('streamers:getAll', () => streamers.getAll())

  ipcMain.handle('streamers:add', async (_event, channelUrl: string) => {
    const platform = detectPlatform(channelUrl)
    const username = extractUsername(channelUrl, platform)
    try {
      const row = streamers.add({ platform, username, channel_url: channelUrl, display_name: username }) as Record<string, unknown>
      const id = row.id as number
      // Block on avatar fetch so PFP is included in the returned row immediately
      try {
        const avatarUrl = await fetchAvatarUrl(platform, username)
        if (avatarUrl) {
          streamers.updateMeta(id, { avatar_url: avatarUrl })
          row.avatar_url = avatarUrl
        }
      } catch { /* non-critical — streamer still added */ }
      return row
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('UNIQUE')) throw new Error('Streamer already added')
      throw err
    }
  })

  ipcMain.handle('streamers:remove', (_event, id: number) => {
    streamers.remove(id)
  })

  ipcMain.handle('streamers:setActive', (_event, id: number, active: boolean) => {
    streamers.setActive(id, active)
  })

  ipcMain.handle('streamers:checkNow', (_event, id: number) => {
    return checkStreamerNow(id)
  })

  // Refresh avatars for all streamers that don't have one yet
  ipcMain.handle('streamers:refreshAvatars', async () => {
    const all = streamers.getAll() as Array<{ id: number; platform: string; username: string; avatar_url: string | null }>
    const missing = all.filter(s => !s.avatar_url)
    await Promise.allSettled(
      missing.map(async s => {
        const url = await fetchAvatarUrl(s.platform, s.username)
        if (url) streamers.updateMeta(s.id, { avatar_url: url })
      })
    )
    return streamers.getAll()
  })
}
