import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import {
  applicationProfilePayloadSchema,
  type ApplicationProfilePayload,
} from "./schema";

const ENVELOPE_VERSION = "v1";

function getEncryptionKey(): Buffer {
  const configured = process.env.APPLICATION_PROFILE_ENCRYPTION_KEY?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("APPLICATION_PROFILE_ENCRYPTION_KEY is required");
    }
    return createHash("sha256")
      .update("aijianli-local-application-profile")
      .digest();
  }
  return createHash("sha256").update(configured, "utf8").digest();
}

export function encryptApplicationProfile(
  payload: ApplicationProfilePayload,
): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plaintext = Buffer.from(
    JSON.stringify(applicationProfilePayloadSchema.parse(payload)),
    "utf8",
  );
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    ENVELOPE_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptApplicationProfile(
  envelope: string,
): ApplicationProfilePayload {
  const [version, ivRaw, tagRaw, encryptedRaw] = envelope.split(".");
  if (version !== ENVELOPE_VERSION || !ivRaw || !tagRaw || !encryptedRaw) {
    throw new Error("Invalid application profile envelope");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(ivRaw, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(encryptedRaw, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return applicationProfilePayloadSchema.parse(JSON.parse(plaintext));
}
