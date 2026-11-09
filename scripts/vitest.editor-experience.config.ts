import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: [
      'src/hooks/use-export-retention.test.tsx',
      'src/lib/mini-membership-plans.test.ts',
      'src/lib/mini-single-export.test.ts',
      'src/hooks/use-preload-mini-membership-plans.test.tsx',
      'src/store/use-vip-store-refresh.test.ts',
      'src/lib/automation-login-mode.test.ts',
      'src/components/ui/autocomplete-input.test.tsx',
      'src/editor/field-suggestions.test.tsx',
      'src/editor/editable-date-field.test.tsx',
      'src/app/m/edit/_components/mobile-field-suggestions.test.tsx',
      'src/app/m/edit/_components/mobile-choice-parity.test.tsx',
      'src/app/m/preview/preview-read-only.test.tsx',
      'src/app/m/_components/use-mini-program.test.tsx',
      'src/features/edit/form-fields/month-range-field.test.tsx',
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
