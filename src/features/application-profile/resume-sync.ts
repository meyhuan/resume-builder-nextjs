import { randomUUID } from "node:crypto";
import type { ResumeData } from "@/entities/resume/resume-data";
import type { ResumeBlock } from "@/entities/blocks/resume-block";
import {
  createEmptyApplicationProfile,
  type ApplicationProfilePayload,
} from "./schema";

function textFromHtml(value: string | undefined): string {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/li>|<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function profileFromResume(
  resume: ResumeData,
): ApplicationProfilePayload {
  const profile = createEmptyApplicationProfile();
  profile.personal.fullName = resume.name || "";
  profile.personal.gender = resume.baseInfo?.gender || "";
  profile.personal.height = resume.baseInfo?.height || "";
  profile.personal.weight = resume.baseInfo?.weight || "";
  profile.personal.photoUrl = resume.baseInfo?.avatarUrl || "";
  profile.contact.phone = resume.baseInfo?.phone || "";
  profile.contact.email = resume.baseInfo?.email || "";
  profile.contact.currentCity =
    resume.baseInfo?.currentLocation || resume.baseInfo?.location || "";
  profile.contact.householdRegistration = resume.baseInfo?.household || "";
  profile.identity.ethnicity = resume.baseInfo?.nation || "";
  profile.identity.politicalStatus = resume.baseInfo?.politicalStatus || "";
  profile.jobPreference.targetRole =
    resume.jobIntention?.position || resume.baseInfo?.title || "";
  profile.jobPreference.targetCity = resume.jobIntention?.city || "";
  profile.jobPreference.employmentType = resume.jobIntention?.type || "";
  profile.jobPreference.expectedSalary = resume.jobIntention?.salary || "";

  for (const section of resume.sections || []) {
    for (const block of section.blocks || [])
      addBlock(profile, block, section.title);
  }
  return profile;
}

function addBlock(
  profile: ApplicationProfilePayload,
  block: ResumeBlock,
  sectionTitle: string,
): void {
  if (block.type === "education") {
    profile.education.push({
      id: block.id || randomUUID(),
      school: block.school,
      major: block.major || "",
      degree: block.degree || "",
      startDate: block.startDate,
      endDate: block.endDate,
      educationType: "",
      gpa: "",
      rank: "",
      courses: textFromHtml(block.courseHtml),
      description: "",
    });
    return;
  }
  if (block.type === "experience") {
    profile.experiences.push({
      id: block.id || randomUUID(),
      type: /实习/i.test(sectionTitle) ? "intern" : "work",
      company: block.company,
      position: block.position,
      industry: block.industry || "",
      location: "",
      startDate: block.startDate,
      endDate: block.endDate,
      description: textFromHtml(block.contentHtml),
    });
    return;
  }
  if (block.type === "project") {
    profile.projects.push({
      id: block.id || randomUUID(),
      name: block.name,
      role: block.role || "",
      startDate: block.startDate,
      endDate: block.endDate,
      description: textFromHtml(block.contentHtml),
    });
    return;
  }
  if (block.type === "campus") {
    profile.campus.push({
      id: block.id || randomUUID(),
      organization: block.organization,
      position: block.position,
      startDate: block.startDate,
      endDate: block.endDate,
      description: textFromHtml(block.contentHtml),
    });
    return;
  }
  if (block.type === "text") {
    const value = textFromHtml(block.html);
    if (/自我|评价|总结/i.test(sectionTitle))
      profile.abilities.selfEvaluation ||= value;
    else if (/证书|资质/i.test(sectionTitle))
      profile.abilities.certificates ||= value;
    else if (/语言/i.test(sectionTitle)) profile.abilities.languages ||= value;
    else if (/技能/i.test(sectionTitle)) profile.abilities.skills ||= value;
  }
  if (block.type === "list") {
    const value = block.items
      .map((item) => textFromHtml(item.html))
      .filter(Boolean)
      .join("\n");
    if (/证书|资质/i.test(sectionTitle))
      profile.abilities.certificates ||= value;
    else if (/语言/i.test(sectionTitle)) profile.abilities.languages ||= value;
    else if (/技能/i.test(sectionTitle)) profile.abilities.skills ||= value;
  }
}

export function mergeProfileMissing(
  current: ApplicationProfilePayload,
  imported: ApplicationProfilePayload,
): ApplicationProfilePayload {
  const result = structuredClone(current);
  mergeObjectMissing(result.personal, imported.personal);
  mergeObjectMissing(result.contact, imported.contact);
  mergeObjectMissing(result.identity, imported.identity);
  mergeObjectMissing(result.jobPreference, imported.jobPreference);
  mergeObjectMissing(result.abilities, imported.abilities);
  mergeObjectMissing(result.links, imported.links);
  mergeObjectMissing(result.emergencyContact, imported.emergencyContact);
  result.education = mergeRows(
    result.education,
    imported.education,
    (row) => `${row.school}|${row.startDate}`,
  );
  result.experiences = mergeRows(
    result.experiences,
    imported.experiences,
    (row) => `${row.company}|${row.position}|${row.startDate}`,
  );
  result.projects = mergeRows(
    result.projects,
    imported.projects,
    (row) => `${row.name}|${row.startDate}`,
  );
  result.campus = mergeRows(
    result.campus,
    imported.campus,
    (row) => `${row.organization}|${row.startDate}`,
  );
  return result;
}

function mergeObjectMissing<T extends Record<string, unknown>>(
  target: T,
  source: T,
): void {
  for (const key of Object.keys(source) as Array<keyof T>) {
    if ((target[key] === "" || target[key] == null) && source[key] != null)
      target[key] = source[key];
  }
}

function mergeRows<T extends Record<string, unknown>>(
  current: T[],
  incoming: T[],
  keyOf: (row: T) => string,
): T[] {
  const rows = structuredClone(current);
  for (const candidate of incoming) {
    const key = keyOf(candidate).toLowerCase().trim();
    const existing = rows.find(
      (row) => keyOf(row).toLowerCase().trim() === key,
    );
    if (existing) mergeObjectMissing(existing, candidate);
    else rows.push(structuredClone(candidate));
  }
  return rows;
}
