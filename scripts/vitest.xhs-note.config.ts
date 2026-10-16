import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  test: {
    include: [
      'src/lib/xhs-note/redact.test.ts',
      'src/lib/xhs-note/validate.test.ts',
      'src/lib/xhs-note/sign.test.ts',
      'src/app/next-api/xhs-note/mini/route.smoke.test.ts',
    ],
  },
})
