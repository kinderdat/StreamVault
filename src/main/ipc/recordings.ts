import { ipcMain, shell } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import { recordings } from '../db'
import { stopRecording, deleteRecordingFile } from '../recorder'

export function registerRecordingsIpc(): void {
  ipcMain.handle('recordings:getAll', () => recordings.getAll())

  ipcMain.handle('recordings:getByStreamer', (_event, streamerId: number) =>
    recordings.getByStreamer(streamerId)
  )

  ipcMain.handle('recordings:getById', (_event, id: number) =>
    recordings.getById(id)
  )

  ipcMain.handle('recordings:getStats', () => recordings.getStats())

  ipcMain.handle('recordings:stop', (_event, id: number) => stopRecording(id))

  ipcMain.handle('recordings:delete', async (_event, id: number) => {
    const row = recordings.getById(id) as { file_path?: string; thumbnail_path?: string } | undefined
    recordings.delete(id)
    if (row?.file_path) await deleteRecordingFile(row.file_path)
    if (row?.thumbnail_path) await deleteRecordingFile(row.thumbnail_path)
  })

  ipcMain.handle('recordings:openFolder', (_event, filePath: string) => {
    const normalized = path.normalize(filePath)
    if (existsSync(normalized)) {
      shell.showItemInFolder(normalized)
    } else {
      // File not yet written (still recording) — open parent folder
      shell.openPath(path.dirname(normalized))
    }
  })

  ipcMain.handle('recordings:openFile', async (_event, filePath: string) => {
    const normalized = path.normalize(filePath)
    const err = await shell.openPath(normalized)
    if (err) console.error('[recordings:openFile]', err)
  })

  ipcMain.handle('recordings:clearFailed', async () => {
    const paths = recordings.deleteAllFailed()
    for (const p of paths) await deleteRecordingFile(p)
  })
}
