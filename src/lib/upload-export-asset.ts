import { uploadOssAsset } from '@/lib/upload-oss-asset'

interface UploadExportAssetInput {
  readonly token: string
  readonly buffer: Buffer
  readonly contentType: string
  readonly extension: string
}

interface UploadExportAssetResult {
  readonly key: string
  readonly url: string
}

export async function uploadExportAsset(input: UploadExportAssetInput): Promise<UploadExportAssetResult> {
  return uploadOssAsset({
    fileBuffer: input.buffer,
    mimeType: input.contentType,
    extension: input.extension,
    directory: 'exports',
    customFileName: input.token,
  })
}
