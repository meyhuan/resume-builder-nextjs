import { NextResponse } from 'next/server'
import { uploadFeedbackAttachment } from '@/lib/upload-feedback-attachment'

const MAX_FILE_SIZE_BYTES: number = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES: readonly string[] = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

function getFileExtension(fileName: string, mimeType: string): string {
  const extensionFromName: string = fileName.includes('.') ? fileName.split('.').pop() ?? '' : ''
  if (extensionFromName) {
    return extensionFromName
  }
  if (mimeType === 'image/png') {
    return 'png'
  }
  if (mimeType === 'image/jpeg') {
    return 'jpg'
  }
  if (mimeType === 'image/webp') {
    return 'webp'
  }
  if (mimeType === 'image/gif') {
    return 'gif'
  }
  return 'bin'
}

export async function POST(request: Request): Promise<Response> {
  try {
    const formData: FormData = await request.formData()
    const fileEntry: FormDataEntryValue | null = formData.get('file')
    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: '未检测到上传文件' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.includes(fileEntry.type)) {
      return NextResponse.json({ error: '仅支持 PNG、JPG、WEBP、GIF 图片' }, { status: 400 })
    }
    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: '附件大小不能超过 10MB' }, { status: 400 })
    }
    const arrayBuffer: ArrayBuffer = await fileEntry.arrayBuffer()
    const uploadResult = await uploadFeedbackAttachment({
      fileBuffer: Buffer.from(arrayBuffer),
      mimeType: fileEntry.type,
      extension: getFileExtension(fileEntry.name, fileEntry.type),
    })
    return NextResponse.json({ url: uploadResult.url })
  } catch (error) {
    console.error('Failed to upload feedback attachment:', error)
    return NextResponse.json({ error: '上传附件失败，请稍后重试' }, { status: 500 })
  }
}
