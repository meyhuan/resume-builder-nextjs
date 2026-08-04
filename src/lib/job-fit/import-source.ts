import 'server-only'

import { Readable } from 'stream'
import DocmindApi, {
  GetDocParserResultRequest,
  QueryDocParserStatusRequest,
  SubmitDocParserJobAdvanceRequest,
} from '@alicloud/docmind-api20220711'
import OpenAI from 'openai'
import type { ResumeData } from '@/entities/resume/resume-data'
import { getDefaultModel, resolveApiKey } from '@/lib/ai/ai-runtime-config'
import { buildImportSystemPrompt, buildImportUserPrompt } from '@/lib/ai/import-prompt-builder'
import { toExternalResume } from '@/features/migration/java-resume-converter'
import { mapExternalResume } from '@/io/external-resume-importer'

const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx'])

export interface JobFitUploadedFile {
  readonly name: string
  readonly size: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export async function parseResumeText(rawText: string): Promise<ResumeData> {
  if (rawText.trim().length < 10) throw new Error('请至少粘贴 10 个字符的简历内容')
  const model = getDefaultModel()
  if (process.env.JOB_FIT_FAKE_AI === 'true') return createFallbackResume(rawText)
  const client = new OpenAI({ apiKey: resolveApiKey(model), baseURL: model.baseUrl })
  const response = await client.chat.completions.create({
    model: model.name,
    messages: [
      { role: 'system', content: buildImportSystemPrompt() },
      { role: 'user', content: buildImportUserPrompt(rawText.slice(0, 30_000)) },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
  })
  const content = (response.choices[0]?.message?.content ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const parsed = JSON.parse(content) as Record<string, unknown>
  if (typeof parsed.error === 'string') throw new Error(typeof parsed.message === 'string' ? parsed.message : '内容不像简历，请检查后重试')
  return mapExternalResume(toExternalResume(parsed))
}

export async function parseResumeFile(
  file: JobFitUploadedFile,
  onProgress: (progress: number, message: string) => Promise<void> | void,
): Promise<ResumeData> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error('仅支持 PDF、DOC、DOCX 文件')
  if (file.size <= 0) throw new Error('文件内容为空，请重新选择')
  if (file.size > MAX_FILE_SIZE) throw new Error('文件大小不能超过 8MB')
  if (process.env.JOB_FIT_FAKE_AI === 'true') {
    await onProgress(45, '正在读取本地测试文件')
    return parseResumeText(Buffer.from(await file.arrayBuffer()).toString('utf8'))
  }
  const accessKeyId = process.env.ALIYUN_DOCMIND_ACCESS_KEY_ID ?? ''
  const accessKeySecret = process.env.ALIYUN_DOCMIND_ACCESS_KEY_SECRET ?? ''
  if (!accessKeyId || !accessKeySecret) throw new Error('文档解析服务未配置，请联系管理员')
  const client = new DocmindApi({
    accessKeyId,
    accessKeySecret,
    endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
  } as never)
  await onProgress(10, '正在上传并识别文件')
  const submit = await client.submitDocParserJobAdvance(
    new SubmitDocParserJobAdvanceRequest({
      fileName: file.name,
      fileUrlObject: Readable.from(Buffer.from(await file.arrayBuffer())),
      outputFormat: ['markdown'],
    }),
    { connectTimeout: 60_000, readTimeout: 60_000 } as never,
  )
  const jobId = submit.body?.data?.id
  if (!jobId) throw new Error('文件解析任务提交失败')
  await onProgress(30, '正在提取简历内容')
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await client.queryDocParserStatus(new QueryDocParserStatusRequest({ id: jobId }))
    const value = String(status.body?.data?.status ?? '').toLowerCase()
    if (value === 'fail') throw new Error(status.body?.message || '文件解析失败')
    if (value === 'success') break
    if (attempt === 19) throw new Error('文件解析超时，请稍后重试')
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  const result = await client.getDocParserResult(new GetDocParserResultRequest({ id: jobId, layoutNum: 0, layoutStepSize: 500 }))
  const data = result.body?.data as { layouts?: Array<{ type?: string; text?: string; markdownContent?: string }> } | undefined
  const rawText = (data?.layouts ?? [])
    .filter((layout) => layout.type !== 'figure')
    .map((layout) => layout.markdownContent?.trim() || layout.text?.trim() || '')
    .filter(Boolean)
    .join('\n')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
  if (!rawText.trim()) throw new Error('未从文件中识别到简历内容')
  await onProgress(65, 'AI 正在整理简历结构')
  const resume = await parseResumeText(rawText)
  await onProgress(95, '基础简历已准备完成')
  return resume
}

function createFallbackResume(rawText: string): ResumeData {
  const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const name = lines[0]?.slice(0, 20) || '导入简历'
  return {
    id: `job-fit-import-${Date.now()}`,
    name,
    sections: [{
      id: 'section-imported-profile',
      title: '个人总结',
      columns: 1,
      blocks: [{ id: 'text-imported-profile', type: 'text', html: `<p>${escapeHtml(lines.slice(1).join(' ').slice(0, 3000))}</p>` }],
    }],
  }
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
