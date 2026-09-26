import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  test: {
    include: [
      'src/lib/sync-user-identity.test.ts',
      'src/lib/quota/quota-identity.test.ts',
      'src/app/m/sso/route.test.ts',
    ],
  },
})
