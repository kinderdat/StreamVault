const PLATFORMS: Record<string, { label: string; color: string; abbr: string }> = {
  twitch: { label: 'Twitch', color: '#9146ff', abbr: 'TW' },
  kick: { label: 'Kick', color: '#53fc18', abbr: 'KI' },
  youtube: { label: 'YouTube', color: '#ff0000', abbr: 'YT' },
  tiktok: { label: 'TikTok', color: '#ff0050', abbr: 'TK' },
  afreeca: { label: 'AfreecaTV', color: '#006aff', abbr: 'AF' },
  panda: { label: 'PandaLive', color: '#ff6600', abbr: 'PL' },
  flextv: { label: 'FlexTV', color: '#7c3aed', abbr: 'FX' },
  twitcasting: { label: 'Twitcasting', color: '#cf3a46', abbr: 'TC' },
  bilibili: { label: 'Bilibili', color: '#00a1d6', abbr: 'BL' },
  chzzk: { label: 'Chzzk', color: '#ff9900', abbr: 'CZ' },
  douyin: { label: 'Douyin', color: '#69c9d0', abbr: 'DY' },
  rumble: { label: 'Rumble', color: '#85c742', abbr: 'RU' },
}

interface PlatformBadgeProps {
  platform: string
  size?: 'sm' | 'md'
}

export function PlatformBadge({ platform, size = 'sm' }: PlatformBadgeProps) {
  const p = PLATFORMS[platform?.toLowerCase()] ?? { label: platform, color: '#555', abbr: '??' }
  return (
    <span
      className={`platform-badge platform-badge--${size}`}
      style={{ '--badge-color': p.color } as React.CSSProperties}
      title={p.label}
    >
      {p.label}
    </span>
  )
}

export function getPlatformColor(platform: string): string {
  return PLATFORMS[platform?.toLowerCase()]?.color ?? '#555'
}
