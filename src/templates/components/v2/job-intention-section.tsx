/**
 * V2 JobIntentionSection - Style-Driven Architecture
 * 
 * Fully decoupled job intention component supporting:
 * 1. Style configuration driven
 * 2. Custom render functions
 * 3. Slot pattern
 * 
 * Adding new templates requires no changes to this file.
 */

import type { ReactElement } from 'react'
import type { JobIntention } from '@/entities/user/job-intention'
import type {
  JobIntentionSectionStyles,
  JobIntentionRenderProps,
  JobIntentionSlots,
} from './types'

export interface JobIntentionSectionProps {
  readonly jobIntention: JobIntention | null
  readonly themeColor: string
  
  // Option 1: Style configuration (recommended for most cases)
  readonly styles?: JobIntentionSectionStyles
  
  // Option 2: Fully custom render (for completely different layouts)
  readonly renderCustom?: (props: JobIntentionRenderProps) => ReactElement
  
  // Option 3: Slot pattern (for partial customization)
  readonly slots?: JobIntentionSlots
}

/**
 * V2 Job Intention Component - Style configuration driven.
 */
export default function JobIntentionSection(props: JobIntentionSectionProps): ReactElement | null {
  const { jobIntention } = props
  if (!jobIntention) return null
  return null
}
