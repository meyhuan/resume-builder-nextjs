import { randomBytes } from 'crypto'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { sanitizeExportFileName } from '@/lib/export-file-name'

/**
 * In-process temporary store for generated PDF buffers.
 *
 * Each entry expires after TTL_MS. The token is a random hex string.
 * This is intentionally simple — no persistence, single-process only.
 * For multi-instance deployments swap with Redis or object storage.
 */

const TTL_MS = 5 * 60 * 1000
const STORE_DIR = join(tmpdir(), 'aijianli-pdf-temp')

interface PdfEntry {
  readonly buffer: Buffer
  readonly expiresAt: number
  readonly fileName: string
}

interface PdfMeta {
  readonly expiresAt: number
  readonly fileName: string
}

async function ensureStoreDir(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
}

function getPdfPath(token: string): string {
  return join(STORE_DIR, `${token}.pdf`)
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
      const meta = JSON.parse(metaRaw) as PdfMeta
      if (meta.expiresAt < now) {
        await safeUnlink(getMetaPath(token))
        await safeUnlink(getPdfPath(token))
        console.log('[pdf-temp-store] purged expired PDF', { token })
      }
    } catch {
      await safeUnlink(getMetaPath(token))
      await safeUnlink(getPdfPath(token))
    }
  }))
  const pdfFiles = files.filter((file) => file.endsWith('.pdf'))
  await Promise.all(pdfFiles.map(async (file): Promise<void> => {
    const token = file.replace(/\.pdf$/, '')
    const metaPath = getMetaPath(token)
    const metaExists = await stat(metaPath).then(() => true).catch(() => false)
    if (!metaExists) {
      await safeUnlink(getPdfPath(token))
    }
  }))
}

if (typeof setInterval !== 'undefined') {
  const timer = setInterval((): void => {
    void purgeExpired().catch((error: unknown): void => {
      console.error('[pdf-temp-store] purge failed', error)
    })
  }, 60_000)
  if ('unref' in timer) {
    timer.unref()
  }
}

/**
 * Save a PDF buffer and return a short-lived token.
 */
export async function savePdfTemp(buffer: Buffer, fileName: string): Promise<string> {
  await purgeExpired()
  const token = randomBytes(16).toString('hex')
  const meta: PdfMeta = { expiresAt: Date.now() + TTL_MS, fileName: sanitizeExportFileName(fileName) }
  await writeFile(getPdfPath(token), buffer)
  await writeFile(getMetaPath(token), JSON.stringify(meta), 'utf8')
  console.log('[pdf-temp-store] saved PDF temp file', { token, bytes: buffer.length, fileName })
  return token
}

/**
 * Retrieve and immediately delete a PDF entry by token.
 * Returns null if not found or expired.
 */
export async function consumePdfTemp(token: string): Promise<PdfEntry | null> {
  if (!isValidToken(token)) {
    console.warn('[pdf-temp-store] invalid token', { token })
    return null
  }
  await ensureStoreDir()
  const metaPath = getMetaPath(token)
  const pdfPath = getPdfPath(token)
  try {
    const metaRaw = await readFile(metaPath, 'utf8')
    const meta = JSON.parse(metaRaw) as PdfMeta
    if (meta.expiresAt < Date.now()) {
      await safeUnlink(metaPath)
      await safeUnlink(pdfPath)
      console.warn('[pdf-temp-store] PDF temp file expired', { token })
      return null
    }
    const buffer = await readFile(pdfPath)
    await safeUnlink(metaPath)
    await safeUnlink(pdfPath)
    console.log('[pdf-temp-store] consumed PDF temp file', { token, bytes: buffer.length, fileName: meta.fileName })
    return { buffer, expiresAt: meta.expiresAt, fileName: meta.fileName }
  } catch (error: unknown) {
    console.error('[pdf-temp-store] PDF temp file missing', { token, error: error instanceof Error ? error.message : String(error) })
    return null
  }
}
