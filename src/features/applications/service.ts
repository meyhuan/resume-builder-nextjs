import { JobApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  applicationFingerprint,
  createApplicationSchema,
  updateApplicationSchema,
} from "./schema";

export async function listApplications(
  userId: string,
  status?: JobApplicationStatus,
) {
  return prisma.jobApplication.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { updatedAt: "desc" },
    include: {
      resume: { select: { id: true, title: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function createOrReuseApplication(userId: string, raw: unknown) {
  const input = createApplicationSchema.parse(raw);
  if (input.resumeId) {
    const owned = await prisma.resume.count({
      where: { id: input.resumeId, userId },
    });
    if (!owned) throw new Error("RESUME_NOT_FOUND");
  }
  const fingerprint = applicationFingerprint(input);
  const existing = await prisma.jobApplication.findUnique({
    where: { userId_fingerprint: { userId, fingerprint } },
    include: { events: { orderBy: { createdAt: "desc" } } },
  });
  if (existing) return { application: existing, reused: true };
  const application = await prisma.jobApplication.create({
    data: {
      userId,
      resumeId: input.resumeId,
      companyName: input.companyName,
      jobTitle: input.jobTitle,
      location: input.location || null,
      jobUrl: input.jobUrl || null,
      applicationUrl: input.applicationUrl || null,
      sourceDomain: input.sourceDomain || null,
      deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
      nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
      nextActionType: input.nextActionType || null,
      note: input.note || null,
      fingerprint,
      events: {
        create: { toStatus: JobApplicationStatus.DRAFT, note: "创建投递草稿" },
      },
    },
    include: { events: { orderBy: { createdAt: "desc" } } },
  });
  return { application, reused: false };
}

export async function updateApplication(
  userId: string,
  id: string,
  raw: unknown,
) {
  const input = updateApplicationSchema.parse(raw);
  const current = await prisma.jobApplication.findFirst({
    where: { id, userId },
  });
  if (!current) throw new Error("APPLICATION_NOT_FOUND");
  if (input.resumeId) {
    const owned = await prisma.resume.count({
      where: { id: input.resumeId, userId },
    });
    if (!owned) throw new Error("RESUME_NOT_FOUND");
  }
  const statusChanged = input.status && input.status !== current.status;
  return prisma.jobApplication.update({
    where: { id },
    data: {
      ...input,
      location: input.location === "" ? null : input.location,
      jobUrl: input.jobUrl === "" ? null : input.jobUrl,
      applicationUrl: input.applicationUrl === "" ? null : input.applicationUrl,
      sourceDomain: input.sourceDomain === "" ? null : input.sourceDomain,
      deadlineAt:
        input.deadlineAt === null
          ? null
          : input.deadlineAt
            ? new Date(input.deadlineAt)
            : undefined,
      nextActionAt:
        input.nextActionAt === null
          ? null
          : input.nextActionAt
            ? new Date(input.nextActionAt)
            : undefined,
      nextActionType:
        input.nextActionType === null ? null : input.nextActionType,
      note: input.note === "" ? null : input.note,
      appliedAt:
        input.status === "APPLIED" && !current.appliedAt
          ? new Date()
          : undefined,
      events: statusChanged
        ? {
            create: {
              fromStatus: current.status,
              toStatus: input.status,
              note: statusNote(input.status!),
            },
          }
        : undefined,
    },
    include: {
      events: { orderBy: { createdAt: "desc" } },
      resume: { select: { id: true, title: true } },
    },
  });
}

function statusNote(status: JobApplicationStatus): string {
  const labels: Record<JobApplicationStatus, string> = {
    DRAFT: "标记为待投递",
    APPLIED: "确认已投递",
    ASSESSMENT: "进入笔试阶段",
    INTERVIEW: "进入面试阶段",
    OFFER: "收到 Offer",
    REJECTED: "标记为未通过",
    WITHDRAWN: "标记为已放弃",
  };
  return labels[status];
}
