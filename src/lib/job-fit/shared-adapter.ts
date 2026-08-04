import type {
  CanonicalResume,
  JobFitChange as SharedJobFitChange,
  JobFitResult as SharedJobFitResult,
  PatchLocator,
} from "@meyhuan/job-fit-engine/contracts";
import type { ResumeBlock } from "@/entities/blocks/resume-block";
import type { ResumeData } from "@/entities/resume/resume-data";
import type { JobFitChange, JobFitGenerationResult } from "./types";
import { stripHtml } from "./resume-content";

const SUMMARY_TITLE = /个人总结|自我评价|职业概述|professional summary|summary|profile/i;
const SKILLS_TITLE = /技能|能力|专长|skills|competenc/i;

interface LegacyLocator {
  readonly sectionId: string;
  readonly blockId: string;
  readonly field: "contentHtml" | "courseHtml" | "html";
  readonly itemId?: string;
}

export function toCanonicalResume(resume: ResumeData): CanonicalResume {
  const summaryField = findSummaryField(resume);
  const skills = resume.sections.flatMap((section) => {
    if (!SKILLS_TITLE.test(section.title)) return [];
    return section.blocks.flatMap((block) => {
      if (block.type === "list") {
        return [{
          id: `skills:${section.id}:${block.id}`,
          category: section.title,
          items: block.items.map((item) => stripHtml(item.html)).filter(Boolean),
        }];
      }
      if (block.type === "text") {
        const items = stripHtml(block.html).split(/[、,，;；|]/).map((item) => item.trim()).filter(Boolean);
        return items.length ? [{ id: `skills:${section.id}:${block.id}`, category: section.title, items }] : [];
      }
      return [];
    });
  });

  return {
    schemaVersion: "1",
    id: resume.id,
    locale: "zh-CN",
    header: {
      name: resume.name || "未命名",
      headline: resume.jobIntention?.position ?? resume.baseInfo?.title ?? "",
      email: resume.baseInfo?.email ?? "",
      phone: resume.baseInfo?.phone ?? "",
      location: resume.baseInfo?.location ?? resume.baseInfo?.currentLocation ?? resume.jobIntention?.city ?? "",
      links: [],
    },
    summary: summaryField ? stripHtml(summaryField.html) : "",
    skills,
    sections: resume.sections.flatMap((section) => {
      const items = section.blocks.flatMap((block) => {
        if (summaryField?.sectionId === section.id && summaryField.blockId === block.id) return [];
        if (SKILLS_TITLE.test(section.title) && (block.type === "list" || block.type === "text")) return [];
        return blockToCanonicalItems(section.id, section.title, block);
      });
      return items.length ? [{ id: section.id, title: section.title, kind: sectionKind(section.blocks), items }] : [];
    }),
  };
}

export function fromCanonicalResume(source: ResumeData, canonical: CanonicalResume, targetRole: string): ResumeData {
  const resume = structuredClone(source);
  resume.jobIntention = { ...(resume.jobIntention ?? {}), position: targetRole };
  applySummary(resume, canonical.summary);
  applySkills(resume, canonical);

  for (const section of canonical.sections) {
    for (const item of section.items) {
      const sourceSection = resume.sections.find((entry) => entry.id === section.id);
      const block = sourceSection?.blocks.find((entry) => entry.id === item.id);
      if (!block) continue;
      for (const bullet of item.bullets) {
        const locator = parseBulletId(bullet.id);
        if (locator) {
          writeField(block, locator.field, locator.itemId, bullet.text);
        } else if (bullet.id.startsWith("ai-")) {
          appendBullet(block, bullet.text);
        }
      }
    }
  }
  return resume;
}

export function toLegacyJobFitResult(
  source: ResumeData,
  shared: SharedJobFitResult,
  targetRole: string,
): JobFitGenerationResult {
  const optimizedResume = fromCanonicalResume(source, shared.optimizedResume, targetRole);
  const claimById = new Map(shared.claims.map((claim) => [claim.id, claim]));
  const changes = shared.changes.flatMap((change) => toLegacyChange(source, optimizedResume, change, claimById.get(change.claimIds[0] ?? "")));
  const count = (category: "KEYWORD" | "CAPABILITY" | "EXPERIENCE") =>
    changes.filter((change) => change.category === category).length;
  const dimension = (
    value: SharedJobFitResult["scoring"]["keyword"],
    category: "KEYWORD" | "CAPABILITY" | "EXPERIENCE",
    summary: string,
  ) => ({
    original: value.before,
    optimized: value.after,
    improvement: value.after - value.before,
    changeCount: count(category),
    summary,
  });
  return {
    optimizedResume,
    scoring: {
      version: "job-fit-score-v2",
      original: shared.scoring.original,
      optimized: shared.scoring.optimized,
      improvement: shared.scoring.improvement,
      keyword: dimension(shared.scoring.keyword, "KEYWORD", "让岗位关键词自然进入相关经历"),
      capability: dimension(shared.scoring.capability, "CAPABILITY", "突出已有能力与可迁移能力"),
      experience: dimension(shared.scoring.experience, "EXPERIENCE", "增强职责、成果和影响表达"),
    },
    changes,
    summary: {
      completed: shared.completed,
      suggestions: shared.suggestions,
      requirements: shared.requirements.map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
        category: requirement.type,
        keywords: requirement.keywords,
        weight: requirement.weight,
      })),
    },
    modelName: shared.run.model,
    factGuardRejectCount: shared.rejectedChanges.length,
    resultSchemaVersion: shared.schemaVersion,
    engineVersion: shared.run.engineVersion,
    readiness: shared.readiness,
    claims: shared.claims,
    evidenceSummary: shared.evidenceSummary,
    promptVersion: shared.run.promptVersion,
  };
}

function blockToCanonicalItems(sectionId: string, sectionTitle: string, block: ResumeBlock): CanonicalResume["sections"][number]["items"] {
  if (block.type === "experience") return [canonicalItem(block.id, block.company, block.position, block.startDate, block.endDate, fieldBullet(sectionId, block.id, "contentHtml", block.contentHtml))];
  if (block.type === "project") return [canonicalItem(block.id, block.name, block.role ?? "", block.startDate, block.endDate, fieldBullet(sectionId, block.id, "contentHtml", block.contentHtml))];
  if (block.type === "campus") return [canonicalItem(block.id, block.organization, block.position, block.startDate, block.endDate, fieldBullet(sectionId, block.id, "contentHtml", block.contentHtml))];
  if (block.type === "education") return [canonicalItem(block.id, block.school, [block.major, block.degree].filter(Boolean).join(" · "), block.startDate, block.endDate, block.courseHtml ? fieldBullet(sectionId, block.id, "courseHtml", block.courseHtml) : [])];
  if (block.type === "text") return [canonicalItem(block.id, sectionTitle, "", "", "", fieldBullet(sectionId, block.id, "html", block.html))];
  return [canonicalItem(
    block.id,
    sectionTitle,
    "",
    "",
    "",
    block.items.map((entry) => ({ id: bulletId(sectionId, block.id, "html", entry.id), text: stripHtml(entry.html) })).filter((entry) => entry.text),
  )];
}

function canonicalItem(id: string, heading: string, subheading: string, startDate: string, endDate: string, bullets: { id: string; text: string }[]) {
  return { id, heading: heading || "内容", subheading, location: "", dates: [startDate, endDate].filter(Boolean).join(" – "), details: [], bullets };
}

function fieldBullet(sectionId: string, blockId: string, field: LegacyLocator["field"], html: string) {
  const text = stripHtml(html);
  return text ? [{ id: bulletId(sectionId, blockId, field), text }] : [];
}

function bulletId(sectionId: string, blockId: string, field: LegacyLocator["field"], itemId?: string): string {
  return ["field", sectionId, blockId, field, itemId].filter(Boolean).join(":");
}

function parseBulletId(value: string): LegacyLocator | null {
  const [prefix, sectionId, blockId, field, itemId] = value.split(":");
  if (prefix !== "field" || !sectionId || !blockId || !["contentHtml", "courseHtml", "html"].includes(field ?? "")) return null;
  return { sectionId, blockId, field: field as LegacyLocator["field"], ...(itemId ? { itemId } : {}) };
}

function sectionKind(blocks: readonly ResumeBlock[]): CanonicalResume["sections"][number]["kind"] {
  if (blocks.some((block) => block.type === "experience")) return "EXPERIENCE";
  if (blocks.some((block) => block.type === "project")) return "PROJECTS";
  if (blocks.some((block) => block.type === "campus")) return "CAMPUS";
  if (blocks.some((block) => block.type === "education")) return "EDUCATION";
  return "CUSTOM";
}

function findSummaryField(resume: ResumeData): { sectionId: string; blockId: string; html: string } | null {
  for (const section of resume.sections) {
    if (!SUMMARY_TITLE.test(section.title)) continue;
    const block = section.blocks.find((entry) => entry.type === "text");
    if (block?.type === "text") return { sectionId: section.id, blockId: block.id, html: block.html };
  }
  return null;
}

function applySummary(resume: ResumeData, summary: string): void {
  if (!summary) return;
  const located = findSummaryField(resume);
  if (located) {
    const section = resume.sections.find((entry) => entry.id === located.sectionId);
    const block = section?.blocks.find((entry) => entry.id === located.blockId);
    if (block?.type === "text") block.html = paragraph(summary);
    return;
  }
  resume.sections.unshift({
    id: `job-fit-summary-${resume.id}`,
    title: "个人总结",
    columns: 1,
    blocks: [{ id: `job-fit-summary-block-${resume.id}`, type: "text", html: paragraph(summary) }],
  });
}

function applySkills(resume: ResumeData, canonical: CanonicalResume): void {
  for (const group of canonical.skills) {
    const [, sectionId, blockId] = group.id.split(":");
    const section = resume.sections.find((entry) => entry.id === sectionId);
    const block = section?.blocks.find((entry) => entry.id === blockId);
    if (block?.type === "list") {
      block.items = group.items.map((item, index) => ({
        id: block.items[index]?.id ?? `job-fit-skill-${block.id}-${index + 1}`,
        html: paragraph(item),
      }));
    } else if (block?.type === "text") {
      block.html = paragraph(group.items.join("、"));
    } else if (!block && group.items.length) {
      const target = resume.sections.find((entry) => SKILLS_TITLE.test(entry.title));
      if (target) target.blocks.push({ id: `job-fit-skills-${resume.id}`, type: "text", html: paragraph(group.items.join("、")) });
      else resume.sections.push({ id: `job-fit-skills-section-${resume.id}`, title: "核心技能", columns: 1, blocks: [{ id: `job-fit-skills-${resume.id}`, type: "text", html: paragraph(group.items.join("、")) }] });
    }
  }
}

function writeField(block: ResumeBlock, field: LegacyLocator["field"], itemId: string | undefined, text: string): void {
  const html = paragraph(text);
  if (block.type === "list" && itemId) {
    const item = block.items.find((entry) => entry.id === itemId);
    if (item) item.html = html;
  } else if (field === "contentHtml" && (block.type === "experience" || block.type === "project" || block.type === "campus")) {
    (block as { contentHtml: string }).contentHtml = html;
  } else if (field === "courseHtml" && block.type === "education") {
    (block as { courseHtml?: string }).courseHtml = html;
  } else if (field === "html" && block.type === "text") {
    block.html = html;
  }
}

function appendBullet(block: ResumeBlock, text: string): void {
  const html = `<p>• ${escapeHtml(text)}</p>`;
  if (block.type === "experience" || block.type === "project" || block.type === "campus") {
    (block as { contentHtml: string }).contentHtml += html;
  } else if (block.type === "education") {
    (block as { courseHtml?: string }).courseHtml = `${block.courseHtml ?? ""}${html}`;
  } else if (block.type === "text") block.html += html;
  else block.items.push({ id: `job-fit-item-${block.id}-${block.items.length + 1}`, html: paragraph(text) });
}

function toLegacyChange(
  source: ResumeData,
  optimized: ResumeData,
  change: SharedJobFitChange,
  claim?: SharedJobFitResult["claims"][number],
): JobFitChange[] {
  const locator = legacyLocator(source, change.locator);
  if (!locator) return [];
  const originalHtml = readField(source, locator) ?? paragraph(change.before);
  const optimizedHtml = readField(optimized, locator) ?? paragraph(change.after);
  return [{
    id: change.id,
    sectionId: locator.sectionId,
    blockId: locator.blockId,
    field: locator.field,
    ...(locator.itemId ? { itemId: locator.itemId } : {}),
    optimizedHtml,
    category: change.category,
    reason: change.reason,
    requirementId: change.requirementIds[0],
    evidence: change.evidenceIds.length ? change.evidenceIds.join("、") : "由完整原简历上下文支持",
    originalHtml,
    originalText: change.before,
    optimizedText: change.after,
    originalStart: 0,
    originalEnd: change.before.length,
    optimizedStart: 0,
    optimizedEnd: change.after.length,
    contextHash: change.contextHash.slice(0, 32),
    claimStatus: claim?.status,
    claimId: claim?.id,
  }];
}

function legacyLocator(resume: ResumeData, locator: PatchLocator): LegacyLocator | null {
  if (locator.bulletId) return parseBulletId(locator.bulletId);
  if (locator.skillGroupId) {
    const [, sectionId, blockId] = locator.skillGroupId.split(":");
    if (sectionId && blockId) return { sectionId, blockId, field: "html" };
  }
  if (locator.sectionId && locator.itemId) {
    const section = resume.sections.find((entry) => entry.id === locator.sectionId);
    const block = section?.blocks.find((entry) => entry.id === locator.itemId);
    if (block?.type === "education") return { sectionId: locator.sectionId, blockId: block.id, field: "courseHtml" };
    if (block?.type === "text" || block?.type === "list") return { sectionId: locator.sectionId, blockId: block.id, field: "html" };
    if (block) return { sectionId: locator.sectionId, blockId: block.id, field: "contentHtml" };
  }
  const summary = findSummaryField(resume);
  return summary
    ? { sectionId: summary.sectionId, blockId: summary.blockId, field: "html" }
    : { sectionId: `job-fit-summary-${resume.id}`, blockId: `job-fit-summary-block-${resume.id}`, field: "html" };
}

function readField(resume: ResumeData, locator: LegacyLocator): string | undefined {
  const block = resume.sections.find((entry) => entry.id === locator.sectionId)?.blocks.find((entry) => entry.id === locator.blockId);
  if (!block) return undefined;
  if (block.type === "list" && locator.itemId) return block.items.find((entry) => entry.id === locator.itemId)?.html;
  if (locator.field === "contentHtml" && (block.type === "experience" || block.type === "project" || block.type === "campus")) return block.contentHtml;
  if (locator.field === "courseHtml" && block.type === "education") return block.courseHtml;
  if (locator.field === "html" && block.type === "text") return block.html;
  return undefined;
}

function paragraph(value: string): string {
  return `<p>${escapeHtml(value)}</p>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}
