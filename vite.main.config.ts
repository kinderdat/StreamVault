import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '.vite/build/main',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3'],
    },
  },
})
