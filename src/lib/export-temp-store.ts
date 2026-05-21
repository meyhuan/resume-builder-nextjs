import { randomBytes } from 'crypto'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export const EXPORT_TEMP_TTL_MS = 30 * 24 * 60 * 60 * 1000
const STORE_DIR = join(tmpdir(), 'aijianli-export-temp')

export type ExportAssetType = 'pdf' | 'image'

export interface ExportTempEntry {
  readonly buffer: Buffer
  readonly expiresAt: number
  readonly fileName: string
  readonly contentType: string
  readonly extension: string
  readonly type: ExportAssetType
  readonly confirmed: boolean
  readonly previewTokens?: readonly string[]
  readonly wxId?: string
  readonly userId?: string
  readonly resumeId?: string
  readonly resumeTitle?: string
  readonly templateId?: string
}

interface ExportTempMeta {
  readonly expiresAt: number
  readonly fileName: string
  readonly contentType: string
  readonly extension: string
  readonly type: ExportAssetType
  readonly confirmed: boolean
  readonly previewTokens?: readonly string[]
  readonly wxId?: string
  readonly userId?: string
  readonly resumeId?: string
  readonly resumeTitle?: string
  readonly templateId?: string
}

export interface SaveExportTempInput {
  readonly buffer: Buffer
  readonly fileName: string
  readonly contentType: string
  readonly extension: string
  readonly type: ExportAssetType
  readonly confirmed?: boolean
  readonly previewTokens?: readonly string[]
  readonly wxId?: string
  readonly userId?: string
  readonly resumeId?: string
  readonly resumeTitle?: string
  readonly templateId?: string
}

async function ensureStoreDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
}

function getFilePath(token: string, extension: string): string {
  return join(STORE_DIR, `${token}.${extension}`)
}

function getMetaPath(token: string): string {
  return join(STORE_DIR, `${token}.json`)
}

function isValidToken(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token)
}

async function safeUnlink(path: string): Promise<void> {
  await unlink(path).catch(() => undefined)
}

async function purgeExpired(): Promise<void> {
  const now = Date.now()
  await ensureStoreDir()
  const files = await readdir(STORE_DIR).catch(() => [])
  await Promise.all(files.filter((file) => file.endsWith('.json')).map(async (file): Promise<void> => {
    const token = file.replace(/\.json$/, '')
    try {
      const metaRaw = await readFile(getMetaPath(token), 'utf8')
      const meta = JSON.parse(metaRaw) as ExportTempMeta
      if (meta.expiresAt < now) {
        await safeUnlink(getMetaPath(token))
        await safeUnlink(getFilePath(token, meta.extension))
        console.log('[export-temp-store] purged expired asset', { token, type: meta.type })
      }
    } catch {
      await safeUnlink(getMetaPath(token))
    }
  }))
  await Promise.all(files.filter((file) => !file.endsWith('.json')).map(async (file): Promise<void> => {
    const token = file.replace(/\.[^.]+$/, '')
    const metaExists = await stat(getMetaPath(token)).then(() => true).catch(() => false)
    if (!metaExists) await safeUnlink(join(STORE_DIR, file))
  }))
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval((): void => {
    void purgeExpired().catch((error: unknown): void => {
      console.error('[export-temp-store] purge failed', error)
    })
  }, 60_000)
  if ('unref' in timer) timer.unref()
}

export async function saveExportTemp(input: SaveExportTempInput): Promise<{ token: string; expiresAt: number }> {
  await purgeExpired()
  const token = randomBytes(16).toString('hex')
  const expiresAt = Date.now() + EXPORT_TEMP_TTL_MS
  const meta: ExportTempMeta = {
    expiresAt,
    fileName: input.fileName,
    contentType: input.contentType,
    extension: input.extension,
    type: input.type,
    confirmed: input.confirmed === true,
    ...(input.previewTokens && input.previewTokens.length > 0 ? { previewTokens: input.previewTokens } : {}),
    ...(input.wxId ? { wxId: input.wxId } : {}),
    ...(input.userId ? { userId: input.userId } : {}),
    ...(input.resumeId ? { resumeId: input.resumeId } : {}),
    ...(input.resumeTitle ? { resumeTitle: input.resumeTitle } : {}),
    ...(input.templateId ? { templateId: input.templateId } : {}),
  }
  await writeFile(getFilePath(token, input.extension), input.buffer)
  await writeFile(getMetaPath(token), JSON.stringify(meta), 'utf8')
  console.log('[export-temp-store] saved asset', { token, type: input.type, confirmed: meta.confirmed, bytes: input.buffer.length, fileName: input.fileName })
  return { token, expiresAt }
}

/**
 * Flip the `confirmed` flag on an existing asset's metadata. Idempotent.
 * Returns the updated entry (without the buffer) or null if the asset does not
 * exist or has expired.
 */
export async function markConfirmed(token: string): Promise<ExportTempMeta | null> {
  if (!isValidToken(token)) {
    console.warn('[export-temp-store] markConfirmed invalid token', { token })
    return null
  }
  await ensureStoreDir()
  try {
    const metaRaw = await readFile(getMetaPath(token), 'utf8')
    const meta = JSON.parse(metaRaw) as ExportTempMeta
    if (meta.expiresAt < Date.now()) {
      console.warn('[export-temp-store] markConfirmed expired', { token })
      return null
    }
    if (meta.confirmed) {
      console.log('[export-temp-store] markConfirmed already confirmed', { token })
      return meta
    }
    const next: ExportTempMeta = { ...meta, confirmed: true }
    await writeFile(getMetaPath(token), JSON.stringify(next), 'utf8')
    console.log('[export-temp-store] markConfirmed flipped', { token })
    return next
  } catch (error: unknown) {
    console.error('[export-temp-store] markConfirmed failed', { token, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}

export async function readExportTemp(token: string): Promise<ExportTempEntry | null> {
  if (!isValidToken(token)) {
    console.warn('[export-temp-store] invalid token', { token })
    return null
  }
  await ensureStoreDir()
  try {
    const metaRaw = await readFile(getMetaPath(token), 'utf8')
    const meta = JSON.parse(metaRaw) as ExportTempMeta
    if (meta.expiresAt < Date.now()) {
      await safeUnlink(getMetaPath(token))
      await safeUnlink(getFilePath(token, meta.extension))
      console.warn('[export-temp-store] asset expired', { token, type: meta.type })
      return null
    }
    const buffer = await readFile(getFilePath(token, meta.extension))
    console.log('[export-temp-store] read asset', { token, type: meta.type, confirmed: meta.confirmed, bytes: buffer.length, fileName: meta.fileName })
    return { buffer, ...meta, confirmed: meta.confirmed === true, previewTokens: meta.previewTokens }
  } catch (error: unknown) {
    console.error('[export-temp-store] asset missing', { token, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
