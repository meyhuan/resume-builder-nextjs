import "server-only";

import { Prisma } from "@prisma/client";
import type { ResumeData } from "@/entities/resume/resume-data";
import { normalizeResumeContent } from "@/entities/resume/normalize-resume-content";
import { prisma } from "@/lib/prisma";
import { generateJobFit } from "./generator";
import { generateSharedJobFit } from "./shared-generator";
import { commitJobFitQuota, releaseJobFitQuota } from "./quota";
import { getJobFitEngineMode, getJobFitWorkerConcurrency, isJobFitWorkerEnabled } from "./flags";
import type { JobFitFocusArea, JobFitGenerationResult, JobFitOptimizationMode } from "./types";

const LEASE_MS = 120_000;
const HEARTBEAT_MS = 30_000;
const DRAFT_TTL_MS = 30 * 60_000;
const WORKER_POLL_MS = 10_000;
const TASK_TIMEOUT_MS = 5 * 60_000;
const WORKER_ERROR_LOG_INTERVAL_MS = 60_000;

const globalWorker = globalThis as unknown as {
  __jobFitWorkerStarted?: boolean;
  __jobFitWake?: Promise<void>;
  __jobFitLastErrorLogAt?: number;
};

export async function processJobFitTask(taskId: string): Promise<void> {
  if (!isJobFitWorkerEnabled()) return;
  const leaseToken = globalThis.crypto.randomUUID();
  const now = new Date();
  const existing = await prisma.jobFitTask.findUnique({
    where: { id: taskId },
    select: { status: true, startedAt: true },
  });
  if (!existing || !["QUEUED", "RUNNING"].includes(existing.status)) return;
  const claimed = await prisma.jobFitTask.updateMany({
    where: {
      id: taskId,
      OR: [
        { status: "QUEUED" },
        { status: "RUNNING", leaseExpiresAt: { lt: now } },
        { status: "RUNNING", leaseExpiresAt: null },
      ],
    },
    data: {
      status: "RUNNING",
      stage: "PREPARE",
      progress: 10,
      leaseToken,
      leaseExpiresAt: new Date(Date.now() + LEASE_MS),
      startedAt: existing.startedAt ?? now,
      errorCode: null,
      errorMessage: null,
      retryable: false,
    },
  });
  if (claimed.count === 0) return;

  const heartbeat = setInterval(() => {
    void prisma.jobFitTask
      .updateMany({
        where: { id: taskId, leaseToken, status: "RUNNING" },
        data: { leaseExpiresAt: new Date(Date.now() + LEASE_MS) },
      })
      .catch(logWorkerCycleError);
  }, HEARTBEAT_MS);

  try {
    const task = await prisma.jobFitTask.findUnique({
      where: { id: taskId },
      include: { sourceResume: true },
    });
    if (
      !task ||
      !task.sourceSnapshot ||
      !task.jobTitle ||
      !task.jobDescription
    ) {
      throw new JobFitWorkerError(
        "任务缺少完整的简历或岗位信息",
        "INVALID_TASK_INPUT",
        false,
      );
    }
    const sourceRecord = task.sourceResume;
    await assertNotCancelled(taskId, leaseToken);
    const sourceResume = normalizeResumeContent(
      task.sourceSnapshot as unknown as Partial<ResumeData>,
      { fallbackId: task.sourceResumeId ?? task.id },
    );

    await updateStage(taskId, leaseToken, "ANALYZE", 35);
    await assertNotCancelled(taskId, leaseToken);
    await updateStage(taskId, leaseToken, "OPTIMIZE", 68);
    const abortController = new AbortController();
    const result = await withTimeout(
      runGeneration({
        resume: sourceResume,
        jobTitle: task.jobTitle,
        companyName: task.companyName ?? undefined,
        jobDescription: task.jobDescription,
        focusAreas: parseFocusAreas(task.focusAreas),
        optimizationMode: task.optimizationMode as JobFitOptimizationMode,
        signal: abortController.signal,
      }),
      TASK_TIMEOUT_MS,
      abortController,
    );
    await assertNotCancelled(taskId, leaseToken);
    await updateStage(taskId, leaseToken, "EXPLAIN", 88);
    const title = `${sourceRecord?.title ?? sourceResume.name ?? "基础简历"}｜${task.companyName ? `${task.companyName}·` : ""}${task.jobTitle}`;

    await prisma.$transaction(async (tx) => {
      const current = await tx.jobFitTask.findUnique({
        where: { id: taskId },
        select: { cancelRequestedAt: true, leaseToken: true },
      });
      if (!current || current.leaseToken !== leaseToken)
        throw new JobFitWorkerError("任务租约已失效", "LEASE_LOST", true);
      if (current.cancelRequestedAt) throw new JobFitCancelledError();
      const tailored = await tx.resume.create({
        data: {
          title,
          content: result.optimizedResume as unknown as Prisma.InputJsonValue,
          template: sourceRecord?.template ?? "simple",
          thumbnail: sourceRecord?.thumbnail,
          meta: {
            ...jsonObject(sourceRecord?.meta),
            kind: "job_fit",
            jobFitTaskId: task.id,
            sourceResumeId: task.sourceResumeId,
            companyName: task.companyName,
            jobTitle: task.jobTitle,
          } as Prisma.InputJsonValue,
          kind: "JOB_FIT",
          sourceResumeId: task.sourceResumeId,
          userId: task.userId,
        },
      });
      await tx.jobFitTask.update({
        where: { id: taskId },
        data: {
          tailoredResumeId: tailored.id,
          optimizedSnapshot:
            result.optimizedResume as unknown as Prisma.InputJsonValue,
          scoring: result.scoring as unknown as Prisma.InputJsonValue,
          summary: result.summary as unknown as Prisma.InputJsonValue,
          changes: result.changes as unknown as Prisma.InputJsonValue,
          claims: (result.claims ?? []) as unknown as Prisma.InputJsonValue,
          readiness: result.readiness ?? "READY",
          resultSchemaVersion: result.resultSchemaVersion ?? "legacy-1",
          engineVersion: result.engineVersion ?? "legacy",
          promptVersion: result.promptVersion ?? task.promptVersion,
          scoringVersion: result.scoring.version,
          modelName: result.modelName,
          factGuardRejectCount: result.factGuardRejectCount,
          status: "COMPLETED",
          progress: 100,
          completedAt: new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
    });
    await commitJobFitQuota(taskId);
  } catch (error) {
    if (error instanceof JobFitCancelledError) {
      await prisma.jobFitTask.updateMany({
        where: { id: taskId, leaseToken },
        data: {
          status: "CANCELLED",
          cancelledAt: new Date(),
          progress: 0,
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      await releaseJobFitQuota(taskId);
    } else {
      const modelOutputInvalid =
        error instanceof Error && ["JobFitModelOutputError", "JobFitEngineError"].includes(error.name);
      await prisma.jobFitTask.updateMany({
        where: { id: taskId, leaseToken },
        data: {
          status: "FAILED",
          errorCode:
            error instanceof JobFitWorkerError
              ? error.code
              : modelOutputInvalid
                ? (error && typeof error === "object" && "code" in error ? String(error.code) : "MODEL_OUTPUT_INVALID")
                : "GENERATION_FAILED",
          errorMessage:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "岗位定制生成失败",
          retryable:
            error instanceof JobFitWorkerError ? error.retryable : true,
          failedAt: new Date(),
          leaseToken: null,
          leaseExpiresAt: null,
        },
      });
      await releaseJobFitQuota(taskId);
      console.error("[job-fit-worker] task failed", { taskId, error });
    }
  } finally {
    clearInterval(heartbeat);
  }
}

export function startJobFitWorkerLoop(): void {
  if (!isJobFitWorkerEnabled() || globalWorker.__jobFitWorkerStarted) return;
  globalWorker.__jobFitWorkerStarted = true;
  const tick = (): void => {
    void wakeJobFitWorker();
  };
  setTimeout(tick, 1_000);
  setInterval(tick, WORKER_POLL_MS);
}

export async function wakeJobFitWorker(): Promise<void> {
  if (!isJobFitWorkerEnabled()) return;
  if (globalWorker.__jobFitWake) return globalWorker.__jobFitWake;
  globalWorker.__jobFitWake = (async () => {
    try {
      await expireDrafts();
      const tasks = await prisma.jobFitTask.findMany({
        where: {
          OR: [
            { status: "QUEUED" },
            { status: "RUNNING", leaseExpiresAt: { lt: new Date() } },
          ],
        },
        orderBy: { createdAt: "asc" },
        take: getJobFitWorkerConcurrency(),
        select: { id: true },
      });
      await Promise.all(tasks.map((task) => processJobFitTask(task.id)));
      const pendingCommit = await prisma.jobFitTask.findFirst({
        where: { status: "COMPLETED", quotaState: "RESERVED" },
        select: { id: true },
      });
      if (pendingCommit) await commitJobFitQuota(pendingCommit.id);
    } catch (error) {
      logWorkerCycleError(error);
    } finally {
      globalWorker.__jobFitWake = undefined;
    }
  })();
  return globalWorker.__jobFitWake;
}

function logWorkerCycleError(error: unknown): void {
  const now = Date.now();
  if (
    now - (globalWorker.__jobFitLastErrorLogAt ?? 0) <
    WORKER_ERROR_LOG_INTERVAL_MS
  )
    return;
  globalWorker.__jobFitLastErrorLogAt = now;
  const details =
    error && typeof error === "object"
      ? {
          name: error instanceof Error ? error.name : "UnknownError",
          message:
            error instanceof Error
              ? error.message.split("\n").filter(Boolean).at(-1)?.slice(0, 300)
              : String(error).slice(0, 300),
          code: "code" in error ? String(error.code ?? "") : undefined,
        }
      : {
          name: "UnknownError",
          message: String(error).slice(0, 300),
          code: undefined,
        };
  console.error(
    "[job-fit-worker] worker cycle failed; retrying automatically",
    details,
  );
}

async function expireDrafts(): Promise<void> {
  const expired = await prisma.jobFitTask.findMany({
    where: {
      status: { in: ["DRAFT", "READY"] },
      updatedAt: { lt: new Date(Date.now() - DRAFT_TTL_MS) },
    },
    select: { id: true },
  });
  for (const task of expired) {
    await prisma.jobFitTask.updateMany({
      where: { id: task.id, status: { in: ["DRAFT", "READY"] } },
      data: { status: "EXPIRED" },
    });
    await releaseJobFitQuota(task.id);
  }
}

async function updateStage(
  taskId: string,
  leaseToken: string,
  stage: "ANALYZE" | "OPTIMIZE" | "EXPLAIN",
  progress: number,
): Promise<void> {
  const updated = await prisma.jobFitTask.updateMany({
    where: { id: taskId, leaseToken, status: "RUNNING" },
    data: { stage, progress },
  });
  if (updated.count === 0)
    throw new JobFitWorkerError("任务租约已失效", "LEASE_LOST", true);
}

async function assertNotCancelled(
  taskId: string,
  leaseToken: string,
): Promise<void> {
  const task = await prisma.jobFitTask.findFirst({
    where: { id: taskId, leaseToken },
    select: { cancelRequestedAt: true },
  });
  if (!task) throw new JobFitWorkerError("任务租约已失效", "LEASE_LOST", true);
  if (task.cancelRequestedAt) throw new JobFitCancelledError();
}

function parseFocusAreas(value: unknown): JobFitFocusArea[] {
  if (!Array.isArray(value)) return ["keywords", "achievements", "concise"];
  return value.filter((item): item is JobFitFocusArea =>
    ["keywords", "achievements", "concise", "structure"].includes(String(item)),
  );
}

function jsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

class JobFitCancelledError extends Error {}

class JobFitWorkerError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller?: AbortController,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_resolve, reject) => {
        timer = setTimeout(
          () => {
            controller?.abort();
            reject(
              new JobFitWorkerError(
                "岗位定制处理超时，请免费重试",
                "TASK_TIMEOUT",
                true,
              ),
            );
          },
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function runGeneration(input: {
  readonly resume: ResumeData;
  readonly jobTitle: string;
  readonly companyName?: string;
  readonly jobDescription: string;
  readonly focusAreas: readonly JobFitFocusArea[];
  readonly optimizationMode: JobFitOptimizationMode;
  readonly signal: AbortSignal;
}): Promise<JobFitGenerationResult> {
  const mode = getJobFitEngineMode();
  const legacy = () => generateJobFit({
    resume: input.resume,
    jobTitle: input.jobTitle,
    companyName: input.companyName,
    jobDescription: input.jobDescription,
    focusAreas: input.focusAreas,
  });
  const shared = () => generateSharedJobFit(input);
  if (mode === "legacy") return legacy();
  if (mode === "shared") return shared();

  const [legacyResult, sharedResult] = await Promise.allSettled([legacy(), shared()]);
  if (sharedResult.status === "fulfilled") {
    console.info("[job-fit-shadow] shared engine evaluated", {
      engineVersion: sharedResult.value.engineVersion,
      readiness: sharedResult.value.readiness,
      score: sharedResult.value.scoring.optimized,
      changeCount: sharedResult.value.changes.length,
      inferredCount: sharedResult.value.evidenceSummary?.inferred ?? 0,
      estimatedCount: sharedResult.value.evidenceSummary?.estimated ?? 0,
    });
  } else {
    console.warn("[job-fit-shadow] shared engine failed", {
      code: sharedResult.reason && typeof sharedResult.reason === "object" && "code" in sharedResult.reason
        ? String(sharedResult.reason.code)
        : "UNKNOWN",
    });
  }
  if (legacyResult.status === "fulfilled") return legacyResult.value;
  throw legacyResult.reason;
}
