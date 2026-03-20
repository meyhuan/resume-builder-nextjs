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
  IconIntern,
  IconOther,
} from '@/components/sections/section-icons';

/**
 * Returns the appropriate icon for a section title.
 */
export function getSectionIcon(title: string): ReactElement {
  const t = title.toLowerCase();
  if (t.includes('experience') || t.includes('work')) return <IconBriefcase />;
  if (t.includes('education')) return <IconGraduationCap />;
  if (t.includes('project')) return <IconCode />;
  if (t.includes('skill')) return <IconAward />;
  if (t.includes('self') || t.includes('evaluation') || t.includes('summary')) return <IconUser />;
  if (t.includes('preference') || t.includes('intention') || t.includes('objective')) return <IconTarget />;
  if (t.includes('intern')) return <IconIntern />;
  if (t.includes('campus') || t.includes('school') || t.includes('activit')) return <IconBook />;
  if (t.includes('qualif') || t.includes('certif')) return <IconStar />;
  if (t.includes('other')) return <IconOther />;
  return <IconOther />;
}
