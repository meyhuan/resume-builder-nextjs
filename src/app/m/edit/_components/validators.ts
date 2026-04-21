import { htmlToPlainText } from '@/features/edit/form-fields/html-text'
import type { ValidationResult } from './module-edit-shell'

/**
 * Shared validation helpers for mobile module edit pages.
 * Returns a {@link ValidationResult} with a user-facing `message` suitable
 * for display in a toast when required fields are missing.
 */

const PHONE_REGEX: RegExp = /^1[3-9]\d{9}$/
const EMAIL_REGEX: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Returns true when the string is non-empty (after trim). */
export function hasText(v: string | undefined | null): boolean {
  return typeof v === 'string' && v.trim().length > 0
}

/** Returns true when the rich-text html has any non-whitespace plain content. */
export function hasRichContent(html: string | undefined | null): boolean {
  if (!html) return false
  return htmlToPlainText(html).trim().length > 0
}

/** Builds a missing-field message like "请填写姓名、手机号". */
export function buildMissingMessage(fields: readonly string[]): string {
  const names: string = fields.join('、')
  return `请填写${names}`
}

/** Validates a list of required text fields, returning the first missing one. */
export function validateRequired(
  checks: ReadonlyArray<{ label: string; value: string | number | undefined | null }>,
): ValidationResult {
  const missing: string[] = []
  for (const c of checks) {
    const v = c.value
    if (v == null || (typeof v === 'string' && v.trim().length === 0)) {
      missing.push(c.label)
    }
  }
  if (missing.length > 0) {
    return { ok: false, message: buildMissingMessage(missing) }
  }
  return { ok: true }
}

/** Phone format validator (CN mobile). */
export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone) return { ok: true }
  if (!PHONE_REGEX.test(phone.trim())) {
    return { ok: false, message: '手机号格式不正确，请输入 11 位数字' }
  }
  return { ok: true }
}

/** Email format validator. */
export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email) return { ok: true }
  if (!EMAIL_REGEX.test(email.trim())) {
    return { ok: false, message: '邮箱格式不正确' }
  }
  return { ok: true }
}

/** Runs an ordered list of validators, returning the first failure or ok. */
export function chain(...results: readonly ValidationResult[]): ValidationResult {
  for (const r of results) {
    if (!r.ok) return r
  }
  return { ok: true }
}
