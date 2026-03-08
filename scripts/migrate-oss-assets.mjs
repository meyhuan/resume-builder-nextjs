import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import OSS from 'ali-oss'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const ENV_PATH = path.resolve(PROJECT_ROOT, '.env')
const prisma = new PrismaClient()

function parseEnvLine(line) {
  const trimmedLine = line.trim()
  if (!trimmedLine || trimmedLine.startsWith('#')) {
    return null
  }
  const separatorIndex = trimmedLine.indexOf('=')
  if (separatorIndex < 0) {
    return null
  }
  const key = trimmedLine.slice(0, separatorIndex).trim()
  let value = trimmedLine.slice(separatorIndex + 1).trim()
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }
  return { key, value }
}

async function loadEnvFile() {
  try {
    const envContent = await fs.readFile(ENV_PATH, 'utf8')
    const envLines = envContent.split(/\r?\n/)
    for (const line of envLines) {
      const parsedLine = parseEnvLine(line)
      if (!parsedLine) {
        continue
      }
      if (!process.env[parsedLine.key]) {
        process.env[parsedLine.key] = parsedLine.value
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return
    }
    throw error
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function normalizeOssEndpoint(endpoint, bucket) {
  const normalizedEndpoint = endpoint.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const bucketPrefix = `${bucket}.`
  if (normalizedEndpoint.startsWith(bucketPrefix)) {
    return normalizedEndpoint.slice(bucketPrefix.length)
  }
  return normalizedEndpoint
}

function buildPublicUrl(key) {
  const publicBaseUrl = process.env.ALIYUN_OSS_PUBLIC_BASE_URL
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`
  }
  const bucket = getRequiredEnv('ALIYUN_OSS_BUCKET')
  const region = getRequiredEnv('ALIYUN_OSS_REGION')
  return `https://${bucket}.${region}.aliyuncs.com/${key}`
}

function buildObjectKey(directory, extension) {
  const now = new Date()
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const normalizedExtension = extension.replace(/^\./, '').toLowerCase() || 'bin'
  return `${directory}/${year}/${month}/${crypto.randomUUID()}.${normalizedExtension}`
}

function parseDataUrl(value) {
  if (typeof value !== 'string') {
    return null
  }
  const match = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) {
    return null
  }
  const mimeType = match[1]
  const base64Payload = match[2]
  const extension = mimeType.split('/')[1] || 'bin'
  return {
    fileBuffer: Buffer.from(base64Payload, 'base64'),
    mimeType,
    extension,
  }
}

function createOssClient() {
  const bucket = getRequiredEnv('ALIYUN_OSS_BUCKET')
  const endpoint = normalizeOssEndpoint(getRequiredEnv('ALIYUN_OSS_ENDPOINT'), bucket)
  return new OSS({
    region: getRequiredEnv('ALIYUN_OSS_REGION'),
    bucket,
    endpoint,
    accessKeyId: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_ID'),
    accessKeySecret: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_SECRET'),
  })
}

async function uploadDataUrl(client, value, directory) {
  const parsedDataUrl = parseDataUrl(value)
  if (!parsedDataUrl) {
    return value
  }
  const key = buildObjectKey(directory, parsedDataUrl.extension)
  await client.put(key, parsedDataUrl.fileBuffer, {
    mime: parsedDataUrl.mimeType,
    headers: {
      'Content-Type': parsedDataUrl.mimeType,
    },
  })
  return buildPublicUrl(key)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null
}

async function migrateFeedbackAttachments(client) {
  const feedbacks = await prisma.feedback.findMany({
    where: {
      attachment: {
        startsWith: 'data:',
      },
    },
    select: {
      id: true,
      attachment: true,
    },
  })
  let migratedCount = 0
  for (const feedback of feedbacks) {
    if (!feedback.attachment) {
      continue
    }
    const uploadedUrl = await uploadDataUrl(client, feedback.attachment, 'feedback')
    if (uploadedUrl === feedback.attachment) {
      continue
    }
    await prisma.feedback.update({
      where: { id: feedback.id },
      data: { attachment: uploadedUrl },
    })
    migratedCount += 1
  }
  return migratedCount
}

async function migrateResumeAssets(client) {
  const resumes = await prisma.resume.findMany({
    select: {
      id: true,
      content: true,
      thumbnail: true,
    },
  })
  let migratedCount = 0
  for (const resume of resumes) {
    const contentValue = isRecord(resume.content) ? { ...resume.content } : null
    let nextContent = contentValue
    let didChange = false
    if (nextContent && isRecord(nextContent.baseInfo) && typeof nextContent.baseInfo.avatarUrl === 'string') {
      const avatarUrl = nextContent.baseInfo.avatarUrl
      const uploadedAvatarUrl = await uploadDataUrl(client, avatarUrl, 'avatar')
      if (uploadedAvatarUrl !== avatarUrl) {
        nextContent = {
          ...nextContent,
          baseInfo: {
            ...nextContent.baseInfo,
            avatarUrl: uploadedAvatarUrl,
          },
        }
        didChange = true
      }
    }
    const uploadedThumbnailUrl = await uploadDataUrl(client, resume.thumbnail, 'thumbnail')
    const nextThumbnail = uploadedThumbnailUrl === resume.thumbnail ? resume.thumbnail : uploadedThumbnailUrl
    if (nextThumbnail !== resume.thumbnail) {
      didChange = true
    }
    if (!didChange) {
      continue
    }
    await prisma.resume.update({
      where: { id: resume.id },
      data: {
        content: nextContent ?? resume.content,
        thumbnail: nextThumbnail,
      },
    })
    migratedCount += 1
  }
  return migratedCount
}

async function main() {
  await loadEnvFile()
  const client = createOssClient()
  const migratedFeedbackCount = await migrateFeedbackAttachments(client)
  const migratedResumeCount = await migrateResumeAssets(client)
  console.log(`Migrated feedback rows: ${migratedFeedbackCount}`)
  console.log(`Migrated resume rows: ${migratedResumeCount}`)
}

main()
  .catch((error) => {
    console.error('Asset migration failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
