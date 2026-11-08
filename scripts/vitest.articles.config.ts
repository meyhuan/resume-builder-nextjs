import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: { alias: {
    '@': fileURLToPath(new URL('../src', import.meta.url)),
    'server-only': fileURLToPath(new URL('./test-server-only.ts', import.meta.url)),
  } },
  esbuild: { jsx: 'automatic' },
  test: { environment: 'node', include: ['src/lib/articles/*.test.ts', 'src/components/articles/*.test.tsx', 'src/app/next-api/admin/articles/*.test.ts', 'src/app/admin/articles/*.test.tsx'], testTimeout: 15000 },
});
