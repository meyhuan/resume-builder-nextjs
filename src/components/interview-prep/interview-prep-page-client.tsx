'use client';

import type { ReactElement } from 'react';
import { InterviewPrepDialog } from '@/components/interview-prep/interview-prep-dialog';

export function InterviewPrepPageClient(): ReactElement {
  return (
    <InterviewPrepDialog
      embedded
      open
      onOpenChange={() => undefined}
    />
  );
}
