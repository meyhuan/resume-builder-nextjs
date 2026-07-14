import { Prisma } from "@prisma/client";
import type { JdRequirementMatch } from "@/lib/seo/jd-match";
import type { ResumeFact } from "@/lib/jobs/fact-extractor";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import { prisma } from "@/lib/prisma";

export type JobEvidenceAnswerValue = "yes" | "similar" | "no";

export interface JobEvidenceAnswer {
  readonly requirementId: string;
  readonly requirementLabel: string;
  readonly answer: JobEvidenceAnswerValue;
  readonly detail?: string;
  readonly sourceFactId?: string;
  readonly updatedAt: string;
}

export interface JobMatchSnapshotLike {
  readonly requirements?: readonly JdRequirementMatch[];
  readonly evidenceAnswers?: readonly JobEvidenceAnswer[];
  readonly [key: string]: unknown;
}

export function parseJobMatchSnapshot(
  value: Prisma.JsonValue | null,
): JobMatchSnapshotLike | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as unknown as JobMatchSnapshotLike;
}

export function parseEvidenceAnswers(value: unknown): JobEvidenceAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is JobEvidenceAnswer => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    const record = item as Record<string, unknown>;
    return (
      typeof record.requirementId === "string" &&
      typeof record.requirementLabel === "string" &&
      ["yes", "similar", "no"].includes(String(record.answer)) &&
      typeof record.updatedAt === "string" &&
      (record.detail === undefined || typeof record.detail === "string") &&
      (record.sourceFactId === undefined ||
        typeof record.sourceFactId === "string")
    );
  });
}

export function getJobEvidenceAnswers(
  snapshot: Prisma.JsonValue | null,
): JobEvidenceAnswer[] {
  return parseEvidenceAnswers(parseJobMatchSnapshot(snapshot)?.evidenceAnswers);
}

export function buildSupplementalFacts(
  answers: readonly JobEvidenceAnswer[],
  confirmedFacts: readonly ResumeFact[],
): ResumeFact[] {
  const factMap = new Map(confirmedFacts.map((fact) => [fact.id, fact]));
  return answers.flatMap((answer) => {
    if (answer.answer === "no" || !answer.detail || !answer.sourceFactId)
      return [];
    const source = factMap.get(answer.sourceFactId);
    if (!source) return [];
    return [
      {
        id: `job-evidence:${answer.requirementId}`,
        sectionId: source.sectionId,
        blockId: source.blockId,
        type: source.type,
        sectionTitle: source.sectionTitle,
        label: `${source.label} · 补充确认`,
        text: `${answer.requirementLabel}\n${answer.detail}`,
        origin: "job_supplement" as const,
        requirementId: answer.requirementId,
        sourceFactId: source.id,
      },
    ];
  });
}

export function mergeJobEvidence(
  confirmedFacts: readonly ResumeFact[],
  snapshot: Prisma.JsonValue | null,
): ResumeFact[] {
  return [
    ...confirmedFacts,
    ...buildSupplementalFacts(getJobEvidenceAnswers(snapshot), confirmedFacts),
  ];
}

export function upsertEvidenceAnswer(
  answers: readonly JobEvidenceAnswer[],
  next: JobEvidenceAnswer,
): JobEvidenceAnswer[] {
  return [
    ...answers.filter((item) => item.requirementId !== next.requirementId),
    next,
  ];
}

export class JobEvidenceNotFoundError extends Error {}
export class JobEvidenceInvalidError extends Error {}

export async function saveJobEvidenceAnswer(
  userId: string,
  jobId: string,
  input: {
    readonly requirementId: string;
    readonly answer: JobEvidenceAnswerValue;
    readonly detail?: string;
    readonly sourceFactId?: string;
  },
): Promise<JobEvidenceAnswer> {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { factSet: true },
  });
  if (!job) throw new JobEvidenceNotFoundError("Job not found");

  const snapshot = parseJobMatchSnapshot(job.matchSnapshot);
  const requirement = snapshot?.requirements?.find(
    (item) => item.id === input.requirementId,
  );
  if (!snapshot || !requirement)
    throw new JobEvidenceInvalidError("Requirement is unavailable");

  const confirmedIds = new Set(
    Array.isArray(job.factSet.confirmedFactIds)
      ? job.factSet.confirmedFactIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [],
  );
  const sourceFact = input.sourceFactId
    ? parseResumeFacts(job.factSet.facts).find(
        (fact) => fact.id === input.sourceFactId && confirmedIds.has(fact.id),
      )
    : undefined;
  const detail = input.detail?.trim();
  if (input.answer !== "no" && (!sourceFact || !detail || detail.length < 12)) {
    throw new JobEvidenceInvalidError(
      "Confirmed source and detailed evidence are required",
    );
  }

  const next: JobEvidenceAnswer = {
    requirementId: requirement.id,
    requirementLabel: requirement.label,
    answer: input.answer,
    detail: input.answer === "no" ? undefined : detail,
    sourceFactId: input.answer === "no" ? undefined : sourceFact?.id,
    updatedAt: new Date().toISOString(),
  };
  const evidenceAnswers = upsertEvidenceAnswer(
    getJobEvidenceAnswers(job.matchSnapshot),
    next,
  );
  await prisma.job.update({
    where: { id: job.id },
    data: {
      matchSnapshot: {
        ...snapshot,
        evidenceAnswers,
      } as unknown as Prisma.InputJsonValue,
      suggestionSet: Prisma.DbNull,
    },
  });
  return next;
}
