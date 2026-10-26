import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  test: { environment: 'node', include: ['scripts/generate-docx-samples.test.ts', 'src/app/next-api/export-file/**/docx-access.test.ts', 'src/app/next-api/exports/mini/docx-membership.test.ts'] },
})
