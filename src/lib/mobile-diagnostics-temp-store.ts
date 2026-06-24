import { randomBytes } from 'crypto'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

const STORE_DIR = join(tmpdir(), 'aijianli-mobile-diagnostics')
const DIAGNOSTICS_TTL_MS = 24 * 60 * 60 * 1000

interface DiagnosticsTempMeta {
  readonly fileName: string
  readonly createdAt: number
  readonly expiresAt: number
}

export interface DiagnosticsTempEntry {
  readonly buffer: Buffer
  readonly fileName: string
  readonly expiresAt: number
}

export function sanitizeDiagnosticsFileName(value: string | null | undefined): string {
  const fallback: string = `aijianli-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  const trimmed: string = String(value || '').trim().replace(/[\\/:*?"<>|]/g, '_')
  if (!trimmed) return fallback
  const withExtension: string = /\.json$/i.test(trimmed) ? trimmed : `${trimmed}.json`
  return withExtension.slice(0, 96)
}

export async function saveDiagnosticsTemp(input: {
  readonly buffer: Buffer
  readonly fileName?: string
}): Promise<{ readonly token: string; readonly fileName: string; readonly expiresAt: number }> {
  await mkdir(STORE_DIR, { recursive: true })
  await purgeExpiredDiagnostics().catch((error: unknown): void => {
    console.error('[mobile-diagnostics-temp-store] purge failed', error)
  })

  const token: string = randomBytes(16).toString('hex')
  const now: number = Date.now()
  const fileName: string = sanitizeDiagnosticsFileName(input.fileName)
  const meta: DiagnosticsTempMeta = {
    fileName,
    createdAt: now,
    expiresAt: now + DIAGNOSTICS_TTL_MS,
  }

  await writeFile(getDataPath(token), input.buffer)
  await writeFile(getMetaPath(token), JSON.stringify(meta), 'utf8')
  console.log('[mobile-diagnostics-temp-store] saved diagnostics', {
    token,
    bytes: input.buffer.length,
    fileName,
  })

  return { token, fileName, expiresAt: meta.expiresAt }
}

export async function readDiagnosticsTemp(token: string): Promise<DiagnosticsTempEntry | null> {
  if (!isValidToken(token)) {
    console.warn('[mobile-diagnostics-temp-store] invalid token', { token })
    return null
  }

  try {
    const meta: DiagnosticsTempMeta = JSON.parse(await readFile(getMetaPath(token), 'utf8')) as DiagnosticsTempMeta
    if (!meta.expiresAt || Date.now() > meta.expiresAt) {
      console.warn('[mobile-diagnostics-temp-store] diagnostics expired', { token })
      await removeDiagnostics(token)
      return null
    }

    const buffer: Buffer = await readFile(getDataPath(token))
    return {
      buffer,
      fileName: sanitizeDiagnosticsFileName(meta.fileName),
      expiresAt: meta.expiresAt,
    }
  } catch (error: unknown) {
    console.error('[mobile-diagnostics-temp-store] diagnostics missing', {
      token,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

async function purgeExpiredDiagnostics(): Promise<void> {
  await mkdir(STORE_DIR, { recursive: true })
  const { readdir } = await import('fs/promises')
  const names: string[] = await readdir(STORE_DIR)
  const metaNames: string[] = names.filter((name: string): boolean => name.endsWith('.meta.json'))

  await Promise.all(metaNames.map(async (name: string): Promise<void> => {
    const token: string = name.replace(/\.meta\.json$/, '')
    try {
      const meta: DiagnosticsTempMeta = JSON.parse(await readFile(join(STORE_DIR, name), 'utf8')) as DiagnosticsTempMeta
      if (!meta.expiresAt || Date.now() > meta.expiresAt) {
        await removeDiagnostics(token)
      }
    } catch {
      await removeDiagnostics(token)
    }
  }))
}

async function removeDiagnostics(token: string): Promise<void> {
  await Promise.all([
    rm(getDataPath(token), { force: true }),
    rm(getMetaPath(token), { force: true }),
  ])
}

function isValidToken(token: string): boolean {
  return /^[a-f0-9]{32}$/.test(token)
}

function getDataPath(token: string): string {
  return join(STORE_DIR, `${token}.json`)
}

function getMetaPath(token: string): string {
  return join(STORE_DIR, `${token}.meta.json`)
}
