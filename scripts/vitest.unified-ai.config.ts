import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) },
  },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: [
      'src/lib/ai/unified/**/*.test.ts',
      'src/components/ai-chat/unified*.test.tsx',
      'src/ui/resizable-editor-sidebar.test.tsx',
      'src/app/next-api/ai/chat/task/*.test.ts',
    ],
    testTimeout: 15000,
  },
});
