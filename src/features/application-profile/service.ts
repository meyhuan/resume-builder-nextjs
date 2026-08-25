import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ResumeData } from "@/entities/resume/resume-data";
import { normalizeResumeContent } from "@/entities/resume/normalize-resume-content";
import { decryptApplicationProfile, encryptApplicationProfile } from "./crypto";
import {
  applicationProfilePayloadSchema,
  createEmptyApplicationProfile,
  type ApplicationProfilePayload,
} from "./schema";
import { mergeProfileMissing, profileFromResume } from "./resume-sync";

export async function readApplicationProfile(userId: string) {
  const [record, resumes] = await Promise.all([
    prisma.applicationProfile.findUnique({ where: { userId } }),
    prisma.resume.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
    }),
  ]);
  return {
    profile: record
      ? decryptApplicationProfile(record.encryptedPayload)
      : createEmptyApplicationProfile(),
    defaultResumeId: record?.defaultResumeId || null,
    lastResumeSyncAt: record?.lastResumeSyncAt?.toISOString() || null,
    updatedAt: record?.updatedAt.toISOString() || null,
    resumes,
  };
}

export async function saveApplicationProfile(input: {
  userId: string;
  defaultResumeId: string | null;
  profile: ApplicationProfilePayload;
}) {
  const profile = applicationProfilePayloadSchema.parse(input.profile);
  await assertResumeOwnership(input.userId, input.defaultResumeId);
  const record = await prisma.applicationProfile.upsert({
    where: { userId: input.userId },
    create: {
      userId: input.userId,
      defaultResumeId: input.defaultResumeId,
      encryptedPayload: encryptApplicationProfile(profile),
      schemaVersion: profile.version,
    },
    update: {
      defaultResumeId: input.defaultResumeId,
      encryptedPayload: encryptApplicationProfile(profile),
      schemaVersion: profile.version,
    },
  });
  return { updatedAt: record.updatedAt.toISOString() };
}

export async function syncApplicationProfile(
  userId: string,
  requestedResumeId?: string | null,
) {
  const existing = await prisma.applicationProfile.findUnique({
    where: { userId },
  });
  const resumeId = requestedResumeId || existing?.defaultResumeId;
  if (!resumeId) throw new Error("DEFAULT_RESUME_REQUIRED");
  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, userId },
  });
  if (!resume) throw new Error("RESUME_NOT_FOUND");
  const normalized = normalizeResumeContent(
    resume.content as unknown as Partial<ResumeData> & Record<string, unknown>,
    { fallbackId: resume.id },
  );
  const imported = profileFromResume(normalized);
  const current = existing
    ? decryptApplicationProfile(existing.encryptedPayload)
    : createEmptyApplicationProfile();
  const merged = mergeProfileMissing(current, imported);
  const record = await prisma.applicationProfile.upsert({
    where: { userId },
    create: {
      userId,
      defaultResumeId: resumeId,
      encryptedPayload: encryptApplicationProfile(merged),
      schemaVersion: merged.version,
      lastResumeSyncAt: new Date(),
    },
    update: {
      defaultResumeId: resumeId,
      encryptedPayload: encryptApplicationProfile(merged),
      schemaVersion: merged.version,
      lastResumeSyncAt: new Date(),
    },
  });
  return {
    profile: merged,
    defaultResumeId: resumeId,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function getExtensionProfile(userId: string) {
  const record = await prisma.applicationProfile.findUnique({
    where: { userId },
  });
  if (!record) return null;
  return {
    profile: decryptApplicationProfile(record.encryptedPayload),
    defaultResumeId: record.defaultResumeId,
    updatedAt: record.updatedAt.toISOString(),
  };
}

async function assertResumeOwnership(
  userId: string,
  resumeId: string | null,
): Promise<void> {
  if (!resumeId) return;
  const count = await prisma.resume.count({ where: { id: resumeId, userId } });
  if (count !== 1) throw new Error("RESUME_NOT_FOUND");
}

export function toJsonProfile(
  profile: ApplicationProfilePayload,
): Prisma.InputJsonValue {
  return profile as unknown as Prisma.InputJsonValue;
}
