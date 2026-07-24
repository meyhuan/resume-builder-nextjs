import OSS from 'ali-oss'

interface UploadOssAssetInput {
  readonly fileBuffer: Buffer
  readonly mimeType: string
  readonly extension: string
  readonly directory: string
  readonly customFileName?: string
}

interface UploadOssAssetResult {
  readonly key: string
  readonly url: string
}

function createOssClient(): OSS {
  const bucket: string = getRequiredEnv('ALIYUN_OSS_BUCKET')
  const endpoint: string = normalizeOssEndpoint(getRequiredEnv('ALIYUN_OSS_ENDPOINT'), bucket)
  return new OSS({
    region: getRequiredEnv('ALIYUN_OSS_REGION'),
    bucket,
    endpoint,
    accessKeyId: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_ID'),
    accessKeySecret: getRequiredEnv('ALIYUN_OSS_ACCESS_KEY_SECRET'),
  })
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

function buildObjectKey(directory: string, extension: string, customFileName?: string): string {
  const normalizedExtension: string = extension.replace(/^\./, '').toLowerCase() || 'bin'
  
  if (customFileName) {
    return `${directory}/${customFileName}.${normalizedExtension}`
  }
  
  const now: Date = new Date()
  const year: string = String(now.getUTCFullYear())
  const month: string = String(now.getUTCMonth() + 1).padStart(2, '0')
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
  if (isE2eAssetMockEnabled()) {
    const key: string = buildObjectKey(input.directory, input.extension, input.customFileName)
    return {
      key,
      url: `data:${input.mimeType};base64,${input.fileBuffer.toString('base64')}`,
    }
  }
  const client: OSS = createOssClient()
  const key: string = buildObjectKey(input.directory, input.extension, input.customFileName)
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

export async function deleteOssAsset(objectKey: string): Promise<void> {
  if (isE2eAssetMockEnabled()) return
  await createOssClient().delete(objectKey)
}

function isE2eAssetMockEnabled(): boolean {
  return process.env.E2E_AUTH_ENABLED === 'true'
    && process.env.E2E_ASSET_UPLOAD_MOCK === 'true'
}
