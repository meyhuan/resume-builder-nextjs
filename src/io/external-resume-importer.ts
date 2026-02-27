import type { ResumeData } from '@/entities/resume/resume-data';
import type { BaseInfo } from '@/entities/user/base-info';
import type { JobIntention } from '@/entities/user/job-intention';
import type { Section } from '@/entities/resume/section';
import type { ExperienceBlock } from '@/entities/blocks/experience-block';
import type { EducationBlock } from '@/entities/blocks/education-block';
import type { ProjectBlock } from '@/entities/blocks/project-block';
import type { CampusBlock } from '@/entities/blocks/campus-block';
import type { TextBlock } from '@/entities/blocks/text-block';
import type { ExternalResume } from './external-resume-types';

/**
 * Maps external JSON resume to internal ResumeData model.
 */
export function mapExternalResume(ext: ExternalResume): ResumeData {
  const baseInfo: BaseInfo | undefined = mapBaseInfo(ext);
  const jobIntention: JobIntention | undefined = mapJobIntentionData(ext);
  const sections: Section[] = [];

  // Job intention is now handled separately via jobIntention field, not as a section

  if (ext.self_evaluation && !ext.self_evaluation.is_hide) {
    const selfSection = mapSelfEvaluation(ext);
    if (selfSection) sections.push(selfSection);
  }

  if (ext.experience && ext.experience.length > 0) {
    const expSection = mapExperience(ext);
    if (expSection) sections.push(expSection);
  }

  if (ext.program_experience && ext.program_experience.length > 0) {
    const projSection = mapProjects(ext);
    if (projSection) sections.push(projSection);
  }

  if (ext.education && ext.education.length > 0) {
    const eduSection = mapEducation(ext);
    if (eduSection) sections.push(eduSection);
  }

  if (ext.intern && ext.intern.length > 0) {
    const internSection = mapInternship(ext);
    if (internSection) sections.push(internSection);
  }

  if (ext.skills && !ext.skills.is_hide) {
    const skillSection = mapSkills(ext);
    if (skillSection) sections.push(skillSection);
  }

  if (ext.qualifications && !ext.qualifications.is_hide) {
    const qualSection = mapQualifications(ext);
    if (qualSection) sections.push(qualSection);
  }

  if (ext.school_exps && ext.school_exps.length > 0) {
    const schoolSection = mapSchoolExps(ext);
    if (schoolSection) sections.push(schoolSection);
  }

  if (ext.custom_module_info && ext.custom_module_info.length > 0) {
    const customSections = mapCustomModules(ext);
    sections.push(...customSections);
  }

  return {
    id: 'resume-imported',
    name: ext.base_info.name,
    baseInfo,
    jobIntention,
    sections,
  };
}

function mapJobIntentionData(ext: ExternalResume): JobIntention | undefined {
  const ji = ext.job_intention;
  if (!ji || ji.is_hide) return undefined;
  return {
    position: ji.objective,
    city: ji.city,
    salary: ji.salary,
    type: ji.type,
  };
}

function mapBaseInfo(ext: ExternalResume): BaseInfo | undefined {
  const bi = ext.base_info;
  if (!bi) return undefined;
  return {
    avatarUrl: bi.url,
    title: ext.job_intention?.objective,
    phone: bi.phone,
    email: bi.mail,
    gender: bi.gender,
    age: bi.age ? parseInt(bi.age, 10) : undefined,
  };
}

function mapSelfEvaluation(ext: ExternalResume): Section | undefined {
  const se = ext.self_evaluation;
  if (!se || !se.content) return undefined;
  const blocks: TextBlock[] = [{ id: 'block-self-evaluation', type: 'text', html: se.content }];
  return {
    id: 'section-self-evaluation',
    title: '自我评价',
    columns: 1,
    blocks,
  };
}

function mapExperience(ext: ExternalResume): Section | undefined {
  const items = (ext.experience || []).filter((it) => !it.is_hide);
  if (items.length === 0) return undefined;
  const blocks: ExperienceBlock[] = items.map((it) => ({
    id: it.id,
    type: 'experience',
    company: it.name,
    position: it.position,
    industry: it.industry,
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    contentHtml: it.content,
  }));
  return {
    id: 'section-experience',
    title: '工作经历',
    columns: 1,
    blocks,
  };
}

function mapProjects(ext: ExternalResume): Section | undefined {
  const items = (ext.program_experience || []).filter((it) => !it.is_hide);
  if (items.length === 0) return undefined;
  const blocks: ProjectBlock[] = items.map((it) => ({
    id: it.id,
    type: 'project',
    name: it.name,
    role: it.role,
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    contentHtml: it.content,
  }));
  return {
    id: 'section-projects',
    title: '项目经历',
    columns: 1,
    blocks,
  };
}

function mapEducation(ext: ExternalResume): Section | undefined {
  const items = (ext.education || []).filter((it) => !it.is_hide);
  if (items.length === 0) return undefined;
  const blocks: EducationBlock[] = items.map((it) => ({
    id: it.id,
    type: 'education',
    school: it.name,
    major: it.major,
    degree: it.degree,
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    courseHtml: it.course,
  }));
  return {
    id: 'section-education',
    title: '教育经历',
    columns: 1,
    blocks,
  };
}

function mapInternship(ext: ExternalResume): Section | undefined {
  const items = (ext.intern || []).filter((it) => !it.is_hide);
  if (items.length === 0) return undefined;
  const blocks: ExperienceBlock[] = items.map((it) => ({
    id: it.id,
    type: 'experience',
    company: it.name,
    position: it.position,
    industry: it.industry,
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    contentHtml: it.content,
  }));
  return {
    id: 'section-internship',
    title: '实习经历',
    columns: 1,
    blocks,
  };
}

function mapSkills(ext: ExternalResume): Section | undefined {
  const sc = ext.skills;
  if (!sc || !sc.content) return undefined;
  const blocks: TextBlock[] = [{ id: 'block-skills', type: 'text', html: sc.content }];
  return {
    id: 'section-skills',
    title: '专业技能',
    columns: 1,
    blocks,
  };
}

function mapQualifications(ext: ExternalResume): Section | undefined {
  const q = ext.qualifications;
  if (!q || !q.content) return undefined;
  const blocks: TextBlock[] = [{ id: 'block-qualifications', type: 'text', html: q.content }];
  return {
    id: 'section-qualifications',
    title: '资质证书',
    columns: 1,
    blocks,
  };
}

function mapSchoolExps(ext: ExternalResume): Section | undefined {
  const items = (ext.school_exps || []).filter((it) => !it.is_hide);
  if (items.length === 0) return undefined;
  const blocks: CampusBlock[] = items.map((it) => ({
    id: it.id,
    type: 'campus',
    organization: it.name,
    position: it.position || '成员',
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    contentHtml: it.content,
  }));
  return {
    id: 'section-school-exps',
    title: '校园经历',
    columns: 1,
    blocks,
  };
}

function mapCustomModules(ext: ExternalResume): Section[] {
  const modules = (ext.custom_module_info || []).filter((m) => !m.is_hide);
  return modules.map((m, idx) => {
    const block: TextBlock = {
      id: `block-custom-${idx}`,
      type: 'text',
      html: m.content,
    };
    return {
      id: `section-custom-${idx}`,
      title: m.module_name || m.name || '自定义模块',
      columns: 1,
      blocks: [block],
    };
  });
}
