import { createClient } from '@supabase/supabase-js'

interface UploadAssetInput {
  readonly fileBuffer: Buffer
  readonly mimeType: string
  readonly extension: string
  readonly directory: string
  readonly customFileName?: string
}

interface UploadAssetResult {
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

export async function uploadAsset(input: UploadAssetInput): Promise<UploadAssetResult> {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  const bucketName = getRequiredEnv('SUPABASE_STORAGE_BUCKET')

  const supabase = createClient(supabaseUrl, supabaseKey)

  const key: string = buildObjectKey(input.directory, input.extension, input.customFileName)
  
  const { error } = await supabase
    .storage
    .from(bucketName)
    .upload(key, input.fileBuffer, {
      contentType: input.mimeType,
      upsert: true
    })

  if (error) {
    throw new Error(`Failed to upload to Supabase Storage: ${error.message}`)
  }

  const { data: publicUrlData } = supabase
    .storage
    .from(bucketName)
    .getPublicUrl(key)

  return {
    key,
    url: publicUrlData.publicUrl,
  }
}
