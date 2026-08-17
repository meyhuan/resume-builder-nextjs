import type { ResumeData } from '@/entities/resume/resume-data';
import type { ResumeBlock } from '@/entities/blocks/resume-block';

export interface ResumeContextBlock {
  readonly blockId: string;
  readonly type: string;
  readonly label: string;
  readonly content: string;
  readonly meta?: Record<string, string>;
}

export interface ResumeContextPayload {
  readonly name: string;
  readonly baseInfo?: {
    readonly title?: string;
    readonly phone?: string;
    readonly email?: string;
    readonly gender?: string;
    readonly age?: number;
    readonly location?: string;
    readonly currentLocation?: string;
    readonly workStartTime?: string;
    readonly politicalStatus?: string;
  };
  readonly jobIntention?: {
    readonly position?: string;
    readonly city?: string;
    readonly salary?: string;
    readonly type?: string;
    readonly industry?: string;
    readonly currentStatus?: string;
  };
  readonly sections: Array<{
    readonly sectionId: string;
    readonly title: string;
    readonly blocks: ResumeContextBlock[];
  }>;
}

function getBlockLabel(block: ResumeBlock): string {
  if (block.type === 'experience') return block.company || '工作经历';
  if (block.type === 'project') return block.name || '项目经历';
  if (block.type === 'campus') return block.organization || '校园经历';
  if (block.type === 'education') return block.school || '教育经历';
  if (block.type === 'text') return '文本模块';
  if (block.type === 'list') return '列表模块';
  return '内容';
}

function getBlockHtml(block: ResumeBlock): string {
  if ('contentHtml' in block) return block.contentHtml || '';
  if ('html' in block) return block.html || '';
  if (block.type === 'education') return block.courseHtml || '';
  if (block.type === 'list') return block.items.map((item) => item.html).join('');
  return '';
}

function getBlockMeta(block: ResumeBlock): Record<string, string> | undefined {
  if (block.type === 'experience') {
    return {
      company: block.company,
      position: block.position,
      startDate: block.startDate,
      endDate: block.endDate,
    };
  }
  if (block.type === 'project') {
    return {
      name: block.name,
      role: block.role || '',
      startDate: block.startDate,
      endDate: block.endDate,
    };
  }
  if (block.type === 'campus') {
    return {
      organization: block.organization,
      position: block.position,
      startDate: block.startDate,
      endDate: block.endDate,
    };
  }
  if (block.type === 'education') {
    return {
      school: block.school,
      major: block.major || '',
      degree: block.degree || '',
      startDate: block.startDate,
      endDate: block.endDate,
    };
  }
  return undefined;
}

/**
 * Serialize resume data for LLM context.
 * Keeps original HTML so generation quality matches JadeAI.
 * Only strips avatar / portfolio images (token + privacy).
 */
export function toResumeContext(resume: ResumeData): ResumeContextPayload {
  return {
    name: resume.name,
    baseInfo: resume.baseInfo
      ? {
          title: resume.baseInfo.title,
          phone: resume.baseInfo.phone,
          email: resume.baseInfo.email,
          gender: resume.baseInfo.gender,
          age: resume.baseInfo.age,
          location: resume.baseInfo.location,
          currentLocation: resume.baseInfo.currentLocation,
          workStartTime: resume.baseInfo.workStartTime,
          politicalStatus: resume.baseInfo.politicalStatus,
        }
      : undefined,
    jobIntention: resume.jobIntention
      ? {
          position: resume.jobIntention.position,
          city: resume.jobIntention.city,
          salary: resume.jobIntention.salary,
          type: resume.jobIntention.type,
          industry: resume.jobIntention.industry,
          currentStatus: resume.jobIntention.currentStatus,
        }
      : undefined,
    sections: resume.sections.map((section) => ({
      sectionId: section.id,
      title: section.title,
      blocks: section.blocks.map((block) => ({
        blockId: block.id,
        type: block.type,
        label: getBlockLabel(block),
        content: getBlockHtml(block),
        meta: getBlockMeta(block),
      })),
    })),
  };
}

export function serializeResumeContext(resume: ResumeData): string {
  return JSON.stringify(toResumeContext(resume));
}

export function listContextBlocks(resume: ResumeData): ResumeContextBlock[] {
  return toResumeContext(resume).sections.flatMap((section) => section.blocks);
}
