import { readFile } from 'fs/promises'
import { join } from 'path'
import nextPackage from 'next/package.json'

export interface ReleaseInfo {
  readonly service: string
  readonly releaseId: string
  readonly nextVersion: string
  readonly commit: string
  readonly shortCommit: string
  readonly createdAt: string | null
  readonly source: 'release-file' | 'environment' | 'fallback'
}

function parseReleaseMetadata(content: string): Record<string, string> {
  const metadata: Record<string, string> = {}

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    const value = trimmed.slice(separatorIndex + 1).trim()
    metadata[key] = value
  }

  return metadata
}

function toShortCommit(commit: string): string {
  return commit && commit !== 'unknown' ? commit.slice(0, 7) : 'unknown'
}

function getEnvironmentReleaseInfo(): ReleaseInfo {
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
  const releaseId =
    process.env.NEXT_PUBLIC_RELEASE_ID || (commit !== 'unknown' ? toShortCommit(commit) : 'local')
  const hasEnvironmentVersion = Boolean(process.env.NEXT_PUBLIC_RELEASE_ID || commit !== 'unknown')

  return {
    service: process.env.NEXT_PUBLIC_SERVICE_NAME || 'aijianli-nextjs',
    releaseId,
    nextVersion: nextPackage.version,
    commit,
    shortCommit: toShortCommit(commit),
    createdAt: process.env.NEXT_PUBLIC_RELEASE_CREATED_AT || null,
    source: hasEnvironmentVersion ? 'environment' : 'fallback',
  }
}

export async function getReleaseInfo(): Promise<ReleaseInfo> {
  try {
    const metadata = parseReleaseMetadata(await readFile(join(process.cwd(), 'RELEASE'), 'utf8'))
    const commit =
      metadata.commit || process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'

    return {
      service: metadata.service || process.env.NEXT_PUBLIC_SERVICE_NAME || 'aijianli-nextjs',
      releaseId: metadata.release_id || process.env.NEXT_PUBLIC_RELEASE_ID || toShortCommit(commit),
      nextVersion: nextPackage.version,
      commit,
      shortCommit: toShortCommit(commit),
      createdAt: metadata.created_at || process.env.NEXT_PUBLIC_RELEASE_CREATED_AT || null,
      source: 'release-file',
    }
  } catch {
    return getEnvironmentReleaseInfo()
  }
}
