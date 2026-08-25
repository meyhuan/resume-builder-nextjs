import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const EXTENSION_SCOPES = [
  "application-profile:read",
  "applications:read",
  "applications:write",
];

export function randomCredential(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashCredential(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isAllowedExtensionRedirect(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".chromiumapp.org"))
      return false;
    const extensionId = url.hostname.slice(0, -".chromiumapp.org".length);
    if (!/^[a-p]{32}$/.test(extensionId)) return false;
    const allowed = (process.env.EXTENSION_ALLOWED_IDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    return process.env.NODE_ENV !== "production"
      ? allowed.length === 0 || allowed.includes(extensionId)
      : allowed.includes(extensionId);
  } catch {
    return false;
  }
}

export async function requireExtensionUser(
  request: Request,
  requiredScope: string,
) {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : "";
  if (!token) throw new Error("EXTENSION_UNAUTHORIZED");
  const record = await prisma.extensionAuthorization.findUnique({
    where: { tokenHash: hashCredential(token) },
    select: {
      id: true,
      userId: true,
      scopes: true,
      expiresAt: true,
      revokedAt: true,
    },
  });
  if (
    !record ||
    record.revokedAt ||
    record.expiresAt <= new Date() ||
    !record.scopes.includes(requiredScope)
  ) {
    throw new Error("EXTENSION_UNAUTHORIZED");
  }
  void prisma.extensionAuthorization
    .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return record;
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  return (
    createHash("sha256").update(verifier, "utf8").digest("base64url") ===
    challenge
  );
}
