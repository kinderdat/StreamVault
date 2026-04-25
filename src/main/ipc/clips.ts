import { ipcMain, shell } from 'electron'
import { existsSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { z } from 'zod'

import { extractClipSegment, getClipsOutputDir, getClipsThumbsDir } from '../clipExport'
import { clips, recordings } from '../db'
import { extractThumbnail } from '../ffmpeg'

const clipIdSchema = z.number().int().positive()
const clipCreateSchema = z
  .object({
    recording_id: clipIdSchema,
    title: z.string().trim().min(1).max(180),
    start_secs: z.number().min(0),
    end_secs: z.number().min(0),
  })
  .refine((v) => v.end_secs > v.start_secs, {
    message: 'Clip end must be greater than start',
    path: ['end_secs'],
  })
const clipUpdateSchema = z
  .object({
    title: z.string().trim().min(1).max(180).optional(),
    start_secs: z.number().min(0).optional(),
    end_secs: z.number().min(0).optional(),
    thumbnail_path: z.string().min(1).optional(),
    file_path: z.string().min(1).optional(),
    duration_secs: z.number().min(0).optional(),
  })
  .strict()

function normalizeFilePath(filePath: string): string {
  const normalized = path.normalize(filePath)
  if (!path.isAbsolute(normalized)) throw new Error('Invalid file path')
  return normalized
}

export function registerClipsIpc(): void {
  ipcMain.handle('clips:getAll', () => clips.getAll())

  ipcMain.handle('clips:getByRecording', (_e, id: number) => clips.getByRecording(clipIdSchema.parse(id)))

  ipcMain.handle('clips:getById', (_e, id: number) => clips.getById(clipIdSchema.parse(id)))

  ipcMain.handle('clips:create', async (_e, data: unknown) => {
    const parsed = clipCreateSchema.parse(data)
    const safeTitle = parsed.title.trim()
    const duration_secs = Math.max(0, parsed.end_secs - parsed.start_secs)
    const id = clips.create({
      ...parsed,
      title: safeTitle,
      duration_secs,
    })

    const rec = recordings.getById(parsed.recording_id) as { file_path?: string } | undefined
    if (rec?.file_path) {
      const outPath = path.join(getClipsOutputDir(), `clip_${id}.mp4`)
      try {
        await extractClipSegment(rec.file_path, parsed.start_secs, parsed.end_secs, outPath)
        clips.update(id, { file_path: outPath, duration_secs })
      } catch (err) {
        console.error('[clips:create] segment extract failed', err)
      }

      const thumbPath = path.join(getClipsThumbsDir(), `clip_${id}_thumb.jpg`)
      if (existsSync(outPath)) {
        extractThumbnail(outPath, thumbPath, Math.min(2, duration_secs * 0.1))
          .then((ok) => {
            if (ok) clips.update(id, { thumbnail_path: thumbPath })
          })
          .catch(() => {
            /* ignore thumbnail failures */
          })
      }
    }

    return clips.getById(id)
  })

  ipcMain.handle('clips:update', (_e, id: number, data: unknown) => {
    const clipId = clipIdSchema.parse(id)
    const update = clipUpdateSchema.parse(data)
    clips.update(clipId, update as Parameters<typeof clips.update>[1])
  })

  ipcMain.handle('clips:delete', async (_e, id: number) => {
    const row = clips.delete(clipIdSchema.parse(id))
    if (row?.file_path) await fs.unlink(row.file_path).catch(() => {})
    if (row?.thumbnail_path) await fs.unlink(row.thumbnail_path).catch(() => {})
  })

  ipcMain.handle('clips:openFolder', (_e, filePath: string) => {
    shell.showItemInFolder(normalizeFilePath(filePath))
  })
}
