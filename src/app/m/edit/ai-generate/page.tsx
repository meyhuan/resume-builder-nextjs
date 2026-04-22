'use client'

import { useState, useCallback, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { UserIdentity, WizardInput } from '@/lib/ai/resume-prompt-builder'
import { mapExternalResume } from '@/io/external-resume-importer'
import type { ExternalResume } from '@/io/external-resume-types'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { cn } from '@/lib/utils'
import { getAvailableModels } from '@/lib/ai/ai-config'

const AI_MODELS = getAvailableModels()

type GenerateStep = 'form' | 'generating' | 'done'

const IDENTITY_OPTIONS: readonly { id: UserIdentity; label: string; emoji: string }[] = [
  { id: 'student', label: '在校生', emoji: '🎓' },
  { id: 'graduate', label: '应届生', emoji: '🧑‍💻' },
  { id: 'professional', label: '职场人', emoji: '💼' },
]

const WORK_YEARS_OPTIONS: readonly string[] = [
  '应届', '1年', '2年', '3年', '5年', '8年', '10年+',
]

/**
 * Extract valid JSON from AI output.
 */
function extractJson(raw: string): ExternalResume {
  let cleaned: string = raw.trim()
  const codeBlockMatch: RegExpMatchArray | null = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim()
  const firstBrace: number = cleaned.indexOf('{')
  const lastBrace: number = cleaned.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  return JSON.parse(cleaned) as ExternalResume
}

/**
 * Mobile AI generate page: collect user info, generate a full resume via AI,
 * save and navigate to edit home.
 */
export default function MobileAiGeneratePage(): ReactElement {
  const router = useRouter()
  const setFromServer = useDraftStore((s) => s.setFromServer)

  const [step, setStep] = useState<GenerateStep>('form')
  const [identity, setIdentity] = useState<UserIdentity>('professional')
  const [workYears, setWorkYears] = useState<string>('3年')
  const [targetRole, setTargetRole] = useState<string>('')
  const [major, setMajor] = useState<string>('')
  const [projects, setProjects] = useState<string>('')
  const [campusActivities, setCampusActivities] = useState<string>('')
  const [softSkills, setSoftSkills] = useState<string>('')
  const [certificates, setCertificates] = useState<string>('')
  const [additionalInfo, setAdditionalInfo] = useState<string>('')
  const [streamedText, setStreamedText] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const buildWizardInput = useCallback((): WizardInput => ({
    identity,
    workYears,
    targetRole,
    major,
    projects: projects ? projects.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [],
    campusActivities: campusActivities ? campusActivities.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [],
    softSkills: softSkills ? softSkills.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [],
    certificates: certificates ? certificates.split(/[,，、]/).map((s) => s.trim()).filter(Boolean) : [],
    additionalInfo,
  }), [identity, workYears, targetRole, major, projects, campusActivities, softSkills, certificates, additionalInfo])

  const saveAndNavigate = useCallback(async (resumeData: ResumeData): Promise<void> => {
    try {
      const res = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: resumeData.name || 'AI 生成简历', content: resumeData, template: 'simple' }),
      })
      if (!res.ok) throw new Error('保存失败')
      const saved: { id: string } = await res.json()
      setFromServer(saved.id, resumeData, 'simple')
      router.replace(`/m/edit?id=${saved.id}`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '保存失败')
    }
  }, [router, setFromServer])

  const handleGenerate = useCallback(async (): Promise<void> => {
    if (!targetRole.trim()) {
      toast.error('请填写意向岗位')
      return
    }
    const wizardData: WizardInput = buildWizardInput()
    setStep('generating')
    setStreamedText('')
    setError(null)
    try {
      const response: Response = await fetch('/next-api/ai/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ wizardData, model: AI_MODELS[0].name }),
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => null)
        throw new Error(errBody?.error ?? `请求失败 (${response.status})`)
      }
      const reader = response.body?.getReader()
      if (!reader) throw new Error('无法读取响应流')
      const decoder = new TextDecoder()
      let accumulated = ''
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines: string[] = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed: string = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const payload: string = trimmed.slice(6)
          if (payload === '[DONE]') continue
          try {
            const parsed: { content?: string; error?: string } = JSON.parse(payload)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.content) {
              accumulated += parsed.content
              setStreamedText(accumulated)
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== payload) throw parseErr
          }
        }
      }
      const externalResume = extractJson(accumulated)
      const resumeData = mapExternalResume(externalResume)
      const parsedName: string = (externalResume as unknown as Record<string, Record<string, string>>)?.base_info?.name ?? ''
      if (parsedName && parsedName !== '姓名') resumeData.name = parsedName
      setStep('done')
      await saveAndNavigate(resumeData)
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : '生成失败，请重试'
      setError(msg)
      setStep('form')
    }
  }, [targetRole, buildWizardInput, saveAndNavigate])

  const handleBack = (): void => {
    if (step === 'generating') return
    if (step === 'done') {
      router.replace('/m/edit')
      return
    }
    router.back()
  }

  const showWorkYears = identity === 'professional'
  const showCampus = identity === 'student'
  const canSubmit = targetRole.trim().length > 0

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          onClick={handleBack}
          disabled={step === 'generating'}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">AI 一键生成</div>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-5 py-6 pb-24">
        {step === 'form' && (
          <div className="flex flex-col gap-5">
            {/* Identity */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">你的身份</label>
              <div className="grid grid-cols-3 gap-2">
                {IDENTITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(): void => setIdentity(opt.id)}
                    className={cn(
                      'py-3 rounded-xl border text-center transition-all active:scale-95',
                      identity === opt.id
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    <div className="text-xl mb-1">{opt.emoji}</div>
                    <div className="text-xs font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Target role */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                意向岗位 <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={targetRole}
                onChange={(e): void => setTargetRole(e.target.value)}
                placeholder="如：前端工程师、产品经理"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
              />
            </div>

            {/* Work years (professional only) */}
            {showWorkYears && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">工作年限</label>
                <div className="flex flex-wrap gap-2">
                  {WORK_YEARS_OPTIONS.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={(): void => setWorkYears(yr)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                        workYears === yr
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-slate-200 bg-white text-slate-600',
                      )}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Major */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">专业</label>
              <input
                type="text"
                value={major}
                onChange={(e): void => setMajor(e.target.value)}
                placeholder="如：计算机科学与技术"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
              />
            </div>

            {/* Projects (graduate/professional) */}
            {!showCampus && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">项目经验关键词</label>
                <input
                  type="text"
                  value={projects}
                  onChange={(e): void => setProjects(e.target.value)}
                  placeholder="用逗号分隔，如：电商系统, 小程序开发"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
                />
              </div>
            )}

            {/* Campus activities (student only) */}
            {showCampus && (
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">校园活动</label>
                <input
                  type="text"
                  value={campusActivities}
                  onChange={(e): void => setCampusActivities(e.target.value)}
                  placeholder="用逗号分隔，如：学生会主席, 编程竞赛"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
                />
              </div>
            )}

            {/* Skills */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">技能特长</label>
              <input
                type="text"
                value={softSkills}
                onChange={(e): void => setSoftSkills(e.target.value)}
                placeholder="用逗号分隔，如：React, Python, 项目管理"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
              />
            </div>

            {/* Certificates */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">资格证书</label>
              <input
                type="text"
                value={certificates}
                onChange={(e): void => setCertificates(e.target.value)}
                placeholder="用逗号分隔，如：PMP, CPA, 六级"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none"
              />
            </div>

            {/* Additional info */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">补充说明</label>
              <textarea
                value={additionalInfo}
                onChange={(e): void => setAdditionalInfo(e.target.value)}
                placeholder="其他想告诉 AI 的信息…"
                rows={2}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600">{error}</div>
            )}

            {/* Submit */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/30 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <Sparkles size={16} />
              AI 生成简历
            </button>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <Loader2 size={40} className="animate-spin text-violet-600" />
            </div>
            <div className="text-sm font-medium text-slate-700">AI 正在为你生成简历…</div>
            <div className="text-xs text-slate-400">通常需要 10-30 秒</div>
            {streamedText && (
              <div className="w-full mt-4 rounded-xl bg-white border border-slate-200 p-4 max-h-40 overflow-y-auto">
                <div className="text-xs text-slate-400 mb-1.5">生成预览</div>
                <div className="text-sm text-slate-600 whitespace-pre-wrap">{streamedText.slice(-300)}</div>
              </div>
            )}
          </div>
        )}

        {step === 'done' && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="text-5xl">🎉</div>
            <div className="text-sm font-medium text-slate-700">简历生成完成，正在跳转…</div>
          </div>
        )}
      </div>
    </div>
  )
}
