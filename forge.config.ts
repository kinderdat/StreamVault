import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives'
import { FusesPlugin } from '@electron-forge/plugin-fuses'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'
import { FuseV1Options, FuseVersion } from '@electron/fuses'
import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { copySync, ensureDirSync } from 'fs-extra'
import { join } from 'path'

function resolveElectronTarget(): string {
  const electronPkgPath = join(process.cwd(), 'node_modules', 'electron', 'package.json')
  if (!existsSync(electronPkgPath)) {
    throw new Error('electron package.json not found; run npm install before packaging')
  }
  const raw = readFileSync(electronPkgPath, 'utf8')
  const parsed = JSON.parse(raw) as { version?: string }
  const version = parsed.version?.trim()
  if (!version) {
    throw new Error('Could not resolve Electron version from node_modules/electron/package.json')
  }
  return version
}

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    executableName: 'StreamVault',
    icon: 'resources/icon',
    extraResource: ['resources/icon.png', 'resources/Icon.ico', 'resources/bin'],
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'StreamVault',
      },
    },
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'linux', 'win32'], config: {} },
    { name: '@electron-forge/maker-deb', platforms: ['linux'], config: {} },
    { name: '@electron-forge/maker-rpm', platforms: ['linux'], config: {} },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'kinderdat',
          name: 'StreamVault',
        },
        prerelease: true,
        draft: false,
      },
    },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  hooks: {
    postPackage: async (_forgeConfig, { outputPaths }) => {
      const electronTarget = resolveElectronTarget()
      const sourceNodeModules = join(process.cwd(), 'node_modules')
      const copyDeps = ['better-sqlite3', 'bindings', 'file-uri-to-path']
      for (const outputPath of outputPaths) {
        const destRoot = join(outputPath, 'resources', 'node_modules')
        ensureDirSync(destRoot)

        for (const dep of copyDeps) {
          const src = join(sourceNodeModules, dep)
          if (!existsSync(src)) {
            throw new Error(`Missing dependency for packaging: ${dep}`)
          }
          copySync(src, join(destRoot, dep))
        }

        // Ensure native addon ABI matches packaged Electron runtime.
        execFileSync(
          process.execPath,
          [
            join(process.cwd(), 'node_modules', 'node-gyp', 'bin', 'node-gyp.js'),
            'rebuild',
            `--target=${electronTarget}`,
            '--dist-url=https://electronjs.org/headers',
            `--arch=${process.arch}`,
          ],
          {
            cwd: join(destRoot, 'better-sqlite3'),
            stdio: 'inherit',
          },
        )
      }
    },
  },
}

export default config
