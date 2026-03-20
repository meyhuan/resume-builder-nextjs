import type { UUID } from '@/entities/common/uuid';
import type { ResumeBlock } from '@/entities/blocks/resume-block';

/**
 * A factory function that creates a default block given an ID generator.
 */
type BlockCreator = (idFn: (prefix: string) => UUID) => ResumeBlock;

/**
 * A single entry in the section-type registry.
 *
 * - `label`    — display name shown in the UI (e.g. "Work Experience")
 * - `keywords` — substrings matched against a section title (case-insensitive)
 * - `create`   — factory that produces a default placeholder block
 */
export interface SectionTypeEntry {
  readonly label: string;
  readonly keywords: readonly string[];
  readonly create: BlockCreator;
}

/**
 * Central registry of all known section types.
 *
 * To add a new section type, append an entry here.
 * Everything else (section manager grid, addSection, addBlockByType)
 * derives from this single source of truth.
 */
const SECTION_TYPE_REGISTRY: readonly SectionTypeEntry[] = [
  {
    label: 'Work Experience',
    keywords: ['work', 'experience'],
    create: (idFn) => ({
      id: idFn('exp'),
      type: 'experience',
      company: 'Company Name',
      position: 'Job Title',
      industry: 'Industry',
      startDate: 'Start Date',
      endDate: 'End Date',
      contentHtml: '<p>Describe your responsibilities, tasks, and achievements in detail.</p>',
    }),
  },
  {
    label: 'Internship',
    keywords: ['intern'],
    create: (idFn) => ({
      id: idFn('exp'),
      type: 'experience',
      company: 'Company Name',
      position: 'Intern Title',
      industry: 'Industry',
      startDate: 'Start Date',
      endDate: 'End Date',
      contentHtml: '<p>Describe your internship responsibilities and what you learned.</p>',
    }),
  },
  {
    label: 'Education',
    keywords: ['education'],
    create: (idFn) => ({
      id: idFn('edu'),
      type: 'education',
      school: 'School Name',
      major: 'Major',
      degree: 'Degree',
      startDate: 'Start Date',
      endDate: 'End Date',
      courseHtml: '<p>List relevant coursework related to your target industry or role.</p>',
    }),
  },
  {
    label: 'Projects',
    keywords: ['project'],
    create: (idFn) => ({
      id: idFn('proj'),
      type: 'project',
      name: 'Project Name',
      role: 'Your Role',
      startDate: 'Start Date',
      endDate: 'End Date',
      contentHtml: '<p>Describe the project and your contributions.</p>',
    }),
  },
  {
    label: 'Campus Experience',
    keywords: ['school', 'campus'],
    create: (idFn) => ({
      id: idFn('campus'),
      type: 'campus',
      organization: 'Organization Name',
      position: 'Role',
      startDate: 'Start Date',
      endDate: 'End Date',
      contentHtml: '<p>Describe your role and contributions in campus activities.</p>',
    }),
  },
  {
    label: 'Skills',
    keywords: ['skill'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<ul><li>Skill 1: Describe your proficiency level</li><li>Skill 2: Describe your proficiency level</li></ul>',
    }),
  },
  {
    label: 'Certifications',
    keywords: ['qualif', 'honor', 'certif', 'award'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<p>List your certifications, honors, and awards.</p>',
    }),
  },
  {
    label: 'Custom Section',
    keywords: ['custom'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<p>Enter your content here.</p>',
    }),
  },
];

/**
 * Returns the full registry. Useful for building UI lists (e.g. section manager grid).
 */
export function getSectionTypeRegistry(): readonly SectionTypeEntry[] {
  return SECTION_TYPE_REGISTRY;
}

/**
 * Returns only the display labels from the registry.
 */
export function getAllSectionLabels(): string[] {
  return SECTION_TYPE_REGISTRY.map((entry) => entry.label);
}

/**
 * Finds the matching registry entry for a given section title.
 * Matches by checking if the lowercased title contains any keyword.
 */
export function findSectionType(title: string): SectionTypeEntry | undefined {
  const lower: string = title.toLowerCase();
  return SECTION_TYPE_REGISTRY.find((entry) =>
    entry.keywords.some((kw) => lower.includes(kw))
  );
}

/**
 * Returns true if the section is user-renamable (custom or unknown type).
 * Built-in types like Work Experience, Education etc. are NOT renamable.
 */
export function isCustomSection(title: string): boolean {
  const entry: SectionTypeEntry | undefined = findSectionType(title);
  if (!entry) return true;
  return entry.label === 'Custom Section';
}

/**
 * Creates a default placeholder block for a section title.
 * Falls back to a generic text block if no match is found.
 */
export function createDefaultBlock(
  title: string,
  idFn: (prefix: string) => UUID,
): ResumeBlock {
  const entry: SectionTypeEntry | undefined = findSectionType(title);
  if (entry) return entry.create(idFn);
  return { id: idFn('text'), type: 'text', html: '<p>Enter your content here.</p>' };
}
