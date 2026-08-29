import { createHash } from "node:crypto";
import { z } from "zod";
import { APPLICATION_ACTION_TYPES, APPLICATION_STATUSES } from "./status";

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const applicationActionTypeSchema = z.enum(APPLICATION_ACTION_TYPES);
const nullableDateTime = z.string().datetime().nullable().optional();

export const createApplicationSchema = z.object({
  companyName: z.string().trim().min(1).max(300),
  jobTitle: z.string().trim().min(1).max(300),
  location: z.string().trim().max(300).optional().default(""),
  jobUrl: z.string().trim().max(2_000).optional().default(""),
  applicationUrl: z.string().trim().max(2_000).optional().default(""),
  sourceDomain: z.string().trim().max(300).optional().default(""),
  resumeId: z.string().trim().max(100).nullable().optional().default(null),
  deadlineAt: nullableDateTime,
  nextActionAt: nullableDateTime,
  nextActionType: applicationActionTypeSchema.nullable().optional(),
  note: z.string().trim().max(10_000).optional().default(""),
});

export const updateApplicationSchema = z.object({
  companyName: z.string().trim().min(1).max(300).optional(),
  jobTitle: z.string().trim().min(1).max(300).optional(),
  location: z.string().trim().max(300).optional(),
  jobUrl: z.string().trim().max(2_000).optional(),
  applicationUrl: z.string().trim().max(2_000).optional(),
  sourceDomain: z.string().trim().max(300).optional(),
  resumeId: z.string().trim().max(100).nullable().optional(),
  deadlineAt: nullableDateTime,
  nextActionAt: nullableDateTime,
  nextActionType: applicationActionTypeSchema.nullable().optional(),
  note: z.string().trim().max(10_000).optional(),
  status: applicationStatusSchema.optional(),
});

export function canonicalizeUrl(raw: string): string {
  if (!raw) return "";
  try {
    const url = new URL(raw);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|spm|from|source|ref|tracking)/i.test(key))
        url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.trim().toLowerCase();
  }
}

export function applicationFingerprint(input: {
  companyName: string;
  jobTitle: string;
  applicationUrl?: string;
  jobUrl?: string;
}): string {
  const identity = [
    canonicalizeUrl(input.applicationUrl || input.jobUrl || ""),
    input.companyName.trim().toLowerCase(),
    input.jobTitle.trim().toLowerCase(),
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}
