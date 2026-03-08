import OSS from 'ali-oss'

interface UploadOssAssetInput {
  readonly fileBuffer: Buffer
  readonly mimeType: string
  readonly extension: string
  readonly directory: string
}

interface UploadOssAssetResult {
  readonly key: string
  readonly url: string
}

function getRequiredEnv(name: string): string {
  const value: string | undefined = process.env[name]
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function normalizeOssEndpoint(endpoint: string, bucket: string): string {
  const normalizedEndpoint: string = endpoint.trim().replace(/^https?:\/\//, '').replace(/\/$/, '')
  const bucketPrefix: string = `${bucket}.`
  if (normalizedEndpoint.startsWith(bucketPrefix)) {
    return normalizedEndpoint.slice(bucketPrefix.length)
  }
  return normalizedEndpoint
}

function buildObjectKey(directory: string, extension: string): string {
  const now: Date = new Date()
  const year: string = String(now.getUTCFullYear())
  const month: string = String(now.getUTCMonth() + 1).padStart(2, '0')
  const normalizedExtension: string = extension.replace(/^\./, '').toLowerCase() || 'bin'
  return `${directory}/${year}/${month}/${crypto.randomUUID()}.${normalizedExtension}`
}

function buildPublicUrl(key: string): string {
  const publicBaseUrl: string | undefined = process.env.ALIYUN_OSS_PUBLIC_BASE_URL
  if (publicBaseUrl) {
    return `${publicBaseUrl.replace(/\/$/, '')}/${key}`
  }
  const bucket: string = getRequiredEnv('ALIYUN_OSS_BUCKET')
  const region: string = getRequiredEnv('ALIYUN_OSS_REGION')
  return `https://${bucket}.${region}.aliyuncs.com/${key}`
}

export async function uploadOssAsset(input: UploadOssAssetInput): Promise<UploadOssAssetResult> {
  const bucket: string = getRequiredEnv('ALIYUN_OSS_BUCKET')
  const endpoint: string = normalizeOssEndpoint(getRequiredEnv('ALIYUN_OSS_ENDPOINT'), bucket)
  const client: OSS = new OSS({
    region: getRequiredEnv('ALIYUN_OSS_REGION'),
    bucket,
    endpoint,
    accessKeyId: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_ID'),
    accessKeySecret: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_SECRET'),
  })
  const key: string = buildObjectKey(input.directory, input.extension)
  await client.put(key, input.fileBuffer, {
    mime: input.mimeType,
    headers: {
      'Content-Type': input.mimeType,
    },
  })
  return {
    key,
    url: buildPublicUrl(key),
  }
}
