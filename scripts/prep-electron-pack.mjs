import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function stopStreamVaultIfRunning() {
  if (process.platform !== 'win32') return
  const r = spawnSync('taskkill', ['/F', '/IM', 'StreamVault.exe', '/T'], {
    stdio: 'ignore',
    windowsHide: true,
  })
  if (r.status === 0) {
    console.log('[prep-electron-pack] stopped StreamVault.exe so dist/ can be replaced')
  }
}

async function rmWithRetry(dir, attempts = 5) {
  for (let i = 0; i < attempts; i++) {
    try {
      if (!fs.existsSync(dir)) return true
      fs.rmSync(dir, { recursive: true, force: true })
      return true
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : ''
      if (i === attempts - 1) return false
      const wait = 300 * (i + 1)
      console.warn(`[prep-electron-pack] retry ${i + 1}/${attempts} (${code || err}) — wait ${wait}ms`)
      await sleep(wait)
    }
  }
  return false
}

function renameAwayLockedDist() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const junk = path.join(root, `dist-old-${stamp}`)
  fs.renameSync(dist, junk)
  console.log(
    '[prep-electron-pack] renamed locked dist/ → ' +
      path.basename(junk) +
      ' (delete that folder later if Windows releases the lock)',
  )
}

stopStreamVaultIfRunning()
await sleep(process.platform === 'win32' ? 500 : 0)

if (!fs.existsSync(dist)) {
  console.log('[prep-electron-pack] no dist/ to clear')
  process.exit(0)
}

const removed = await rmWithRetry(dist)
if (removed) {
  console.log('[prep-electron-pack] removed dist/')
  process.exit(0)
}

if (process.platform === 'win32') {
  try {
    renameAwayLockedDist()
    process.exit(0)
  } catch (err) {
    const hint = err && typeof err === 'object' && 'code' in err ? String(err.code) : ''
    console.error(
      '[prep-electron-pack] Could not remove or rename dist/ (' +
        hint +
        '). Options:\n' +
        '  A) Quit StreamVault, close Explorer windows under dist/, delete ' +
        dist +
        ' manually, then rerun npm run dist:win\n' +
        '  B) Or pack to a different folder (avoids a locked dist/): npm run dist:win:alt\n' +
        '  C) Reboot if antivirus/Indexer keeps DLLs open\n',
    )
    process.exit(1)
  }
}

console.error(
  '[prep-electron-pack] Could not remove dist/. Close apps using files under dist/ and retry.\n  Path: ' +
    dist,
)
process.exit(1)
