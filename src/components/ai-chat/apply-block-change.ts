import { useAppStore } from '@/state/store';
import { toResumeContext } from '@/lib/ai/resume-context';
import type { ChatChangeProposal } from '@/lib/ai/tools';

function applyBlockHtmlChange(blockId: string, html: string): boolean {
  let applied = false;
  useAppStore.getState().setResume((draft) => {
    for (const section of draft.sections) {
      for (const block of section.blocks) {
        if (block.id !== blockId) continue;
        if ('contentHtml' in block) {
          (block as { contentHtml: string }).contentHtml = html;
          applied = true;
          return;
        }
        if ('html' in block) {
          (block as { html: string }).html = html;
          applied = true;
          return;
        }
        if (block.type === 'education') {
          block.courseHtml = html;
          applied = true;
        }
      }
    }
  });
  return applied;
}

function getBlockHtml(blockId: string): string {
  const resume = useAppStore.getState().resume;
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (block.id !== blockId) continue;
      if ('contentHtml' in block) return block.contentHtml || '';
      if ('html' in block) return block.html || '';
      if (block.type === 'education') return block.courseHtml || '';
      if (block.type === 'list') return block.items.map((item) => item.html).join('');
    }
  }
  return '';
}

function mapSectionTitle(type: string, fallback: string): string {
  const map: Record<string, string> = {
    work_experience: '工作经历',
    education: '教育经历',
    skills: '相关技能',
    projects: '项目经历',
    certifications: '荣誉证书',
    languages: '语言能力',
    custom: fallback || '自定义模块',
    campus: '在校经历',
  };
  return map[type] || fallback || '自定义模块';
}

function appendSkillsHtml(existingHtml: string, skills: string[], category: string): string {
  const items = skills.map((skill) => `<li>${skill}</li>`).join('');
  const group = category ? `<p><strong>${category}</strong></p><ul>${items}</ul>` : `<ul>${items}</ul>`;
  return `${existingHtml || ''}${group}`;
}

export function applyChangeProposal(proposal: ChatChangeProposal): boolean {
  if (proposal.action === 'updateBlock') {
    return applyBlockHtmlChange(proposal.blockId, proposal.html);
  }

  if (proposal.action === 'addSection') {
    const title = mapSectionTitle(proposal.type, proposal.title);
    useAppStore.getState().addSection(title);
    if (!proposal.contentHtml) return true;
    const resume = useAppStore.getState().resume;
    const section = resume.sections[resume.sections.length - 1];
    const firstBlock = section?.blocks[0];
    if (firstBlock) applyBlockHtmlChange(firstBlock.id, proposal.contentHtml);
    return true;
  }

  if (proposal.action === 'suggestSkills') {
    const resume = useAppStore.getState().resume;
    const skillsSection = resume.sections.find((section) => /技能|skill/i.test(section.title));
    if (!skillsSection) {
      useAppStore.getState().addSection('相关技能');
    }
    const latest = useAppStore.getState().resume;
    const section = latest.sections.find((item) => /技能|skill/i.test(item.title));
    const target = section?.blocks[0];
    if (!target) return false;
    const current = getBlockHtml(target.id);
    return applyBlockHtmlChange(target.id, appendSkillsHtml(current, proposal.skills, proposal.category));
  }

  return false;
}

export function collectProposalsFromOutput(output: unknown): ChatChangeProposal[] {
  if (!output || typeof output !== 'object') return [];
  const record = output as Record<string, unknown>;
  if (Array.isArray(record.proposals)) {
    return record.proposals.filter(isProposal);
  }
  if (isProposal(record)) return [record];
  return [];
}

function isProposal(value: unknown): value is ChatChangeProposal {
  if (!value || typeof value !== 'object') return false;
  const action = (value as { action?: string }).action;
  return action === 'updateBlock' || action === 'addSection' || action === 'suggestSkills';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export interface KeyedProposal {
  readonly key: string;
  readonly proposal: ChatChangeProposal;
}

export function extractProposalsFromMessages(
  messages: Array<{ id?: string; role?: string; parts?: unknown[] }>,
): KeyedProposal[] {
  const keyed: KeyedProposal[] = [];
  for (const message of messages) {
    if (message.role !== 'assistant' || !message.parts) continue;
    message.parts.forEach((part, partIndex) => {
      if (!isRecord(part) || typeof part.type !== 'string' || !part.type.startsWith('tool-')) return;
      if (part.state !== 'output-available') return;
      collectProposalsFromOutput(part.output).forEach((proposal, proposalIndex) => {
        keyed.push({
          key: `${message.id ?? 'msg'}-${partIndex}-${proposalIndex}`,
          proposal,
        });
      });
    });
  }
  return keyed;
}

export function describeProposal(proposal: ChatChangeProposal): string {
  if (proposal.action === 'updateBlock') {
    const ctx = toResumeContext(useAppStore.getState().resume);
    for (const section of ctx.sections) {
      const block = section.blocks.find((item) => item.blockId === proposal.blockId);
      if (!block) continue;
      const label = block.label && block.label !== section.title
        ? `${section.title} · ${block.label}`
        : section.title;
      return `改写「${label}」`;
    }
    return '改写简历模块';
  }
  if (proposal.action === 'addSection') return `新增模块 ${proposal.title}`;
  return `补充技能：${proposal.skills.join('、')}`;
}
