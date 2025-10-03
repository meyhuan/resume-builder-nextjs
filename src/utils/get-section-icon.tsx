import type { ReactElement } from 'react';
import {
  IconBriefcase,
  IconGraduationCap,
  IconCode,
  IconAward,
  IconUser,
  IconTarget,
  IconBook,
  IconStar,
} from '@/components/sections/section-icons';

/**
 * Returns the appropriate icon for a section title.
 */
export function getSectionIcon(title: string): ReactElement | null {
  const t = title.toLowerCase();
  if (t.includes('工作') || t.includes('experience')) return <IconBriefcase />;
  if (t.includes('教育') || t.includes('education')) return <IconGraduationCap />;
  if (t.includes('项目') || t.includes('project')) return <IconCode />;
  if (t.includes('技能') || t.includes('skill')) return <IconAward />;
  if (t.includes('自我') || t.includes('评价') || t.includes('self')) return <IconUser />;
  if (t.includes('求职') || t.includes('意向') || t.includes('intention')) return <IconTarget />;
  if (t.includes('实习') || t.includes('intern')) return <IconBriefcase />;
  if (t.includes('校园') || t.includes('school')) return <IconBook />;
  if (t.includes('资质') || t.includes('证书') || t.includes('qualif')) return <IconStar />;
  return null;
}
