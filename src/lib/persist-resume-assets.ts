import { uploadOssAsset } from '@/lib/upload-oss-asset'
import sharp from 'sharp'

interface PersistResumeAssetsInput {
  readonly content: Record<string, unknown>
  readonly thumbnail?: string | null
  readonly customPrefix?: string // Used to generate deterministic file names
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

async function optimizeImage(buffer: Buffer, type: 'avatar' | 'thumbnail'): Promise<{ buffer: Buffer; mimeType: string; extension: string }> {
  try {
    let pipeline = sharp(buffer)
    
    if (type === 'avatar') {
      // Avatars don't need to be huge. Max 400x400
      pipeline = pipeline.resize(400, 400, { fit: 'inside', withoutEnlargement: true })
    } else if (type === 'thumbnail') {
      // Thumbnails for list view, max 800 width
      pipeline = pipeline.resize(800, null, { withoutEnlargement: true })
    }

    // Convert everything to optimized webp
    const optimizedBuffer = await pipeline.webp({ quality: 75, effort: 4 }).toBuffer()
    
    return {
      buffer: optimizedBuffer,
      mimeType: 'image/webp',
      extension: 'webp'
    }
  } catch (error) {
    console.error('Image optimization failed, falling back to original:', error)
    return { buffer, mimeType: 'image/jpeg', extension: 'jpg' } // Fallback types if we somehow don't have them
  }
}

async function persistAvatarUrl(content: Record<string, unknown>, customPrefix?: string): Promise<Record<string, unknown>> {
  const baseInfoValue: unknown = content.baseInfo
  if (!isRecord(baseInfoValue)) {
    return content
  }
  const avatarUrl: unknown = baseInfoValue.avatarUrl
  if (typeof avatarUrl !== 'string') {
    return content
  }
  
  // If it's already an OSS URL, don't re-upload
  if (avatarUrl.startsWith('http')) {
    return content
  }
  
  const parsedDataUrl: ParsedDataUrl | null = parseDataUrl(avatarUrl)
  if (!parsedDataUrl) {
    return content
  }
  
  const optimized = await optimizeImage(parsedDataUrl.fileBuffer, 'avatar')
  
  const uploadResult = await uploadOssAsset({
    fileBuffer: optimized.buffer,
    mimeType: optimized.mimeType,
    extension: optimized.extension,
    directory: 'avatar',
    customFileName: customPrefix ? `${customPrefix}_avatar` : undefined
  })
  return {
    ...content,
    baseInfo: {
      ...baseInfoValue,
      avatarUrl: uploadResult.url,
    },
  }
}

async function persistThumbnail(thumbnail: string | null | undefined, customPrefix?: string): Promise<string | null> {
  if (!thumbnail) {
    return null
  }
  
  // If it's already an OSS URL, don't re-upload
  if (thumbnail.startsWith('http')) {
    return thumbnail
  }
  
  const parsedDataUrl: ParsedDataUrl | null = parseDataUrl(thumbnail)
  if (!parsedDataUrl) {
    return thumbnail
  }
  
  const optimized = await optimizeImage(parsedDataUrl.fileBuffer, 'thumbnail')
  
  const uploadResult = await uploadOssAsset({
    fileBuffer: optimized.buffer,
    mimeType: optimized.mimeType,
    extension: optimized.extension,
    directory: 'thumbnail',
    customFileName: customPrefix ? `${customPrefix}_thumbnail` : undefined
  })
  return uploadResult.url
}

export async function persistResumeAssets(input: PersistResumeAssetsInput): Promise<PersistResumeAssetsResult> {
  const contentWithPersistedAvatar: Record<string, unknown> = await persistAvatarUrl(input.content, input.customPrefix)
  const persistedThumbnail: string | null = await persistThumbnail(input.thumbnail, input.customPrefix)
  return {
    content: contentWithPersistedAvatar,
    thumbnail: persistedThumbnail,
  }
}
