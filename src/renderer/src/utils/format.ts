export function formatDuration(secs: number | null | undefined): string {
  if (!secs) return '--'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDate(ts: number | null | undefined): string {
  if (!ts) return '--'
  return new Date(ts).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '--'
  return new Date(ts).toLocaleString()
}

export function formatElapsed(startedAt: number): string {
  const secs = Math.floor((Date.now() - startedAt) / 1000)
  return formatDuration(secs)
}

/** Returns a URL suitable for use in <video src> or <img src>.
 *  Remote URLs pass through. Local paths use media:// protocol
 *  which serves files with correct MIME types + range-request support. */
export function fileUrl(filePath: string | null | undefined): string | undefined {
  if (!filePath) return undefined
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath
  // Encode each path segment to handle spaces and special chars, but preserve slashes
  const encoded = filePath
    .replace(/\\/g, '/')
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/')
  return 'media:///' + encoded
}
