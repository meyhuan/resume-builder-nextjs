'use client'

import { useState, useCallback, useRef, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, FileText, Loader2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { useImportGeneration } from '@/lib/ai/use-import-generation'
import { mapExternalResume } from '@/io/external-resume-importer'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { cn } from '@/lib/utils'

type ImportMode = 'text' | 'file'
type ImportStep = 'input' | 'processing' | 'done'

const MIN_TEXT_LENGTH = 10
const MAX_FILE_SIZE_MB = 8
const ALLOWED_EXT = ['doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'gif']

/**
 * Mobile import page: paste text or upload a file, AI parses into resume,
 * then saves and navigates to the edit home.
 */
export default function MobileImportPage(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setFromServer = useDraftStore((s) => s.setFromServer)
  const initialMode: ImportMode = searchParams.get('mode') === 'file' ? 'file' : 'text'
  const [mode, setMode] = useState<ImportMode>(initialMode)
  const [step, setStep] = useState<ImportStep>('input')
  const [rawText, setRawText] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isFileImporting, setIsFileImporting] = useState<boolean>(false)
  const [fileProgress, setFileProgress] = useState<number>(0)
  const [fileStage, setFileStage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    streamedText, error, isNotResume,
    generate, abort, reset,
  } = useImportGeneration()

  const saveAndNavigate = useCallback(async (resumeData: ResumeData): Promise<void> => {
    try {
      const res = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: resumeData.name || '导入的简历', content: resumeData, template: 'simple' }),
      })
      if (!res.ok) throw new Error('保存失败')
      const saved: { id: string } = await res.json()
      setFromServer(saved.id, resumeData, 'simple')
      router.replace(`/m/edit?id=${saved.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '保存失败，请重试')
    }
  }, [router, setFromServer])

  // --- Text import ---
  const handleTextImport = useCallback(async (): Promise<void> => {
    if (rawText.trim().length < MIN_TEXT_LENGTH) {
      toast.error(`请至少输入 ${MIN_TEXT_LENGTH} 个字`)
      return
    }
    setStep('processing')
    const result = await generate(rawText)
    if (result) {
      const resumeData = mapExternalResume(result)
      setStep('done')
      await saveAndNavigate(resumeData)
    } else {
      setStep('input')
    }
  }, [rawText, generate, saveAndNavigate])

  // --- File import ---
  const handleFileSelect = useCallback((file: File): void => {
    setFileError(null)
    const ext: string = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!ALLOWED_EXT.includes(ext)) {
      setFileError('不支持的格式，请上传 Word、PDF 或图片')
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`文件不能超过 ${MAX_FILE_SIZE_MB}MB`)
      return
    }
    setSelectedFile(file)
  }, [])

  const handleFileImport = useCallback(async (): Promise<void> => {
    if (!selectedFile) return
    setIsFileImporting(true)
    setFileError(null)
    setFileProgress(0)
    setFileStage('')
    setStep('processing')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      const res = await fetch('/next-api/ai/import-resume-file', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok || !res.body) {
        setFileError('解析失败，请稍后重试')
        setStep('input')
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const dataLine = line.split('\n').find((l) => l.startsWith('data: '))
          if (!dataLine) continue
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const event = JSON.parse(dataLine.slice(6)) as Record<string, any>
            if (event.type === 'stage') {
              setFileStage(event.label as string)
              setFileProgress(event.progress as number)
            } else if (event.type === 'done') {
              setFileProgress(100)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const externalResume = event.resumeData as any
              const resumeData = mapExternalResume(externalResume)
              const parsedName: string = externalResume?.base_info?.name ?? ''
              if (parsedName) resumeData.name = parsedName
              setStep('done')
              await saveAndNavigate(resumeData)
              return
            } else if (event.type === 'error') {
              setFileError(event.error as string)
              setStep('input')
              return
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err: unknown) {
      setFileError(err instanceof Error ? err.message : '解析失败')
      setStep('input')
    } finally {
      setIsFileImporting(false)
    }
  }, [selectedFile, saveAndNavigate])

  const handleBack = (): void => {
    if (step === 'processing') {
      abort()
      reset()
    }
    if (step !== 'input') {
      setStep('input')
      return
    }
    router.back()
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          onClick={handleBack}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">
          {mode === 'file' ? '导入简历' : '文本转简历'}
        </div>
        <div className="w-9" />
      </div>

      {/* Body */}
      <div className="flex-1 px-5 py-6">
        {step === 'input' && (
          <div className="flex flex-col gap-5">
            {/* Mode switch */}
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(['text', 'file'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={(): void => { setMode(m); setFileError(null) }}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium rounded-lg transition-all',
                    mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
                  )}
                >
                  {m === 'text' ? '粘贴文本' : '上传文件'}
                </button>
              ))}
            </div>

            {mode === 'text' ? (
              <>
                <textarea
                  value={rawText}
                  onChange={(e): void => setRawText(e.target.value)}
                  placeholder="粘贴你的简历内容到这里…&#10;&#10;支持从招聘网站、AI 工具导出的文本"
                  className="w-full h-48 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none resize-none"
                />
                <button
                  type="button"
                  onClick={handleTextImport}
                  disabled={rawText.trim().length < MIN_TEXT_LENGTH}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none"
                >
                  AI 解析导入
                </button>
              </>
            ) : (
              <>
                {/* File upload area */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx,.pdf,.jpg,.jpeg,.png,.bmp,.gif"
                  className="hidden"
                  onChange={(e): void => {
                    const f = e.target.files?.[0]
                    if (f) handleFileSelect(f)
                  }}
                />
                <button
                  type="button"
                  onClick={(): void => fileInputRef.current?.click()}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-white py-10 flex flex-col items-center gap-3 text-slate-500 active:bg-slate-50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <Upload size={20} />
                  </div>
                  <div className="text-sm font-medium">点击选择文件</div>
                  <div className="text-xs text-slate-400">支持 Word、PDF、图片，最大 {MAX_FILE_SIZE_MB}MB</div>
                </button>

                {/* Selected file preview */}
                {selectedFile && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200">
                    <FileText size={18} className="text-violet-500 shrink-0" />
                    <span className="flex-1 min-w-0 text-sm text-slate-700 truncate">{selectedFile.name}</span>
                    <button
                      type="button"
                      onClick={(): void => setSelectedFile(null)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {fileError && (
                  <div className="text-sm text-rose-500 px-1">{fileError}</div>
                )}

                <button
                  type="button"
                  onClick={handleFileImport}
                  disabled={!selectedFile}
                  className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none"
                >
                  上传并解析
                </button>
              </>
            )}
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <Loader2 size={40} className="animate-spin text-violet-600" />
              {isFileImporting && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-violet-600">{fileProgress}%</span>
                </div>
              )}
            </div>
            <div className="text-sm font-medium text-slate-700">
              {isFileImporting ? (fileStage || '正在解析文件…') : 'AI 正在解析你的简历…'}
            </div>
            {isFileImporting && fileProgress > 0 && (
              <div className="w-48 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500 transition-all duration-300"
                  style={{ width: `${fileProgress}%` }}
                />
              </div>
            )}
            {!isFileImporting && streamedText && (
              <div className="w-full mt-4 rounded-xl bg-white border border-slate-200 p-4 max-h-40 overflow-y-auto">
                <div className="text-xs text-slate-400 mb-1.5">解析预览</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">{streamedText.slice(-200)}</div>
              </div>
            )}
            <button
              type="button"
              onClick={handleBack}
              className="mt-4 text-sm text-slate-500 hover:text-slate-700"
            >
              取消
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">✅</div>
            <div className="text-sm font-medium text-slate-700">解析完成，正在跳转…</div>
          </div>
        )}

        {/* Error display */}
        {error && step === 'input' && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-4">
            <div className="text-sm text-rose-600">{error}</div>
            {isNotResume && (
              <div className="mt-2 text-xs text-rose-400">请确认粘贴的内容是简历相关文本</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
