import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: [
      'src/lib/templates/*.test.ts',
      'src/components/templates/*.test.tsx',
      'src/features/edit/draft/draft-store.test.ts',
    ],
  },
})
