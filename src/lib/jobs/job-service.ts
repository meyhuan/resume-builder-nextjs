import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { ResumeData } from "@/entities/resume/resume-data";
import { normalizeResumeContent } from "@/entities/resume/normalize-resume-content";
import { prisma } from "@/lib/prisma";
import { assertCanCreateResumeForUserId } from "@/lib/resume-limits";
import type { CreateJobInput, UpdateJobInput } from "@/lib/jobs/job-contracts";
import { extractResumeFacts } from "@/lib/jobs/fact-extractor";

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function hashResumeContent(content: Prisma.JsonValue): string {
  const facts = extractResumeFacts(content);
  return createHash("sha256").update(stableJson(facts)).digest("hex");
}

function createTailoredResumeContent(
  content: Prisma.JsonValue,
  role: string,
  resumeId: string,
): Prisma.InputJsonValue {
  const normalized = normalizeResumeContent(
    content as unknown as Partial<ResumeData> & Record<string, unknown>,
    { fallbackId: resumeId },
  );

  return {
    ...normalized,
    jobIntention: {
      ...normalized.jobIntention,
      position: role,
    },
    jobIntentionVisible: true,
  } as unknown as Prisma.InputJsonValue;
}

export class JobNotFoundError extends Error {}
export class BaseResumeNotFoundError extends Error {}
export class SourceResumeMissingError extends Error {}

export async function createJobWorkspace(
  userId: string,
  input: CreateJobInput,
) {
  const baseResume = await prisma.resume.findFirst({
    where: { id: input.baseResumeId, userId, jobId: null },
  });
  if (!baseResume) throw new BaseResumeNotFoundError("Base resume not found");

  await assertCanCreateResumeForUserId(userId);

  return prisma.$transaction(async (tx) => {
    const facts = extractResumeFacts(baseResume.content, baseResume.id);
    const contentHash = hashResumeContent(baseResume.content);
    // Every Job owns an isolated confirmation set. sourceResumeId stays null so
    // the legacy unique constraint cannot make two target Jobs share choices.
    const factSet = await tx.resumeFactSet.create({
      data: {
        userId,
        sourceResumeId: null,
        sourceContentHash: contentHash,
        sourceResumeUpdatedAt: baseResume.updatedAt,
        facts: facts as unknown as Prisma.InputJsonValue,
        confirmedFactIds: [],
      },
    });

    const job = await tx.job.create({
      data: {
        userId,
        company: input.company,
        role: input.role,
        jd: input.jd,
        source: input.source,
        sourceUrl: input.sourceUrl,
        location: input.location,
        salaryRange: input.salaryRange,
        identity: input.identity,
        baseResumeId: baseResume.id,
        factSetId: factSet.id,
      },
    });

    const tailoredResume = await tx.resume.create({
      data: {
        userId,
        jobId: job.id,
        title: `${input.company ? `${input.company} · ` : ""}${input.role}`,
        content: createTailoredResumeContent(
          baseResume.content,
          input.role,
          `${baseResume.id}-job-${job.id}`,
        ),
        template: baseResume.template,
        thumbnail: baseResume.thumbnail,
        meta: {
          sourceResumeId: baseResume.id,
          jobId: job.id,
          createdForJobAt: new Date().toISOString(),
        },
      },
      select: { id: true },
    });

    return { jobId: job.id, tailoredResumeId: tailoredResume.id };
  });
}

export async function syncJobFacts(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { baseResume: true, factSet: true },
  });
  if (!job) throw new JobNotFoundError("Job not found");
  if (!job.baseResume)
    throw new SourceResumeMissingError("Source resume is missing");

  const factSet = await ensureIsolatedJobFactSet(userId, job.id, job.factSet);
  const nextHash = hashResumeContent(job.baseResume.content);
  if (nextHash === factSet.sourceContentHash) return factSet;

  const facts = extractResumeFacts(job.baseResume.content, job.baseResume.id);
  return prisma.resumeFactSet.update({
    where: { id: factSet.id },
    data: {
      revision: { increment: 1 },
      facts: facts as unknown as Prisma.InputJsonValue,
      confirmedFactIds: [],
      confirmedAt: null,
      sourceContentHash: nextHash,
      sourceResumeUpdatedAt: job.baseResume.updatedAt,
    },
  });
}

export async function confirmJobFacts(
  userId: string,
  jobId: string,
  confirmedFactIds: readonly string[],
  expectedContentHash: string,
) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { baseResume: true, factSet: true },
  });
  if (!job) throw new JobNotFoundError("Job not found");
  if (!job.baseResume)
    throw new SourceResumeMissingError("Source resume is missing");

  const factSet = await ensureIsolatedJobFactSet(userId, job.id, job.factSet);
  const currentHash = hashResumeContent(job.baseResume.content);
  if (
    currentHash !== expectedContentHash ||
    currentHash !== factSet.sourceContentHash
  ) {
    throw new FactsStaleError("Facts are stale");
  }
  const facts = extractResumeFacts(job.baseResume.content, job.baseResume.id);
  const validIds = new Set(facts.map((fact) => fact.id));
  const uniqueIds = [...new Set(confirmedFactIds)];
  if (uniqueIds.length === 0 || uniqueIds.some((id) => !validIds.has(id))) {
    throw new InvalidFactSelectionError("Invalid fact selection");
  }

  return prisma.resumeFactSet.update({
    where: { id: factSet.id },
    data: {
      confirmedFactIds: uniqueIds,
      confirmedAt: new Date(),
    },
  });
}

export class FactsStaleError extends Error {}
export class InvalidFactSelectionError extends Error {}

async function ensureIsolatedJobFactSet(
  userId: string,
  jobId: string,
  factSet: {
    readonly id: string;
    readonly schemaVersion: number;
    readonly revision: number;
    readonly facts: Prisma.JsonValue;
    readonly confirmedFactIds: Prisma.JsonValue;
    readonly sourceContentHash: string;
    readonly sourceResumeUpdatedAt: Date | null;
    readonly confirmedAt: Date | null;
  },
) {
  const linkedJobs = await prisma.job.count({
    where: { factSetId: factSet.id },
  });
  if (linkedJobs <= 1) return factSet;

  return prisma.$transaction(async (tx) => {
    const cloned = await tx.resumeFactSet.create({
      data: {
        userId,
        sourceResumeId: null,
        schemaVersion: factSet.schemaVersion,
        revision: factSet.revision,
        facts: factSet.facts as Prisma.InputJsonValue,
        confirmedFactIds: factSet.confirmedFactIds as Prisma.InputJsonValue,
        sourceContentHash: factSet.sourceContentHash,
        sourceResumeUpdatedAt: factSet.sourceResumeUpdatedAt,
        confirmedAt: factSet.confirmedAt,
      },
    });
    await tx.job.update({
      where: { id: jobId },
      data: { factSetId: cloned.id },
    });
    return cloned;
  });
}

export async function updateJobWorkspace(
  userId: string,
  jobId: string,
  input: UpdateJobInput,
) {
  const existing = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: {
      applications: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { status: true },
      },
    },
  });
  if (!existing) throw new JobNotFoundError("Job not found");

  const nextArchived = input.archived;
  const data: Prisma.JobUpdateInput = {
    company: input.company,
    role: input.role,
    jd: input.jd,
    source: input.source,
    sourceUrl: input.sourceUrl,
    location: input.location,
    salaryRange: input.salaryRange,
    identity: input.identity,
  };

  if (nextArchived === true) {
    data.status = "ARCHIVED";
    data.archivedAt = new Date();
  } else if (nextArchived === false && existing.status === "ARCHIVED") {
    data.status =
      existing.applications[0]?.status ??
      (existing.lastExportedAt ? "EXPORTED" : "PREPARING");
    data.archivedAt = null;
  }

  if (
    (input.role && input.role !== existing.role) ||
    (input.jd && input.jd !== existing.jd)
  ) {
    data.suggestionSet = Prisma.DbNull;
    data.matchSnapshot = Prisma.DbNull;
    if (existing.status !== "ARCHIVED") data.status = "PREPARING";
  }

  return prisma.job.update({ where: { id: jobId }, data });
}

export async function deleteJobWorkspace(
  userId: string,
  jobId: string,
): Promise<void> {
  const existing = await prisma.job.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });
  if (!existing) throw new JobNotFoundError("Job not found");
  await prisma.job.delete({ where: { id: jobId } });
}
