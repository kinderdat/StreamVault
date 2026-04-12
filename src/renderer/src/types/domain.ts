export interface Streamer {
  id: number
  platform: string
  username: string
  channel_url: string
  display_name: string
  avatar_url: string | null
  added_at: number
  is_active: number // 0 or 1
  last_checked: number | null
  last_live_at: number | null
  recording_count: number
  last_recording_at: number | null
}

export interface Recording {
  id: number
  streamer_id: number
  streamer_name: string
  streamer_avatar: string | null
  title: string | null
  platform: string
  stream_date: number
  file_path: string | null
  thumbnail_path: string | null
  duration_secs: number | null
  file_size_bytes: number | null
  video_codec: string | null
  audio_codec: string | null
  resolution: string | null
  fps: number | null
  language: string | null
  viewer_count: number | null
  category: string | null
  status: 'recording' | 'processing' | 'completed' | 'failed'
  started_at: number
  completed_at: number | null
}
