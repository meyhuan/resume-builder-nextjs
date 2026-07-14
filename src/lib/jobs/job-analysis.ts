import { Prisma } from "@prisma/client";
import { analyzeJdMatch } from "@/lib/seo/jd-match";
import { parseResumeFacts } from "@/lib/jobs/fact-extractor";
import {
  getJobEvidenceAnswers,
  mergeJobEvidence,
} from "@/lib/jobs/job-evidence";
import { prisma } from "@/lib/prisma";
import { JobNotFoundError } from "@/lib/jobs/job-service";

export class FactsNotConfirmedError extends Error {}

export async function analyzeJobWorkspace(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { factSet: true },
  });
  if (!job) throw new JobNotFoundError("Job not found");

  const facts = parseResumeFacts(job.factSet.facts);
  const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
    ? new Set(
        job.factSet.confirmedFactIds.filter(
          (value): value is string => typeof value === "string",
        ),
      )
    : new Set<string>();
  if (!job.factSet.confirmedAt || confirmedIds.size === 0) {
    throw new FactsNotConfirmedError("Facts must be confirmed before analysis");
  }

  const confirmedFacts = facts.filter((fact) => confirmedIds.has(fact.id));
  if (confirmedFacts.length === 0)
    throw new FactsNotConfirmedError("No confirmed facts are available");

  const evidenceAnswers = getJobEvidenceAnswers(job.matchSnapshot);
  const allEvidence = mergeJobEvidence(confirmedFacts, job.matchSnapshot);

  const result = analyzeJdMatch({
    jobDescription: job.jd,
    targetRole: job.role,
    resumeText: allEvidence
      .map((fact) => `${fact.sectionTitle}\n${fact.text}`)
      .join("\n\n"),
    evidenceItems: allEvidence.map((fact) => ({
      id: fact.id,
      text: fact.text,
    })),
  });
  const answerMap = new Map(
    evidenceAnswers.map((answer) => [answer.requirementId, answer]),
  );
  const evidenceSourceMap = new Map(
    allEvidence.map((fact) => [fact.id, fact.sourceFactId ?? fact.id]),
  );
  const requirements = result.requirements.map((rawRequirement) => {
    const requirement = {
      ...rawRequirement,
      matchedFactIds: [
        ...new Set(
          rawRequirement.matchedFactIds.map(
            (id) => evidenceSourceMap.get(id) ?? id,
          ),
        ),
      ],
    };
    const answer = answerMap.get(requirement.id);
    if (!answer || answer.answer !== "no" || requirement.status === "direct")
      return requirement;
    return {
      ...requirement,
      status: "blocked" as const,
      matchedFactIds: [],
      reason: "你已确认暂时没有这项经历，本岗位简历不会写入该能力。",
      question: undefined,
    };
  });
  const matchedKeywords = requirements
    .filter((item) => item.status === "direct")
    .map((item) => item.label);
  const transferableKeywords = requirements
    .filter((item) => item.status === "transferable")
    .map((item) => item.label);
  const missingKeywords = requirements
    .filter(
      (item) =>
        item.status === "needs_confirmation" || item.status === "blocked",
    )
    .map((item) => item.label);
  const score =
    requirements.length === 0
      ? 0
      : Math.round(
          (requirements.reduce(
            (total, item) =>
              total +
              (item.status === "direct"
                ? 1
                : item.status === "transferable"
                  ? 0.5
                  : 0),
            0,
          ) /
            requirements.length) *
            100,
        );
  const snapshot = {
    ...result,
    score,
    matchedKeywords,
    transferableKeywords,
    missingKeywords,
    requirements,
    evidenceAnswers,
    baselineScore:
      typeof job.matchSnapshot === "object" &&
      job.matchSnapshot &&
      !Array.isArray(job.matchSnapshot) &&
      typeof job.matchSnapshot.baselineScore === "number"
        ? job.matchSnapshot.baselineScore
        : score,
    currentScore: score,
    factSetRevision: job.factSet.revision,
    analyzedAt: new Date().toISOString(),
  };

  await prisma.job.update({
    where: { id: job.id },
    data: { matchSnapshot: snapshot as unknown as Prisma.InputJsonValue },
  });
  return snapshot;
}
