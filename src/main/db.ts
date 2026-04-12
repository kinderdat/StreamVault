import { app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = path.join(app.getPath('userData'), 'streamvault.db')
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
    db.exec(`
      CREATE TABLE IF NOT EXISTS streamers (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        platform     TEXT NOT NULL,
        username     TEXT NOT NULL,
        channel_url  TEXT NOT NULL UNIQUE,
        display_name TEXT,
        avatar_url   TEXT,
        added_at     INTEGER NOT NULL,
        is_active    INTEGER NOT NULL DEFAULT 1,
        last_checked INTEGER,
        last_live_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS recordings (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        streamer_id      INTEGER NOT NULL REFERENCES streamers(id) ON DELETE CASCADE,
        title            TEXT,
        platform         TEXT NOT NULL,
        stream_date      INTEGER NOT NULL,
        file_path        TEXT,
        thumbnail_path   TEXT,
        duration_secs    REAL,
        file_size_bytes  INTEGER,
        video_codec      TEXT,
        audio_codec      TEXT,
        resolution       TEXT,
        fps              REAL,
        language         TEXT,
        viewer_count     INTEGER,
        category         TEXT,
        status           TEXT NOT NULL DEFAULT 'recording',
        started_at       INTEGER NOT NULL,
        completed_at     INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_recordings_streamer ON recordings(streamer_id);
      CREATE INDEX IF NOT EXISTS idx_recordings_status   ON recordings(status);
      CREATE INDEX IF NOT EXISTS idx_recordings_date     ON recordings(stream_date DESC);

      CREATE TABLE IF NOT EXISTS clips (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        recording_id   INTEGER NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
        title          TEXT,
        start_secs     REAL NOT NULL,
        end_secs       REAL NOT NULL,
        file_path      TEXT,
        thumbnail_path TEXT,
        duration_secs  REAL,
        created_at     INTEGER NOT NULL
      );
    `)
    // Migrations for existing DBs
    try { db.exec('ALTER TABLE recordings ADD COLUMN category TEXT') } catch { /* column already exists */ }
  }
  return db
}

// ── Streamer queries ─────────────────────────────────────────────
export const streamers = {
  getAll() {
    return getDb().prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM recordings r WHERE r.streamer_id = s.id) as recording_count,
        (SELECT MAX(r.stream_date) FROM recordings r WHERE r.streamer_id = s.id) as last_recording_at
      FROM streamers s
      ORDER BY s.added_at DESC
    `).all()
  },
  getActive() {
    return getDb().prepare('SELECT * FROM streamers WHERE is_active = 1').all()
  },
  getById(id: number) {
    return getDb().prepare('SELECT * FROM streamers WHERE id = ?').get(id)
  },
  add(data: {
    platform: string
    username: string
    channel_url: string
    display_name?: string
    avatar_url?: string
  }) {
    const r = getDb().prepare(`
      INSERT INTO streamers (platform, username, channel_url, display_name, avatar_url, added_at)
      VALUES (@platform, @username, @channel_url, @display_name, @avatar_url, @added_at)
    `).run({ ...data, display_name: data.display_name ?? data.username, avatar_url: data.avatar_url ?? null, added_at: Date.now() })
    return getDb().prepare('SELECT * FROM streamers WHERE id = ?').get(r.lastInsertRowid)
  },
  remove(id: number) {
    getDb().prepare('DELETE FROM streamers WHERE id = ?').run(id)
  },
  setActive(id: number, active: boolean) {
    getDb().prepare('UPDATE streamers SET is_active = ? WHERE id = ?').run(active ? 1 : 0, id)
  },
  updateChecked(id: number, checkedAt: number, liveAt?: number) {
    if (liveAt != null) {
      getDb().prepare('UPDATE streamers SET last_checked = ?, last_live_at = ? WHERE id = ?').run(checkedAt, liveAt, id)
    } else {
      getDb().prepare('UPDATE streamers SET last_checked = ? WHERE id = ?').run(checkedAt, id)
    }
  },
  updateMeta(id: number, data: { display_name?: string; avatar_url?: string }) {
    getDb().prepare('UPDATE streamers SET display_name = COALESCE(@display_name, display_name), avatar_url = COALESCE(@avatar_url, avatar_url) WHERE id = @id')
      .run({ id, display_name: data.display_name ?? null, avatar_url: data.avatar_url ?? null })
  },
}

// ── Recording queries ────────────────────────────────────────────
export const recordings = {
  getAll() {
    return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name, s.avatar_url as streamer_avatar
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      ORDER BY r.stream_date DESC
    `).all()
  },
  getByStreamer(streamerId: number) {
    return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      WHERE r.streamer_id = ?
      ORDER BY r.stream_date DESC
    `).all(streamerId)
  },
  getById(id: number) {
    return getDb().prepare(`
      SELECT r.*, s.display_name as streamer_name, s.avatar_url as streamer_avatar, s.platform as streamer_platform
      FROM recordings r
      JOIN streamers s ON r.streamer_id = s.id
      WHERE r.id = ?
    `).get(id)
  },
  getActiveForStreamer(streamerId: number) {
    return getDb().prepare("SELECT * FROM recordings WHERE streamer_id = ? AND status IN ('recording', 'processing')").get(streamerId)
  },
  add(data: {
    streamer_id: number
    title?: string
    platform: string
    stream_date: number
    status: string
    started_at: number
    file_path?: string
    viewer_count?: number
    category?: string
  }) {
    const r = getDb().prepare(`
      INSERT INTO recordings (streamer_id, title, platform, stream_date, status, started_at, file_path, viewer_count, category)
      VALUES (@streamer_id, @title, @platform, @stream_date, @status, @started_at, @file_path, @viewer_count, @category)
    `).run({ title: null, file_path: null, viewer_count: null, category: null, ...data })
    return r.lastInsertRowid as number
  },
  update(id: number, data: Partial<{
    title: string
    file_path: string
    thumbnail_path: string
    duration_secs: number
    file_size_bytes: number
    video_codec: string
    audio_codec: string
    resolution: string
    fps: number
    language: string
    viewer_count: number
    category: string
    status: string
    completed_at: number
  }>) {
    const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
    getDb().prepare(`UPDATE recordings SET ${fields} WHERE id = @id`).run({ id, ...data })
  },
  delete(id: number) {
    getDb().prepare('DELETE FROM recordings WHERE id = ?').run(id)
  },
  getStats() {
    return getDb().prepare(`
      SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'recording' THEN 1 ELSE 0 END), 0) as active,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed,
        COALESCE(SUM(COALESCE(duration_secs, 0)), 0) as total_duration,
        COALESCE(SUM(CASE WHEN stream_date > ? THEN 1 ELSE 0 END), 0) as last_24h
      FROM recordings
    `).get(Date.now() - 86400000) as { total: number; active: number; failed: number; total_duration: number; last_24h: number }
  },
  deleteAllFailed() {
    const rows = getDb().prepare("SELECT file_path FROM recordings WHERE status = 'failed'").all() as { file_path: string | null }[]
    getDb().prepare("DELETE FROM recordings WHERE status = 'failed'").run()
    return rows.map(r => r.file_path).filter(Boolean) as string[]
  },
}

