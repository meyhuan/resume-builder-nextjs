export const MAX_EXPORT_FILE_NAME_LENGTH = 45

const INVALID_FILE_NAME_CHARS = /[\\/:*?"<>|]/g
const EXPORT_EXTENSION_SUFFIX = /\.(pdf|png|jpe?g)$/i

function cleanFileNameText(value: string | null | undefined): string {
  return (value ?? '')
    .trim()
    .replace(EXPORT_EXTENSION_SUFFIX, '')
    .replace(INVALID_FILE_NAME_CHARS, '_')
    .split('')
    .filter((char) => char.charCodeAt(0) >= 32)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncateFileName(value: string): string {
  return Array.from(value).slice(0, MAX_EXPORT_FILE_NAME_LENGTH).join('').trim()
}

export function sanitizeExportFileName(value: string | null | undefined, fallback = 'resume'): string {
  const cleaned = cleanFileNameText(value)
  const cleanedFallback = cleanFileNameText(fallback) || 'resume'
  return truncateFileName(cleaned || cleanedFallback) || cleanedFallback
}

export function joinExportFileNameParts(
  parts: readonly (string | null | undefined)[],
  options?: { readonly separator?: string; readonly fallback?: string },
): string {
  const separator = options?.separator ?? '_'
  const cleanedParts = parts.map(cleanFileNameText).filter(Boolean)
  return sanitizeExportFileName(cleanedParts.join(separator), options?.fallback ?? 'resume')
}

export function buildExportContentDisposition(
  disposition: 'attachment' | 'inline',
  fileName: string | null | undefined,
  extension: string,
): string {
  const safeBaseName = sanitizeExportFileName(fileName)
  const safeExtension = extension.replace(/^\./, '').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'pdf'
  const fullName = `${safeBaseName}.${safeExtension}`
  const asciiName = fullName.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '_')
  return `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fullName)}`
}
