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
      'src/hooks/use-ai-chat.test.tsx',
      'src/hooks/use-editor-sidebar-preference.test.tsx',
      'src/state/editor-ui-store.test.ts',
      'src/components/ai-section/*.test.tsx',
      'src/lib/ai/section-client.test.tsx',
    ],
  },
});
