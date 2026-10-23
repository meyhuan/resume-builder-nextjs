import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./test-server-only.ts', import.meta.url)),
    },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: [
      'src/lib/ai/**/*.test.ts',
      'src/lib/ai/**/*.test.tsx',
      'src/lib/resume/**/*.test.ts',
      'src/components/ai-chat/unified*.test.tsx',
      'src/components/ai-section/**/*.test.tsx',
      'src/ui/resizable-editor-sidebar.test.tsx',
      'src/app/next-api/ai/chat/task/*.test.ts',
      'scripts/polish-eval/**/*.test.ts',
    ],
    testTimeout: 15000,
  },
});
