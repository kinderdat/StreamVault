import { ipcMain, shell } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import { z } from 'zod'
import { recordings } from '../db'
import { stopRecording, deleteRecordingFile } from '../recorder'

const recordingIdSchema = z.number().int().positive()

function normalizeAbsolute(filePath: string): string {
  const normalized = path.normalize(filePath)
  if (!path.isAbsolute(normalized)) throw new Error('Invalid file path')
  return normalized
}

export function registerRecordingsIpc(): void {
  ipcMain.handle('recordings:getAll', () => recordings.getAll())

  ipcMain.handle('recordings:getByStreamer', (_event, streamerId: number) =>
    recordings.getByStreamer(recordingIdSchema.parse(streamerId))
  )

  ipcMain.handle('recordings:getById', (_event, id: number) =>
    recordings.getById(recordingIdSchema.parse(id))
  )

  ipcMain.handle('recordings:getStats', () => recordings.getStats())

  ipcMain.handle('recordings:stop', (_event, id: number) => stopRecording(recordingIdSchema.parse(id)))

  ipcMain.handle('recordings:delete', async (_event, id: number) => {
    const recordingId = recordingIdSchema.parse(id)
    const row = recordings.getById(recordingId) as { file_path?: string; thumbnail_path?: string } | undefined
    recordings.delete(recordingId)
    if (row?.file_path) await deleteRecordingFile(row.file_path)
    if (row?.thumbnail_path) await deleteRecordingFile(row.thumbnail_path)
  })

  ipcMain.handle('recordings:openFolder', (_event, filePath: string) => {
    const normalized = normalizeAbsolute(filePath)
    if (existsSync(normalized)) {
      shell.showItemInFolder(normalized)
    } else {
      // File not yet written (still recording) — open parent folder
      shell.openPath(path.dirname(normalized))
    }
  })

  ipcMain.handle('recordings:openFile', async (_event, filePath: string) => {
    const normalized = normalizeAbsolute(filePath)
    const err = await shell.openPath(normalized)
    if (err) console.error('[recordings:openFile]', err)
  })

  ipcMain.handle('recordings:clearFailed', async () => {
    const paths = recordings.deleteAllFailed()
    for (const p of paths) await deleteRecordingFile(p)
  })
}
