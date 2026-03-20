import type { ReactElement } from 'react';
import type { JobIntention } from '@/entities/user/job-intention';

/**
 * Display job intention with edit functionality.
 */
export interface JobIntentionViewProps {
  readonly jobIntention: JobIntention | null;
  readonly themeColor: string;
}

export default function JobIntentionView(props: JobIntentionViewProps): ReactElement | null {
  const { jobIntention } = props;
  if (!jobIntention) return null;
  return null;
}
