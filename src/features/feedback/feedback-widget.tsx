'use client'

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import { ImagePlus, MessageCircle, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { submitFeedback } from '@/app/dashboard/feedback/actions'
import { collectFeedbackDiagnostics } from './feedback-diagnostics'
import { getRequestLogs } from './request-log-store'

const MAX_CONTENT_CHARS = 500
const CONTACT_MAX_CHARS = 120
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export function FeedbackWidget(): ReactElement {
  const [isOpen, setIsOpen] = useState<boolean>(false)
  const [content, setContent] = useState<string>('')
  const [contact, setContact] = useState<string>('')
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canSubmit: boolean = Boolean(content.trim() && contact.trim()) && !isSubmitting

  const clearAttachment = (): void => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentFile(null)
    setAttachmentPreview(null)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('只支持上传图片')
      return
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error('图片大小不能超过 10MB')
      return
    }
    clearAttachment()
    setAttachmentFile(file)
    setAttachmentPreview(URL.createObjectURL(file))
    event.target.value = ''
  }

  const uploadAttachment = async (): Promise<string | undefined> => {
    if (!attachmentFile) return undefined
    const formData: FormData = new FormData()
    formData.append('file', attachmentFile)
    const response: Response = await fetch('/next-api/feedback/upload', {
      method: 'POST',
      body: formData,
    })
    const payload: { readonly url?: string; readonly error?: string } = await response.json()
    if (!response.ok || !payload.url) {
      throw new Error(payload.error || '上传图片失败，请稍后重试')
    }
    return payload.url
  }

  const handleSubmit = async (): Promise<void> => {
    const trimmedContent: string = content.trim()
    const trimmedContact: string = contact.trim()
    if (!trimmedContent) {
      toast.error('先随便说两句遇到的问题吧')
      return
    }
    if (!trimmedContact) {
      toast.error('请留下联系方式，方便我回复和定位问题')
      return
    }
    setIsSubmitting(true)
    try {
      const attachmentUrl: string | undefined = await uploadAttachment()
      const result = await submitFeedback({
        content: trimmedContent,
        contact: trimmedContact,
        attachment: attachmentUrl,
        diagnostics: collectFeedbackDiagnostics(),
        requestLogs: [...getRequestLogs()],
      })
      if (!result.success) {
        toast.error(result.error || '提交失败，请稍后重试')
        return
      }
      toast.success('收到啦，谢谢你愿意告诉我 🙏')
      setContent('')
      setContact('')
      clearAttachment()
      setIsOpen(false)
    } catch {
      toast.error('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={(): void => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 hidden items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition hover:-translate-y-0.5 hover:bg-slate-800 lg:inline-flex"
        aria-label="打开反馈"
      >
        <MessageCircle className="h-4 w-4" />
        反馈
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 hidden items-end justify-end bg-slate-950/20 p-6 backdrop-blur-[1px] lg:flex">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-900">哪里不顺手？</h2>
                <p className="text-sm leading-6 text-slate-500">
                  遇到 bug、看不懂、不会用、加载慢，或者只是有个建议，都可以告诉我。
                </p>
              </div>
              <button
                type="button"
                onClick={(): void => setIsOpen(false)}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭反馈"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">反馈内容 <span className="text-rose-500">*</span></span>
                  <span className="text-xs text-slate-400">{content.length}/{MAX_CONTENT_CHARS}</span>
                </div>
                <textarea
                  value={content}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>): void => setContent(event.target.value.slice(0, MAX_CONTENT_CHARS))}
                  className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  placeholder="例如：导出 PDF 没反应 / 登录后又弹登录 / 这个按钮没看懂 / 希望支持 Word 导出..."
                />
              </div>
              <div className="space-y-2">
                <span className="text-sm font-medium text-slate-700">联系方式 <span className="text-rose-500">*</span></span>
                <input
                  type="text"
                  value={contact}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void => setContact(event.target.value.slice(0, CONTACT_MAX_CHARS))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                  placeholder="微信 / 邮箱 / 手机号"
                />
                <p className="text-xs leading-5 text-slate-500">请留下微信、邮箱或手机号，方便我回复和定位问题。</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={(): void => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                  >
                    <ImagePlus className="h-4 w-4" />
                    上传图片
                  </button>
                  <span className="text-xs text-slate-400">支持 PNG / JPG / WEBP / GIF，10MB 内</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {attachmentPreview ? (
                  <div className="relative w-28 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <img src={attachmentPreview} alt="反馈图片预览" className="h-24 w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearAttachment}
                      className="absolute right-1 top-1 rounded-full bg-slate-900/70 p-1 text-white transition hover:bg-slate-900"
                      aria-label="移除图片"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="h-11 w-full rounded-2xl bg-violet-600 text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? '发送中...' : '发给我'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
