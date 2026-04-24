'use client'

import type { ReactElement } from 'react'
import { ResumeWizard } from '@/components/ai/resume-wizard'

/**
 * Mobile AI generate route.
 *
 * Reuses the PC `ResumeWizard` chat-style flow. `WizardLayout` detects the
 * `/m` route prefix via `usePathname()` and redirects saved resumes to
 * `/m/edit?id=...` instead of the PC editor, so no mobile-specific fork is
 * needed here.
 */
export default function MobileAiGeneratePage(): ReactElement {
  return <ResumeWizard />
}
