import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '.vite/build/preload',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/preload/index.ts',
      formats: ['cjs'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: ['electron'],
    },
  },
})
