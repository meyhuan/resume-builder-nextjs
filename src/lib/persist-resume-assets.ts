import { uploadOssAsset } from '@/lib/upload-oss-asset'

interface PersistResumeAssetsInput {
  readonly content: Record<string, unknown>
  readonly thumbnail?: string | null
}

interface PersistResumeAssetsResult {
  readonly content: Record<string, unknown>
  readonly thumbnail: string | null
}

interface ParsedDataUrl {
  readonly fileBuffer: Buffer
  readonly mimeType: string
  readonly extension: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDataUrl(value: string): ParsedDataUrl | null {
  const match: RegExpMatchArray | null = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return null
  }
  const mimeType: string = match[1]
  const base64Payload: string = match[2]
  const extension: string = mimeType.split('/')[1] || 'bin'
  return {
    fileBuffer: Buffer.from(base64Payload, 'base64'),
    mimeType,
    extension,
  }
}

async function persistAvatarUrl(content: Record<string, unknown>): Promise<Record<string, unknown>> {
  const baseInfoValue: unknown = content.baseInfo
  if (!isRecord(baseInfoValue)) {
    return content
  }
  const avatarUrl: unknown = baseInfoValue.avatarUrl
  if (typeof avatarUrl !== 'string') {
    return content
  }
  const parsedDataUrl: ParsedDataUrl | null = parseDataUrl(avatarUrl)
  if (!parsedDataUrl) {
    return content
  }
  const uploadResult = await uploadOssAsset({
    fileBuffer: parsedDataUrl.fileBuffer,
    mimeType: parsedDataUrl.mimeType,
    extension: parsedDataUrl.extension,
    directory: 'avatar',
  })
  return {
    ...content,
    baseInfo: {
      ...baseInfoValue,
      avatarUrl: uploadResult.url,
    },
  }
}

async function persistThumbnail(thumbnail: string | null | undefined): Promise<string | null> {
  if (!thumbnail) {
    return null
  }
  const parsedDataUrl: ParsedDataUrl | null = parseDataUrl(thumbnail)
  if (!parsedDataUrl) {
    return thumbnail
  }
  const uploadResult = await uploadOssAsset({
    fileBuffer: parsedDataUrl.fileBuffer,
    mimeType: parsedDataUrl.mimeType,
    extension: parsedDataUrl.extension,
    directory: 'thumbnail',
  })
  return uploadResult.url
}

export async function persistResumeAssets(input: PersistResumeAssetsInput): Promise<PersistResumeAssetsResult> {
  const contentWithPersistedAvatar: Record<string, unknown> = await persistAvatarUrl(input.content)
  const persistedThumbnail: string | null = await persistThumbnail(input.thumbnail)
  return {
    content: contentWithPersistedAvatar,
    thumbnail: persistedThumbnail,
  }
}
