import { spawn } from 'child_process'
import { net } from 'electron'

import { getBinPath } from './ffmpeg'

export interface LiveInfo {
  isLive: boolean
  title?: string
  viewerCount?: number
  thumbnailUrl?: string
  streamId?: string
  category?: string
}

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'

// Detect platform from URL
export function detectPlatform(url: string): string {
  if (/twitch\.tv/i.test(url)) return 'twitch'
  if (/kick\.com/i.test(url)) return 'kick'
  if (/youtube\.com|youtu\.be/i.test(url)) return 'youtube'
  if (/tiktok\.com/i.test(url)) return 'tiktok'
  if (/afreecatv\.com/i.test(url)) return 'afreeca'
  if (/twitcasting\.tv/i.test(url)) return 'twitcasting'
  if (/bilibili\.com/i.test(url)) return 'bilibili'
  if (/pandalive\.co\.kr/i.test(url)) return 'panda'
  if (/pandatv\.com/i.test(url)) return 'panda'
  if (/ttinglive\.com/i.test(url)) return 'flextv'
  if (/flextv\.co\.kr/i.test(url)) return 'flextv'
  if (/rumble\.com/i.test(url)) return 'rumble'
  if (/douyin\.com/i.test(url)) return 'douyin'
  return 'unknown'
}

// Extract username from URL for display
export function extractUsername(url: string, platform: string): string {
  try {
    const u = new URL(url)
    const parts = u.pathname.split('/').filter(Boolean)
    switch (platform) {
      case 'youtube': {
        const handle = parts.find((p) => p.startsWith('@'))
        return handle?.slice(1) ?? parts[0] ?? url
      }
      case 'tiktok': {
        // https://www.tiktok.com/@username/live → strip @
        const handle = parts.find((p) => p.startsWith('@'))
        return handle?.slice(1) ?? parts[0] ?? url
      }
      case 'panda': {
        // https://www.pandalive.co.kr/live/play/{channel} → 3rd segment
        const liveIdx = parts.indexOf('live')
        if (liveIdx !== -1 && parts[liveIdx + 1] === 'play') return parts[liveIdx + 2] ?? parts[0] ?? url
        return parts[parts.length - 1] ?? url
      }
      case 'flextv': {
        // https://www.flextv.co.kr/channels/{id}/live → numeric channel id
        const chIdx = parts.indexOf('channels')
        if (chIdx !== -1) return parts[chIdx + 1] ?? parts[0] ?? url
        return parts[0] ?? url
      }
      case 'rumble': {
        // https://rumble.com/c/{channel} or /user/{username}
        if (parts[0] === 'c' || parts[0] === 'user') return parts[1] ?? url
        return parts[0] ?? url
      }
      default:
        return parts[0] ?? url
    }
  } catch {
    return url
  }
}

// ── Kick live check ──────────────────────────────────────────────
export async function checkKick(username: string): Promise<LiveInfo> {
  try {
    const data = await fetchJson(`https://kick.com/api/v2/channels/${username}/livestream`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    if (!data?.data) return { isLive: false }
    const kickData = data.data as Record<string, unknown>
    const cats = kickData.categories as Array<Record<string, unknown>> | undefined
    const category = cats?.[0]?.name as string | undefined
    return {
      isLive: true,
      title: kickData.session_title as string | undefined,
      viewerCount: kickData.viewer_count as number | undefined,
      thumbnailUrl: (kickData.thumbnail as Record<string, unknown> | undefined)?.url as string | undefined,
      streamId: kickData.id?.toString(),
      category: category || undefined,
    }
  } catch {
    return { isLive: false }
  }
}

// ── AfreecaTV / SOOP live check ──────────────────────────────────
async function checkAfreecaTV(bjId: string): Promise<LiveInfo> {
  try {
    const data = await fetchJson(`https://bjapi.afreecatv.com/api/${bjId}/station`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    const broad = data?.broad as Record<string, unknown> | null | undefined
    if (!broad) return { isLive: false }
    const thumb = broad.broad_thumb as string | undefined
    return {
      isLive: true,
      title: broad.broad_title as string | undefined,
      viewerCount: broad.current_sum_viewer as number | undefined,
      thumbnailUrl: thumb ? (thumb.startsWith('http') ? thumb : `https:${thumb}`) : undefined,
      streamId: broad.broad_no?.toString(),
      category: broad.category_tag as string | undefined,
    }
  } catch {
    return { isLive: false }
  }
}

// ── PandaLive live check ─────────────────────────────────────────
async function checkPandaLive(channel: string): Promise<LiveInfo> {
  try {
    const data = await fetchJson(
      `https://api.pandalive.co.kr/v1/live/play?channel=${encodeURIComponent(channel)}&info=media&cacheType=undefined`,
      { headers: { 'User-Agent': UA, Accept: 'application/json', Origin: 'https://www.pandalive.co.kr' } },
    )
    const media = data?.media as Record<string, unknown> | undefined
    const userInfo = data?.userInfo as Record<string, unknown> | undefined
    if (!media || !(data?.result as boolean)) return { isLive: false }
    return {
      isLive: true,
      title: media.title as string | undefined,
      viewerCount: userInfo?.fanCount as number | undefined,
      thumbnailUrl: media.thumbnail as string | undefined,
      streamId: media.liveId?.toString(),
    }
  } catch {
    return { isLive: false }
  }
}

// ── Kick VOD M3U8 discovery ───────────────────────────────────────
export async function findKickVodM3u8(channelUrl: string): Promise<string | null> {
  const username = channelUrl.split('/').filter(Boolean).pop()
  if (!username) return null

  try {
    const data = await fetchJson(`https://kick.com/api/v1/channels/${username}/videos?sort=desc`, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
    })
    const videos = (data?.data as Array<Record<string, unknown>> | undefined) ?? []
    if (!videos.length) return null

    const video = videos[0] as Record<string, unknown> | undefined
    const thumbnail = video?.thumbnail as Record<string, unknown> | undefined
    const thumbUrl = typeof thumbnail?.src === 'string' ? thumbnail.src : ''
    const startTime = typeof video?.start_time === 'string' ? video.start_time : ''

    const thumbParts = thumbUrl.split('/')
    if (thumbParts.length < 6) return null
    const channelId = thumbParts[4]
    const videoId = thumbParts[5]

    const start = new Date(startTime.replace(' ', 'T') + 'Z')

    const bases = [
      'https://stream.kick.com/ivs/v1/196233775518',
      'https://stream.kick.com/3c81249a5ce0/ivs/v1/196233775518',
      'https://stream.kick.com/0f3cb0ebce7/ivs/v1/196233775518',
    ]

    for (let offset = -5; offset <= 5; offset++) {
      const t = new Date(start.getTime() + offset * 60000)
      const y = t.getUTCFullYear()
      const mo = t.getUTCMonth() + 1
      const d = t.getUTCDate()
      const h = t.getUTCHours()
      const mi = t.getUTCMinutes()

      for (const base of bases) {
        const url = `${base}/${channelId}/${y}/${mo}/${d}/${h}/${mi}/${videoId}/media/hls/master.m3u8`
        const ok = await headRequest(url)
        if (ok) return url
      }
    }
    return null
  } catch {
    return null
  }
}

// ── yt-dlp simulate check (YouTube, TikTok, Rumble, FlexTV, others) ─
export function checkViaYtdlp(channelUrl: string): Promise<LiveInfo> {
  return new Promise((resolve) => {
    const ytdlp = getBinPath('yt-dlp')
    const proc = spawn(ytdlp, [
      '--simulate',
      '--no-download',
      '--quiet',
      '--print',
      '%(is_live)s|||%(title)s|||%(view_count)s|||%(thumbnail)s|||%(categories.0)s',
      channelUrl,
    ])

    let settled = false
    const finalize = (result: LiveInfo) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      resolve(result)
    }

    let stdout = ''
    proc.stdout.on('data', (d: Buffer) => {
      stdout += d.toString()
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        finalize({ isLive: false })
        return
      }
      const line =
        stdout
          .trim()
          .split('\n')
          .find((l) => l.includes('True')) ?? stdout.trim()
      const parts = line.split('|||')
      const isLive = parts[0]?.trim() === 'True'
      const rawCategory = parts[4]?.trim()
      finalize({
        isLive,
        title: parts[1]?.trim() || undefined,
        viewerCount: parts[2] ? parseInt(parts[2]) || undefined : undefined,
        thumbnailUrl: parts[3]?.trim() || undefined,
        category: rawCategory && rawCategory !== 'NA' && rawCategory !== 'None' ? rawCategory : undefined,
      })
    })
    proc.on('error', () => finalize({ isLive: false }))
    const timeoutId = setTimeout(() => {
      try {
        proc.kill()
      } catch {
        /* already exited */
      }
      finalize({ isLive: false })
    }, 15000)
  })
}

/** YouTube live check: try the /live endpoint first, then fall back to /@username */
async function checkYouTubeLive(channelUrl: string, username: string): Promise<LiveInfo> {
  // Build the two candidate URLs to try in order
  const base = channelUrl.replace(/\/live$/, '').replace(/\/@[^/]+$/, '')
  const candidates = [
    `${base}/@${username}/live`,
    channelUrl.includes('/live') ? channelUrl : `${channelUrl}/live`,
  ]
  for (const url of candidates) {
    try {
      const result = await checkViaYtdlp(url)
      if (result.isLive) return result
    } catch {
      /* try next */
    }
  }
  return { isLive: false }
}

export async function checkLive(platform: string, channelUrl: string, username: string): Promise<LiveInfo> {
  switch (platform) {
    case 'kick':
      return checkKick(username)
    case 'youtube':
      return checkYouTubeLive(channelUrl, username)
    case 'tiktok':
      return checkViaYtdlp(`https://www.tiktok.com/@${username}/live`)
    case 'afreeca':
      return checkAfreecaTV(username)
    case 'panda':
      return checkPandaLive(username)
    case 'rumble':
      return checkViaYtdlp(channelUrl)
    case 'flextv':
      return checkViaYtdlp(channelUrl)
    default:
      return checkViaYtdlp(channelUrl)
  }
}

// ── Avatar fetching ──────────────────────────────────────────────
export async function fetchAvatarUrl(platform: string, username: string): Promise<string | null> {
  try {
    switch (platform) {
      case 'twitch': {
        const url = await fetchText(`https://decapi.me/twitch/avatar/${username}`)
        return url.startsWith('http') ? url.trim() : null
      }
      case 'kick': {
        const data = await fetchJson(`https://kick.com/api/v2/channels/${username}`, {
          headers: { 'User-Agent': UA, Accept: 'application/json' },
        })
        const pic = (data?.user as Record<string, unknown>)?.profile_pic
        return typeof pic === 'string' ? pic : null
      }
      case 'afreeca': {
        // SOOP/AfreecaTV profile image CDN — direct URL pattern, no API call
        return `https://profile.img.afreecatv.com/LOGO/${username}/${username}.jpg`
      }
      case 'panda': {
        const data = await fetchJson(
          `https://api.pandalive.co.kr/v1/live/play?channel=${encodeURIComponent(username)}&info=media`,
          {
            headers: { 'User-Agent': UA, Accept: 'application/json', Origin: 'https://www.pandalive.co.kr' },
          },
        )
        const thumb = (data?.userInfo as Record<string, unknown>)?.profileImg
        return typeof thumb === 'string' ? thumb : null
      }
      case 'youtube': {
        // Scrape og:image from the channel page — works for both @handle and /channel/UC... URLs
        const pageUrl = username.startsWith('UC')
          ? `https://www.youtube.com/channel/${username}`
          : `https://www.youtube.com/@${username}`
        const html = await fetchText(pageUrl)
        // og:image is the channel avatar
        const m = html.match(/<meta property="og:image" content="([^"]+)"/)
        if (m?.[1]) return m[1]
        // Fallback: yt channel avatar from yt3.googleusercontent.com pattern
        const m2 = html.match(/https:\/\/yt3\.googleusercontent\.com\/[A-Za-z0-9_-]{20,}/)
        return m2?.[0] ?? null
      }
      case 'rumble': {
        // Parse og:image from channel page — no auth required
        const pageUrl = username.startsWith('http') ? username : `https://rumble.com/c/${username}`
        const html = await fetchText(pageUrl)
        const m = html.match(/<meta property="og:image" content="([^"]+)"/)
        return m?.[1] ?? null
      }
      default:
        return null
    }
  } catch {
    return null
  }
}

// ── HTTP helpers using Electron net ──────────────────────────────
function fetchJson(
  url: string,
  opts: { method?: string; headers?: Record<string, string> } = {},
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: opts.method ?? 'GET', url })
    if (opts.headers) {
      for (const [k, v] of Object.entries(opts.headers)) req.setHeader(k, v)
    }
    req.setHeader('Accept', 'application/json')

    let body = ''
    req.on('response', (res) => {
      res.on('data', (chunk) => {
        body += chunk.toString()
      })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('JSON parse error'))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: 'GET', url })
    req.setHeader('User-Agent', UA)
    let body = ''
    req.on('response', (res) => {
      res.on('data', (chunk) => {
        body += chunk.toString()
      })
      res.on('end', () => resolve(body))
    })
    req.on('error', reject)
    req.end()
  })
}

function headRequest(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const req = net.request({ method: 'HEAD', url })
      req.setHeader('User-Agent', UA)
      req.on('response', (res) => resolve(res.statusCode === 200))
      req.on('error', () => resolve(false))
      req.end()
    } catch {
      resolve(false)
    }
  })
}
