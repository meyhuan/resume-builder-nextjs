'use client'

import { useEffect, useMemo, useRef, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import type { ResumeData } from '@/entities/resume/resume-data'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { computeProgress } from '@/features/edit/progress/module-completeness'
import { MODULES, findModuleBySectionTitle } from '@/entities/module/module-config'
import { GreetingBanner } from './_components/greeting-banner'
import { ProgressCard } from './_components/progress-card'
import { MilestoneConfetti } from './_components/milestone-confetti'
import { HomeActionBar } from './_components/home-action-bar'
import { DeveloperNote } from './_components/developer-note'
import { BaseInfoPreview } from './_components/base-info-preview'
import { JobIntentionPreview } from './_components/job-intention-preview'
import { SectionsList } from './_components/sections-list'
import { AddMoreModules } from './_components/add-more-modules'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'

/**
 * Resume data already loaded on the server and passed as a prop.
 * When null, the user has no resumes yet and we show an empty state.
 */
export interface InitialResume {
  readonly id: string
  readonly title: string
  readonly content: ResumeData
  readonly template: string
}

interface MobileEditHomeClientProps {
  readonly initial: InitialResume | null
}

const log = createLogger('m/edit')

/**
 * Mobile edit home page. Data is loaded server-side in page.tsx and injected
 * via the `initial` prop, so this component never fetches on mount. The local
 * draft store is hydrated once on first render; subsequent user edits stay
 * client-side until the user hits Save.
 */
export default function MobileEditHomeClient(
  { initial }: MobileEditHomeClientProps,
): ReactElement {
  log.info('mount', { hasInitial: !!initial, initialId: initial?.id })
  const router = useRouter()
  const setFromServer = useDraftStore((s): typeof s.setFromServer => s.setFromServer)
  const draft = useDraftStore((s): ResumeData | null => s.draft)
  const resumeId = useDraftStore((s): string | null => s.resumeId)
  const hydratedRef = useRef<boolean>(false)

  log.info('store snapshot', {
    storeResumeId: resumeId,
    hasDraft: !!draft,
    draftSectionCount: draft?.sections?.length,
    draftName: draft?.name,
  })

  if (initial) {
    log.info('initial prop', {
      id: initial.id,
      template: initial.template,
      contentSectionCount: initial.content?.sections?.length,
      contentName: initial.content?.name,
      contentKeys: initial.content ? Object.keys(initial.content) : [],
      sectionsIsArray: Array.isArray(initial.content?.sections),
    })
  } else {
    log.warn('initial prop is null (server returned no resume)')
  }

  // Normalize: content from DB may be missing sections if it was created
  // with an older schema. Ensure the field is always an array.
  if (initial && !Array.isArray(initial.content?.sections)) {
    log.warn('initial.content.sections missing or not array, normalizing to []')
    ;(initial.content as unknown as Record<string, unknown>).sections = []
  }

  // Hydrate the store whenever the server resume id differs from what's
  // currently in the persisted draft. This guarantees a stale persisted
  // draft (from a previous resume) cannot leak into a new edit session.
  if (initial && initial.id !== resumeId) {
    log.info('hydrate store: id mismatch', { from: resumeId, to: initial.id })
    setFromServer(initial.id, initial.content, initial.template)
    hydratedRef.current = true
  }

  useEffect((): void => {
    if (!hydratedRef.current && initial && initial.id !== resumeId) {
      log.info('hydrate via effect (fallback)', { id: initial.id })
      setFromServer(initial.id, initial.content, initial.template)
      hydratedRef.current = true
    }
  }, [initial, setFromServer, resumeId])

  // Resolve the resume to render.
  // Trust the draft only when its id matches AND it has actual content
  // (sections.length > 0 or a non-empty name). An empty draft means the
  // user never edited yet — fall through to the freshly-loaded server data.
  const draftHasContent: boolean = !!(
    draft &&
    resumeId === initial?.id &&
    (draft.name || (draft.sections && draft.sections.length > 0))
  )
  const resume: ResumeData | null = (() => {
    if (initial && draftHasContent) return draft
    if (initial) return initial.content
    return draft
  })()
  log.info('resolved resume', {
    source: initial && draftHasContent ? 'draft' : initial ? 'initial.content' : 'draft-fallback',
    draftHasContent,
    hasResume: !!resume,
    sectionCount: resume?.sections?.length,
    name: resume?.name,
  })

  const progress: number = useMemo(
    (): number => (resume ? computeProgress(resume) : 0),
    [resume],
  )

  const emptyOptionalModules = useMemo(() => {
    if (!resume) return []
    return MODULES.filter((m) => {
      if (m.required) return false
      if (m.key === 'custom') {
        return !resume.sections.some((s) => !findModuleBySectionTitle(s.title))
      }
      if (!m.sectionTitle) return true
      const sec = resume.sections.find(
        (s) => s.title.replace(/\s/g, '') === m.sectionTitle!.replace(/\s/g, ''),
      )
      if (!sec) return true
      if (sec.blocks.length === 0) return true
      if (sec.blocks.length === 1 && sec.blocks[0].type === 'text') {
        return !htmlToPlainText(sec.blocks[0].html)
      }
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
    log.info('create new resume start')
    try {
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '我的简历', content: {}, template: 'simple' }),
      })
      log.info('create resume HTTP', { status: res.status })
      if (!res.ok) throw new Error('创建失败')
      const created: { id: string } = await res.json()
      log.info('create resume done', { id: created.id })
      router.replace(`/m/edit?id=${created.id}`)
    } catch (e: unknown) {
      log.error('create resume failed', { error: e instanceof Error ? e.message : String(e) })
      toast.error('创建简历失败，请稍后再试')
    }
  }

  if (!resume) {
    log.warn('render empty state (no resume)')
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

  log.info('render resume', { id: initial?.id, name: resume.name })

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
    >
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          onClick={(): void => router.push('/m')}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100 active:scale-95 transition-transform"
          aria-label="返回首页"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">我的简历</div>
        <div className="w-9" />
      </div>

      <GreetingBanner name={resume.name} />
      <ProgressCard progress={progress} />
      <MilestoneConfetti progress={progress} />

      <div className="mt-5 px-5 flex flex-col gap-3">
        <BaseInfoPreview resume={resume} />
        <JobIntentionPreview resume={resume} />
      </div>

      <SectionsList sections={resume.sections} />

      <AddMoreModules emptyModules={emptyOptionalModules} />

      <DeveloperNote />
      <HomeActionBar resumeId={resumeId ?? initial?.id ?? null} template={initial?.template ?? null} />
    </div>
  )
}
