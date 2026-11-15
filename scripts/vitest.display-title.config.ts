import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: { environment: 'jsdom', setupFiles: ['./scripts/setup-sheet-layout.ts'], include: ['src/**/section-display-title.test.tsx'] },
})
