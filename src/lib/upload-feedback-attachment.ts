import { uploadOssAsset } from '@/lib/upload-oss-asset'

interface UploadFeedbackAttachmentInput {
  readonly fileBuffer: Buffer
  readonly mimeType: string
  readonly extension: string
}

interface UploadFeedbackAttachmentResult {
  readonly key: string
  readonly url: string
}

export async function uploadFeedbackAttachment(input: UploadFeedbackAttachmentInput): Promise<UploadFeedbackAttachmentResult> {
  return uploadOssAsset({
    fileBuffer: input.fileBuffer,
    mimeType: input.mimeType,
    extension: input.extension,
    directory: 'feedback',
  })
}
