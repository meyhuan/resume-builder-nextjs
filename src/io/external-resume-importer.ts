import type { ResumeData } from '@/entities/resume/resume-data';
import type { BaseInfo } from '@/entities/user/base-info';
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
  const sections: Section[] = [];

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
    sections,
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
    showAvatar: false,
  };
}

function mapSelfEvaluation(ext: ExternalResume): Section | undefined {
  const se = ext.self_evaluation;
  if (!se || !se.content) return undefined;
  const blocks: TextBlock[] = [{ id: 'block-self-evaluation', type: 'text', html: se.content }];
  return {
    id: 'section-self-evaluation',
    title: 'Professional Summary',
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
    title: 'Work Experience',
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
    title: 'Project Experience',
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
    title: 'Education',
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
    title: 'Internship',
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
    title: 'Skills',
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
    title: 'Qualifications',
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
    position: it.position || 'Member',
    startDate: it.period?.start || '',
    endDate: it.period?.end || '',
    contentHtml: it.content,
  }));
  return {
    id: 'section-school-exps',
    title: 'Campus Experience',
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
      title: m.module_name || m.name || 'Custom Section',
      columns: 1,
      blocks: [block],
    };
  });
}
