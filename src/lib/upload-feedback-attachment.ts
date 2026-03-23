import { uploadAsset } from '@/lib/upload-asset'

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
  return uploadAsset({
    fileBuffer: input.fileBuffer,
    mimeType: input.mimeType,
    extension: input.extension,
    directory: 'feedback',
  })
}
