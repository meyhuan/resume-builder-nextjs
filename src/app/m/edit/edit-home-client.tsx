'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import { createLogger } from '@/lib/logger'
import type { ResumeData } from '@/entities/resume/resume-data'
import { MODULES, findModuleBySectionTitle } from '@/entities/module/module-config'
import { useDraftStore } from '@/features/edit/draft/draft-store'
import { htmlToPlainText } from '@/features/edit/form-fields/html-text'
import { computeProgress } from '@/features/edit/progress/module-completeness'
import { isMeaningfulText } from '@/features/edit/progress/meaningful-field'
import { useInMiniProgram } from '../_components/use-mini-program'
import { AddMoreModules } from './_components/add-more-modules'
import { DeveloperNote } from './_components/developer-note'
import { HomeActionBar } from './_components/home-action-bar'
import { JobIntentionPreview } from './_components/job-intention-preview'
import { ResumeProfileCard } from './_components/resume-profile-card'
import { SectionsList } from './_components/sections-list'
import { TemplateSpecificSettings } from './_components/template-metrics-preview'

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
const SCROLL_STORAGE_PREFIX = 'm-edit-home-scroll'

function findScrollContainer(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null
  while (current) {
    const style = window.getComputedStyle(current)
    const canScroll = /(auto|scroll)/.test(style.overflowY) && current.scrollHeight > current.clientHeight
    if (canScroll) return current
    current = current.parentElement
  }
  return document.scrollingElement instanceof HTMLElement ? document.scrollingElement : null
}

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
  const inMiniProgram = useInMiniProgram()
  const setFromServer = useDraftStore((s): typeof s.setFromServer => s.setFromServer)
  const draft = useDraftStore((s): ResumeData | null => s.draft)
  const resumeId = useDraftStore((s): string | null => s.resumeId)
  const draftTemplateId = useDraftStore((s): string => s.templateId)
  const hydratedRef = useRef<boolean>(false)
  const restoredScrollRef = useRef<boolean>(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const scrollStorageKey = `${SCROLL_STORAGE_PREFIX}:${initial?.id ?? resumeId ?? 'default'}`

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
  // draft from a previous resume cannot leak into a new edit session.
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

  useLayoutEffect((): (() => void) | void => {
    if (restoredScrollRef.current) return
    const scroller = findScrollContainer(rootRef.current)
    if (!scroller) return

    const saved = sessionStorage.getItem(scrollStorageKey)
    if (!saved) return

    const y = Number(saved)
    if (!Number.isFinite(y) || y <= 0) return
    restoredScrollRef.current = true

    const restore = (): void => {
      scroller.scrollTo({ top: y, left: 0, behavior: 'instant' })
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const frameId = requestAnimationFrame((): void => {
      restore()
      timeoutId = setTimeout(restore, 80)
    })

    return (): void => {
      cancelAnimationFrame(frameId)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [scrollStorageKey])

  useEffect((): (() => void) => {
    const scroller = findScrollContainer(rootRef.current)
    if (!scroller) return (): void => {}

    let frameId: number | null = null

    const saveScroll = (): void => {
      sessionStorage.setItem(scrollStorageKey, String(Math.max(0, Math.round(scroller.scrollTop))))
    }

    const handleScroll = (): void => {
      if (frameId !== null) return
      frameId = requestAnimationFrame((): void => {
        frameId = null
        saveScroll()
      })
    }

    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') saveScroll()
    }

    scroller.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('pagehide', saveScroll)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return (): void => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      saveScroll()
      scroller.removeEventListener('scroll', handleScroll)
      window.removeEventListener('pagehide', saveScroll)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [scrollStorageKey])

  const saveCurrentScroll = (): void => {
    const scroller = findScrollContainer(rootRef.current)
    if (!scroller) return
    sessionStorage.setItem(scrollStorageKey, String(Math.max(0, Math.round(scroller.scrollTop))))
  }

  // Resolve the resume to render. Trust the draft only when its id matches
  // and it has real content. Otherwise fall through to freshly loaded data.
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

  const missingItems: readonly string[] = useMemo(() => {
    if (!resume) return []
    const items: string[] = []
    const base = resume.baseInfo ?? {}
    const intention = resume.jobIntention ?? {}
    if (!isMeaningfulText(resume.name)) items.push('姓名')
    if (!isMeaningfulText(base.phone)) items.push('手机号')
    if (!isMeaningfulText(base.email)) items.push('邮箱')
    if (!isMeaningfulText(intention.position)) items.push('求职岗位')
    if (!isMeaningfulText(intention.city)) items.push('意向城市')
    const hasCoreExperience = resume.sections.some((section) =>
      section.blocks.some((block) => {
        if (block.type === 'project') {
          return Boolean(isMeaningfulText(block.name) || htmlToPlainText(block.contentHtml))
        }
        if (block.type === 'experience') {
          return Boolean(
            isMeaningfulText(block.company) ||
            isMeaningfulText(block.position) ||
            htmlToPlainText(block.contentHtml),
          )
        }
        return false
      }),
    )
    if (!hasCoreExperience) items.push('项目或经历')
    return items.slice(0, 4)
  }, [resume])

  const emptyOptionalModules = useMemo(() => {
    if (!resume) return []
    return MODULES.filter((m) => {
      if (m.required) return false
      if (m.key === 'custom') {
        return true
      }
      if (!m.sectionTitle) return true
      const sec = resume.sections.find((s) => findModuleBySectionTitle(s.title)?.key === m.key)
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
  const currentTemplateId = draftTemplateId || initial?.template || 'simple'

  return (
    <div
      ref={rootRef}
      className="min-h-screen pt-2 relative"
      style={{
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 112px)',
      }}
      onClickCapture={saveCurrentScroll}
    >
      {/* Viewport-fixed background layer to bypass iOS Safari / WeChat WebView background-attachment limitation */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 12% 8%, rgba(124, 58, 237, 0.09) 0, rgba(124, 58, 237, 0) 320px), linear-gradient(180deg, #fbfaff 0%, #faf9ff 30%, #ffffff 100%)',
        }}
      />
      {!inMiniProgram && (
        <div className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur">
          <button
            type="button"
            onClick={(): void => router.push('/m')}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-transform hover:bg-slate-100 active:scale-95"
            aria-label="返回首页"
          >
            <ArrowLeft size={21} />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-slate-950">
            编辑简历
          </div>
          <button
            type="button"
            onClick={(): void => router.push('/m/edit/import')}
            className="rounded-xl px-2 py-1.5 text-[14px] font-medium text-violet-700 hover:bg-violet-50"
          >
            导入
          </button>
        </div>
      )}

      <ResumeProfileCard resume={resume} progress={progress} missingItems={missingItems} />

      <div className="mt-2 px-3">
        <JobIntentionPreview resume={resume} />
      </div>

      <TemplateSpecificSettings resume={resume} templateId={currentTemplateId} />

      <SectionsList sections={resume.sections} />

      <AddMoreModules emptyModules={emptyOptionalModules} />

      <DeveloperNote />
      <HomeActionBar
        resumeId={resumeId ?? initial?.id ?? null}
        template={initial?.template ?? null}
      />
    </div>
  )
}
