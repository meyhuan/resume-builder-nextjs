import type { Prisma } from "@prisma/client";
import type { ResumeBlock } from "@/entities/blocks/resume-block";
import type { ResumeData } from "@/entities/resume/resume-data";
import { normalizeResumeContent } from "@/entities/resume/normalize-resume-content";

export interface ResumeFact {
  readonly id: string;
  readonly sectionId: string;
  readonly blockId: string;
  readonly type: ResumeBlock["type"];
  readonly sectionTitle: string;
  readonly label: string;
  readonly text: string;
  readonly origin?: "resume" | "job_supplement";
  readonly requirementId?: string;
  readonly sourceFactId?: string;
}

const EXCLUDED_SECTION_PATTERN =
  /基本信息|联系方式|联系信息|个人信息|头像|求职意向/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g;
const ID_CARD_PATTERN = /(?<!\d)\d{17}[\dXx](?!\d)/g;
const ACCOUNT_PATTERN =
  /(?:微信|wechat|QQ|联系(?:方式)?)[：:\s]*[A-Za-z0-9_-]{5,}/gi;

function stripHtml(value: string | undefined): string {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function redactPrivateText(value: string): string {
  return value
    .replace(EMAIL_PATTERN, "[邮箱已隐藏]")
    .replace(PHONE_PATTERN, "[手机号已隐藏]")
    .replace(ID_CARD_PATTERN, "[证件号码已隐藏]")
    .replace(ACCOUNT_PATTERN, "[联系账号已隐藏]");
}

function blockToFact(
  sectionId: string,
  sectionTitle: string,
  block: ResumeBlock,
): ResumeFact | null {
  let label = sectionTitle || "简历内容";
  let text = "";

  switch (block.type) {
    case "experience":
      label =
        [block.company, block.position].filter(Boolean).join(" · ") ||
        sectionTitle;
      text = [
        block.company,
        block.position,
        block.industry,
        block.startDate,
        block.endDate,
        stripHtml(block.contentHtml),
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "project":
      label =
        [block.name, block.role].filter(Boolean).join(" · ") || sectionTitle;
      text = [
        block.name,
        block.role,
        block.startDate,
        block.endDate,
        stripHtml(block.contentHtml),
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "campus":
      label =
        [block.organization, block.position].filter(Boolean).join(" · ") ||
        sectionTitle;
      text = [
        block.organization,
        block.position,
        block.startDate,
        block.endDate,
        stripHtml(block.contentHtml),
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "education":
      label =
        [block.school, block.major, block.degree].filter(Boolean).join(" · ") ||
        sectionTitle;
      text = [
        block.school,
        block.major,
        block.degree,
        block.startDate,
        block.endDate,
        stripHtml(block.courseHtml),
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "text":
      text = stripHtml(block.html);
      break;
    case "list":
      text = block.items
        .map((item) => stripHtml(item.html))
        .filter(Boolean)
        .join("\n");
      break;
    default:
      return null;
  }

  text = redactPrivateText(text);
  if (!text) return null;
  return {
    id: `${sectionId}:${block.id}`,
    sectionId,
    blockId: block.id,
    type: block.type,
    sectionTitle: sectionTitle || "未命名模块",
    label,
    text,
    origin: "resume",
  };
}

export function extractResumeFacts(
  content: Prisma.JsonValue,
  resumeId = "resume",
): ResumeFact[] {
  const resume = normalizeResumeContent(
    content as unknown as Partial<ResumeData> & Record<string, unknown>,
    { fallbackId: resumeId },
  );

  return resume.sections.flatMap((section) => {
    if (EXCLUDED_SECTION_PATTERN.test(section.title)) return [];
    return section.blocks
      .map((block) => blockToFact(section.id, section.title, block))
      .filter((fact): fact is ResumeFact => fact !== null);
  });
}

export function parseResumeFacts(value: Prisma.JsonValue): ResumeFact[] {
  if (!Array.isArray(value)) return [];
  const items = value as unknown[];
  return items.filter((item): item is ResumeFact => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.id === "string" &&
      typeof record.sectionId === "string" &&
      typeof record.blockId === "string" &&
      typeof record.sectionTitle === "string" &&
      typeof record.label === "string" &&
      typeof record.text === "string" &&
      (record.origin === undefined ||
        record.origin === "resume" ||
        record.origin === "job_supplement") &&
      (record.requirementId === undefined ||
        typeof record.requirementId === "string") &&
      (record.sourceFactId === undefined ||
        typeof record.sourceFactId === "string")
    );
  });
}
