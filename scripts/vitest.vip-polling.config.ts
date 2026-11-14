import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['src/components/vip/*polling*.test.tsx', 'src/components/vip/vip-status-poller.test.ts'],
    clearMocks: true,
  },
})
