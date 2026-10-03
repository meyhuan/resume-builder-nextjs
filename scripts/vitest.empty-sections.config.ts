import { defineConfig, mergeConfig } from 'vitest/config'
import base from './vitest.display-title.config'

export default mergeConfig(base, defineConfig({
  test: { include: ['src/entities/resume/empty-sections.test.tsx'] },
}))
