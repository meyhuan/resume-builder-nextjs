import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: [
      'src/components/ui/autocomplete-input.test.tsx',
      'src/editor/field-suggestions.test.tsx',
      'src/editor/editable-date-field.test.tsx',
      'src/app/m/edit/_components/mobile-field-suggestions.test.tsx',
      'src/components/modals/base-info-email.test.tsx',
      'src/components/modals/base-info-month.test.tsx',
      'src/components/modals/job-intention-choices.test.tsx',
      'src/components/templates/one-page-readability.test.tsx',
      'src/components/templates/pagination-feedback.test.tsx',
      'src/hooks/use-pdf-preview-page-count.test.tsx',
      'src/io/pdf-page-count.test.ts',
      'src/components/blocks/hover-actions.test.tsx',
      'src/io/editor-affordance-export.test.ts',
    ],
  },
})
