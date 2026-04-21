'use client'

import { useEffect, useMemo, useState, type ReactElement } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Menu } from 'lucide-react'
import { toast } from 'sonner'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { computeProgress } from '@/features/edit/progress/module-completeness'
import { MODULES, findModuleBySectionTitle } from '@/entities/module/module-config'
import { GreetingBanner } from './_components/greeting-banner'
import { ProgressCard } from './_components/progress-card'
import { QuickActions } from './_components/quick-actions'
import { MilestoneConfetti } from './_components/milestone-confetti'
import { HomeActionBar } from './_components/home-action-bar'
import { DeveloperNote } from './_components/developer-note'
import { BaseInfoPreview } from './_components/base-info-preview'
import { JobIntentionPreview } from './_components/job-intention-preview'
import { SectionsList } from './_components/sections-list'
import { AddMoreModules } from './_components/add-more-modules'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'

interface ResumeListItem {
  readonly id: string
  readonly title: string
  readonly updatedAt: string
}

interface ResumeFull {
  readonly id: string
  readonly title: string
  readonly content: ResumeData & { [k: string]: unknown }
}

type LoadState = 'loading' | 'ready' | 'empty' | 'error'

/**
 * Mobile edit home page. Loads the target resume (by ?id= or latest) into the
 * draft store and renders greeting, progress, quick actions and module previews.
 */
export default function MobileEditHomeClient(): ReactElement {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paramId: string | null = searchParams.get('id')
  const setFromServer = useDraftStore((s) => s.setFromServer)
  const draft = useDraftStore((s) => s.draft)
  const resumeId = useDraftStore((s) => s.resumeId)
  const hasCachedDraft: boolean = Boolean(draft && resumeId && (!paramId || paramId === resumeId))
  const [loadState, setLoadState] = useState<LoadState>(hasCachedDraft ? 'ready' : 'loading')
  const [errorMsg, setErrorMsg] = useState<string>('')

  useEffect(() => {
    let cancelled: boolean = false
    if (hasCachedDraft) return
    const run = async (): Promise<void> => {
      try {
        let targetId: string | null = paramId
        if (!targetId) {
          const listRes = await fetch('/next-api/resumes', { credentials: 'include' })
          if (!listRes.ok) throw new Error(`列表加载失败 (${listRes.status})`)
          const list: ResumeListItem[] = await listRes.json()
          if (!list || list.length === 0) {
            if (!cancelled) setLoadState('empty')
            return
          }
          targetId = list[0].id
        }
        const res = await fetch(`/next-api/resumes/${targetId}`, { credentials: 'include' })
        if (!res.ok) throw new Error(`简历加载失败 (${res.status})`)
        const full: ResumeFull = await res.json()
        if (cancelled) return
        setFromServer(full.id, full.content as ResumeData)
        setLoadState('ready')
      } catch (err: unknown) {
        if (cancelled) return
        const msg: string = err instanceof Error ? err.message : '加载失败'
        setErrorMsg(msg)
        setLoadState('error')
      }
    }
    void run()
    return (): void => {
      cancelled = true
    }
  }, [paramId, setFromServer, hasCachedDraft])

  const resume: ResumeData | null = draft
  const progress: number = useMemo((): number => (resume ? computeProgress(resume) : 0), [resume])

  const emptyOptionalModules = useMemo(() => {
    if (!resume) return []
    return MODULES.filter((m) => {
      if (m.required) return false
      if (m.key === 'custom') {
        // Custom module chip shown only when there are no custom sections.
        return !resume.sections.some((s) => !findModuleBySectionTitle(s.title))
      }
      if (!m.sectionTitle) return true
      const sec = resume.sections.find((s) => s.title.replace(/\s/g, '') === m.sectionTitle!.replace(/\s/g, ''))
      if (!sec) return true
      if (sec.blocks.length === 0) return true
      if (sec.blocks.length === 1 && sec.blocks[0].type === 'text') {
        return !htmlToPlainText(sec.blocks[0].html)
      }
      // Check if all list-based blocks are empty
      return sec.blocks.every((block) => {
        switch (block.type) {
          case 'project':
            return !block.name && !block.role && !block.contentHtml
          case 'experience':
            return !block.company && !block.position && !block.contentHtml
          case 'education':
            return !block.school && !block.major && !block.degree
          case 'campus':
            return !block.organization && !block.position && !block.contentHtml
          default:
            return false
        }
      })
    })
  }, [resume])

  const handleCreateNew = async (): Promise<void> => {
    try {
      const res = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '我的简历', content: {}, template: 'simple' }),
      })
      if (!res.ok) throw new Error('创建失败')
      const created: { id: string } = await res.json()
      router.replace(`/m/edit?id=${created.id}`)
    } catch {
      toast.error('创建简历失败，请稍后再试')
    }
  }

  if (loadState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">
        <Loader2 className="animate-spin" size={20} />
        <span className="ml-2 text-sm">正在加载你的简历…</span>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500 px-8 text-center">
        <div className="text-4xl mb-3">😢</div>
        <div className="text-sm mb-4">{errorMsg || '加载失败，请稍后再试'}</div>
        <button
          type="button"
          onClick={(): void => window.location.reload()}
          className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm"
        >
          重试
        </button>
      </div>
    )
  }

  if (loadState === 'empty') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-8 text-center">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-lg font-semibold text-slate-900 mb-2">还没有简历</h2>
        <p className="text-sm text-slate-500 mb-6">创建你的第一份简历，开启求职新旅程</p>
        <button
          type="button"
          onClick={handleCreateNew}
          className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/30 active:scale-95 transition-transform"
        >
          创建新简历
        </button>
      </div>
    )
  }

  if (!resume) return <div />

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          aria-label="菜单"
        >
          <Menu size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">我的简历</div>
        <div className="w-9" />
      </div>

      <GreetingBanner name={resume.name} />
      <ProgressCard progress={progress} />
      <MilestoneConfetti progress={progress} />

      <div className="mt-5" />
      <QuickActions />

      <div className="mt-6 px-5 flex flex-col gap-3">
        <BaseInfoPreview resume={resume} />
        <JobIntentionPreview resume={resume} />
      </div>

      <SectionsList sections={resume.sections} />

      <AddMoreModules emptyModules={emptyOptionalModules} />

      <DeveloperNote />
      <HomeActionBar resumeId={resumeId} />
    </div>
  )
}
