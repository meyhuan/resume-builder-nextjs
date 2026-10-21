import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  test: {
    include: [
      'src/lib/xhs-note/fixed-story.test.ts',
      'src/lib/puppeteer-browser.test.ts',
      'src/lib/xhs-note/story-template.test.ts',
      'src/lib/xhs-note/redact.test.ts',
      'src/lib/xhs-note/validate.test.ts',
      'src/lib/xhs-note/sign.test.ts',
      'src/app/next-api/xhs-note/mini/route.smoke.test.ts',
      'src/lib/xhs-note/fixed-story-prompt.test.ts',
      'src/app/next-api/xhs-note/fixed-story/route.test.ts',
      'src/app/next-api/xhs-note/submit/route.test.ts',
      'src/app/next-api/xhs-note/status/route.test.ts',
    ],
  },
})
