import type { ReactElement } from 'react';
import type { ResumeData } from '@/entities/resume/resume-data';
import type { ThemeTokens } from '@/entities/theme/theme-tokens';

/**
 * Template definition responsible for rendering resume content.
 */
export interface TemplateDefinition {
  readonly id: string;
  readonly name: string;
  readonly render: (input: { resume: ResumeData; theme: ThemeTokens }) => ReactElement;
}
