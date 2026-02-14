import type { UUID } from '@/entities/common/uuid';
import type { ResumeBlock } from '@/entities/blocks/resume-block';

/**
 * A factory function that creates a default block given an ID generator.
 */
type BlockCreator = (idFn: (prefix: string) => UUID) => ResumeBlock;

/**
 * A single entry in the section-type registry.
 *
 * - `label`    — display name shown in the UI (e.g. "工作经历")
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
    label: '工作经历',
    keywords: ['工作', 'work', 'experience'],
    create: (idFn) => ({
      id: idFn('exp'),
      type: 'experience',
      company: '公司名称',
      position: '职位名称',
      industry: '行业',
      startDate: '开始时间',
      endDate: '结束时间',
      contentHtml: '<p>详细描述你的职责范围、工作内容和工作成果。</p>',
    }),
  },
  {
    label: '实习经历',
    keywords: ['实习', 'intern'],
    create: (idFn) => ({
      id: idFn('exp'),
      type: 'experience',
      company: '公司名称',
      position: '实习岗位',
      industry: '行业',
      startDate: '开始时间',
      endDate: '结束时间',
      contentHtml: '<p>描述你的实习内容和收获。</p>',
    }),
  },
  {
    label: '教育经历',
    keywords: ['教育', 'education'],
    create: (idFn) => ({
      id: idFn('edu'),
      type: 'education',
      school: '学校名称',
      major: '专业',
      degree: '学历',
      startDate: '开始时间',
      endDate: '结束时间',
      courseHtml: '<p>大学之前的教育经历建议不写，尽量写与求职行业或者求职岗位相关的课程。</p>',
    }),
  },
  {
    label: '项目经历',
    keywords: ['项目', 'project'],
    create: (idFn) => ({
      id: idFn('proj'),
      type: 'project',
      name: '项目名称',
      role: '项目角色',
      startDate: '开始时间',
      endDate: '结束时间',
      contentHtml: '<p>描述你参与的项目及你在项目中所做的工作。</p>',
    }),
  },
  {
    label: '在校经历',
    keywords: ['在校', '校园', 'school', 'campus'],
    create: (idFn) => ({
      id: idFn('campus'),
      type: 'campus',
      organization: '组织名称',
      position: '职务',
      startDate: '开始时间',
      endDate: '结束时间',
      contentHtml: '<p>描述你在校园活动中的角色和贡献。</p>',
    }),
  },
  {
    label: '相关技能',
    keywords: ['技能', 'skill'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<ul><li>技能1：描述你的熟练程度</li><li>技能2：描述你的熟练程度</li></ul>',
    }),
  },
  {
    label: '荣誉证书',
    keywords: ['荣誉', '证书', '资质', 'qualif', 'honor'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<p>列出你获得的荣誉证书和资质认证。</p>',
    }),
  },
  {
    label: '自定义模块',
    keywords: ['自定义', 'custom'],
    create: (idFn) => ({
      id: idFn('text'),
      type: 'text',
      html: '<p>在此输入内容。</p>',
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
 * Built-in types like 工作经历, 教育经历 etc. are NOT renamable.
 */
export function isCustomSection(title: string): boolean {
  const entry: SectionTypeEntry | undefined = findSectionType(title);
  if (!entry) return true;
  return entry.label === '自定义模块';
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
  return { id: idFn('text'), type: 'text', html: '<p>在此输入内容。</p>' };
}
