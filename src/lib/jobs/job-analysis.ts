import { Prisma } from '@prisma/client'
import { analyzeJdMatch } from '@/lib/seo/jd-match'
import { parseResumeFacts } from '@/lib/jobs/fact-extractor'
import { prisma } from '@/lib/prisma'
import { JobNotFoundError } from '@/lib/jobs/job-service'

export class FactsNotConfirmedError extends Error {}

export async function analyzeJobWorkspace(userId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, userId },
    include: { factSet: true },
  })
  if (!job) throw new JobNotFoundError('Job not found')

  const facts = parseResumeFacts(job.factSet.facts)
  const confirmedIds = Array.isArray(job.factSet.confirmedFactIds)
    ? new Set(job.factSet.confirmedFactIds.filter((value): value is string => typeof value === 'string'))
    : new Set<string>()
  if (!job.factSet.confirmedAt || confirmedIds.size === 0) {
    throw new FactsNotConfirmedError('Facts must be confirmed before analysis')
  }

  const confirmedFacts = facts.filter((fact) => confirmedIds.has(fact.id))
  if (confirmedFacts.length === 0) throw new FactsNotConfirmedError('No confirmed facts are available')

  const result = analyzeJdMatch({
    jobDescription: job.jd,
    targetRole: job.role,
    resumeText: confirmedFacts.map((fact) => `${fact.sectionTitle}\n${fact.text}`).join('\n\n'),
  })
  const snapshot = {
    ...result,
    baselineScore: result.score,
    currentScore: result.score,
    factSetRevision: job.factSet.revision,
    analyzedAt: new Date().toISOString(),
  }

  await prisma.job.update({
    where: { id: job.id },
    data: { matchSnapshot: snapshot as unknown as Prisma.InputJsonValue },
  })
  return snapshot
}

