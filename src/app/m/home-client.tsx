'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getCookie } from 'cookies-next'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import {
  Sparkles,
  FilePlus2,
  Download,
  FileText,
  ChevronRight,
  MoreHorizontal,
  Loader2,
  LogIn,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getAllTemplates, type TemplateConfig } from '@/templates/template-loader'
import { defaultResume } from '@/state/store'
import {
  renameResume as renameResumeAction,
  duplicateResume as duplicateResumeAction,
  deleteResume as deleteResumeAction,
} from '@/app/dashboard/actions'
import {
  ResumeActionSheet,
  RenameDialog,
  ConfirmDialog,
  ResumeSvgPlaceholder,
  formatUpdateTime,
  readResumeListCache,
  writeResumeListCache,
  type ResumeListItem,
  type ResumeAction,
} from '@/features/m/resume-list/shared'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ResumeLoadState = 'idle' | 'loading' | 'ready' | 'error'

const MAX_RESUMES_IN_PREVIEW = 6

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Mobile H5 home client. Mirrors the miniprogram home structure:
 * hero banner, primary actions, user's resumes, template gallery,
 * and a floating login tip for unauthenticated users.
 */
interface MobileHomeClientProps {
  /**
   * Login state resolved server-side from the `auth_uid` cookie. Passed in
   * from the page.tsx server component so the first client render already
   * reflects the correct state — prevents the "My Resumes" section from
   * popping in and shifting layout on first paint.
   */
  readonly initialIsLoggedIn?: boolean
}

const log = createLogger('m/home')

export default function MobileHomeClient(props: MobileHomeClientProps = {}): ReactElement {
  const { initialIsLoggedIn = false } = props
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialIsLoggedIn)
  const [resumes, setResumes] = useState<readonly ResumeListItem[]>([])
  // When we already know the user is logged in at SSR time, reserve the
  // "My Resumes" slot with skeletons from the very first render.
  const [listState, setListState] = useState<ResumeLoadState>(
    initialIsLoggedIn ? 'loading' : 'idle',
  )
  const [creating, setCreating] = useState<boolean>(false)
  const [actionTarget, setActionTarget] = useState<ResumeListItem | null>(null)
  const [renameTarget, setRenameTarget] = useState<ResumeListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResumeListItem | null>(null)
  const templates: readonly TemplateConfig[] = getAllTemplates()

  // Client-side re-check of the auth cookie. Covers the case where the
  // cookie changed in another tab while this tab stayed mounted.
  useEffect((): void => {
    const uid: string | undefined = getCookie('auth_uid') as string | undefined
    setIsLoggedIn(Boolean(uid))
  }, [])

  // Fetch user's resumes only when logged in.
  // Uses a session cache so the list shows instantly on repeat visits
  // (stale-while-revalidate: render cached data, then refresh in background).
  useEffect(() => {
    if (!isLoggedIn) {
      setListState('idle')
      setResumes([])
      return
    }
    const cached: readonly ResumeListItem[] | null = readResumeListCache()
    if (cached) {
      setResumes(cached)
      setListState('ready')
    } else {
      setListState('loading')
    }
    let cancelled = false
    void (async (): Promise<void> => {
      log.info('fetch resumes start')
      try {
        const res: Response = await fetch('/next-api/resumes', { credentials: 'include' })
        log.info('fetch resumes HTTP', { status: res.status })
        if (!res.ok) throw new Error(`${res.status}`)
        const list: ResumeListItem[] = await res.json()
        log.info('fetch resumes parsed', { count: list.length })
        if (cancelled) return
        setResumes(list)
        setListState('ready')
        writeResumeListCache(list)
      } catch (e: unknown) {
        log.error('fetch resumes failed', { error: e instanceof Error ? e.message : String(e) })
        if (cancelled) return
        // Only surface error state when there was nothing to show.
        if (!cached) setListState('error')
      }
    })()
    return (): void => {
      cancelled = true
    }
  }, [isLoggedIn])

  // --- Action handlers ------------------------------------------------------

  const requireLogin = useCallback(
    (redirectTo: string): boolean => {
      if (isLoggedIn) return true
      router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`)
      return false
    },
    [isLoggedIn, router],
  )

  /** Create a blank resume then navigate into the editor. */
  const handleCreateResume = useCallback(async (): Promise<void> => {
    if (!requireLogin('/m/edit')) return
    if (creating) return
    setCreating(true)
    try {
      log.info('create resume start')
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '我的简历', content: defaultResume, template: 'simple' }),
      })
      log.info('create resume HTTP', { status: res.status })
      if (!res.ok) throw new Error(`${res.status}`)
      const created: { id: string } = await res.json()
      log.info('create resume done', { id: created.id })
      router.push(`/m/edit?id=${created.id}`)
    } catch (e: unknown) {
      log.error('create resume failed', { error: e instanceof Error ? e.message : String(e) })
      toast.error('创建简历失败，请稍后再试')
    } finally {
      setCreating(false)
    }
  }, [creating, requireLogin, router])

  const handleAiGenerate = useCallback((): void => {
    if (!requireLogin('/m/edit/ai-generate')) return
    router.push('/m/edit/ai-generate')
  }, [requireLogin, router])

  const handleImport = useCallback((): void => {
    if (!requireLogin('/m/edit/import?mode=file')) return
    router.push('/m/edit/import?mode=file')
  }, [requireLogin, router])

  const handleMarkdownImport = useCallback((): void => {
    if (!requireLogin('/m/edit/import?mode=text')) return
    router.push('/m/edit/import?mode=text')
  }, [requireLogin, router])

  const handleOpenResume = useCallback(
    (id: string): void => {
      router.push(`/m/edit?id=${id}`)
    },
    [router],
  )

  /** Re-fetch the resume list after a mutation action. */
  const refreshResumes = useCallback(async (): Promise<void> => {
    try {
      const res: Response = await fetch('/next-api/resumes', { credentials: 'include' })
      if (!res.ok) return
      const list: ResumeListItem[] = await res.json()
      setResumes(list)
      writeResumeListCache(list)
    } catch {
      /* ignore */
    }
  }, [])

  const handleActionSelect = useCallback(
    async (action: ResumeAction): Promise<void> => {
      const target: ResumeListItem | null = actionTarget
      if (!target) return
      setActionTarget(null)
      if (action === 'edit') {
        router.push(`/m/edit?id=${target.id}`)
        return
      }
      if (action === 'rename') {
        setRenameTarget(target)
        return
      }
      if (action === 'duplicate') {
        try {
          await duplicateResumeAction(target.id)
          toast.success('复制成功')
          await refreshResumes()
        } catch {
          toast.error('复制失败，请稍后再试')
        }
        return
      }
      if (action === 'delete') {
        setDeleteTarget(target)
      }
    },
    [actionTarget, refreshResumes, router],
  )

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    const target: ResumeListItem | null = deleteTarget
    if (!target) return
    try {
      await deleteResumeAction(target.id)
      toast.success('删除成功')
      setDeleteTarget(null)
      await refreshResumes()
    } catch {
      toast.error('删除失败，请稍后再试')
    }
  }, [deleteTarget, refreshResumes])

  const handleRenameSubmit = useCallback(
    async (nextTitle: string): Promise<void> => {
      const target: ResumeListItem | null = renameTarget
      if (!target) return
      const trimmed: string = nextTitle.trim()
      if (!trimmed) {
        toast.error('名称不能为空')
        return
      }
      if (trimmed === target.title) {
        setRenameTarget(null)
        return
      }
      try {
        await renameResumeAction(target.id, trimmed)
        toast.success('重命名成功')
        setRenameTarget(null)
        await refreshResumes()
      } catch {
        toast.error('重命名失败，请稍后再试')
      }
    },
    [renameTarget, refreshResumes],
  )

  const handleViewAllResumes = useCallback((): void => {
    router.push('/m/resumes')
  }, [router])

  const handleSelectTemplate = useCallback(
    (tplId: string): void => {
      router.push(`/m/preview?tpl=${tplId}`)
    },
    [router],
  )

  const handleLogin = useCallback((): void => {
    router.push('/login?redirect=/m')
  }, [router])

  // --- Render ---------------------------------------------------------------

  // Reserve space for the "My Resumes" section whenever it will likely
  // render — logged in AND either still loading or already has items.
  // This prevents layout shift on first-visit cache misses.
  const showMyResumes: boolean =
    isLoggedIn && (listState === 'loading' || resumes.length > 0)

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{
        paddingBottom: isLoggedIn
          ? 'calc(env(safe-area-inset-bottom, 0px) + 24px)'
          : 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
      }}
    >
      <HeroBanner />

      <PrimaryActions
        creating={creating}
        onAiGenerate={handleAiGenerate}
        onCreate={handleCreateResume}
        onImport={handleImport}
        onMarkdown={handleMarkdownImport}
      />

      {showMyResumes && (
        <MyResumesSection
          resumes={resumes.slice(0, MAX_RESUMES_IN_PREVIEW)}
          loading={listState === 'loading'}
          onOpen={handleOpenResume}
          onViewAll={handleViewAllResumes}
          onMore={(r): void => setActionTarget(r)}
        />
      )}

      <ResumeActionSheet
        target={actionTarget}
        onClose={(): void => setActionTarget(null)}
        onSelect={handleActionSelect}
      />

      <RenameDialog
        target={renameTarget}
        onClose={(): void => setRenameTarget(null)}
        onSubmit={handleRenameSubmit}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除简历"
        message={`确定删除「${deleteTarget?.title || '简历'}」吗？删除后无法恢复。`}
        confirmLabel="删除"
        danger
        onConfirm={handleDeleteConfirm}
        onCancel={(): void => setDeleteTarget(null)}
      />

      {isLoggedIn && listState === 'ready' && resumes.length === 0 && (
        <EmptyResumesHint onCreate={handleCreateResume} creating={creating} />
      )}

      <TemplatesSection templates={templates} onSelect={handleSelectTemplate} />

      {!isLoggedIn && <LoginTipBar onLogin={handleLogin} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Hero banner
// ---------------------------------------------------------------------------

/**
 * Gradient hero card with a bold headline. Replaces the miniprogram's banner
 * image with a pure-CSS composition so no extra image assets are required.
 */
function HeroBanner(): ReactElement {
  return (
    <div className="px-4 pt-4">
      <div className="relative overflow-hidden rounded-3xl p-5 min-h-[176px] bg-gradient-to-br from-violet-500 via-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/20">
        {/* Decorative blobs — kept within the violet family to avoid color noise */}
        <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl" />
        <div className="pointer-events-none absolute top-6 right-6 text-white/20">
          <Sparkles size={64} strokeWidth={1.2} />
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-medium">
            <Sparkles size={11} /> AI 简历助手
          </div>
          <h1 className="mt-3 text-[24px] font-bold leading-tight">
            和 AI 聊一聊<br />写出专业简历
          </h1>
          <p className="mt-1.5 text-[13px] text-white/85 leading-relaxed">
            无需写作 · 智能提问 · 身份适配
          </p>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Primary actions
// ---------------------------------------------------------------------------

interface PrimaryActionsProps {
  readonly creating: boolean
  readonly onAiGenerate: () => void
  readonly onCreate: () => void
  readonly onImport: () => void
  readonly onMarkdown: () => void
}

/**
 * Three-tier action layout: tall AI button on the left, two stacked
 * buttons on the right, and a full-width Markdown import below.
 * Mirrors the miniprogram's action-buttons region 1:1.
 */
function PrimaryActions(props: PrimaryActionsProps): ReactElement {
  const { creating, onAiGenerate, onCreate, onImport, onMarkdown } = props
  return (
    <div className="mt-4 px-4 flex flex-col gap-2.5">
      <div className="flex gap-2.5">
        {/* Tall AI generate */}
        {/* Primary CTA — only button with a filled gradient so it reads as the hero action */}
        <button
          type="button"
          onClick={onAiGenerate}
          className={cn(
            'relative w-1/2 min-h-[104px] rounded-2xl p-3 overflow-hidden',
            'bg-gradient-to-br from-violet-500 to-violet-600 text-white',
            'shadow-md shadow-violet-500/25 active:scale-[0.98] transition-transform',
            'flex flex-col items-center justify-center gap-1',
          )}
        >
          <div className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full bg-white/15 blur-xl" />
          <Sparkles size={28} strokeWidth={1.8} />
          <div className="text-[15px] font-semibold mt-1">和 AI 聊一聊</div>
          <div className="text-[11px] text-white/80">对话式生成简历</div>
        </button>

        {/* Secondary actions — white cards with violet accents, clearly subordinate to the AI CTA */}
        <div className="w-1/2 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className={cn(
              'relative h-12 rounded-2xl px-3 flex items-center justify-center gap-2',
              'bg-white border border-violet-200 text-violet-700',
              'active:bg-violet-50 active:scale-[0.98] transition-all',
              'disabled:opacity-60 disabled:active:scale-100',
            )}
          >
            {creating ? <Loader2 size={16} className="animate-spin" /> : <FilePlus2 size={16} />}
            <span className="text-[14px] font-semibold">创建简历</span>
          </button>
          <button
            type="button"
            onClick={onImport}
            className={cn(
              'relative h-12 rounded-2xl px-3 flex items-center justify-center gap-2',
              'bg-white border border-violet-200 text-violet-700',
              'active:bg-violet-50 active:scale-[0.98] transition-all',
            )}
          >
            <Download size={16} />
            <span className="text-[14px] font-semibold">导入简历</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onMarkdown}
        className={cn(
          'relative h-14 rounded-2xl px-4 flex items-center justify-between gap-3',
          'bg-white border border-violet-200 text-violet-700',
          'active:bg-violet-50 active:scale-[0.98] transition-all',
        )}
      >
        <div className="flex items-center gap-2">
          <FileText size={18} />
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[14px] font-semibold">文本转简历</span>
            <span className="text-[11px] text-slate-500">
              粘贴豆包 / 元宝 / 千问生成的内容
            </span>
          </div>
        </div>
        <ChevronRight size={16} className="text-violet-400" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// My Resumes section
// ---------------------------------------------------------------------------

interface MyResumesSectionProps {
  readonly resumes: readonly ResumeListItem[]
  readonly loading: boolean
  readonly onOpen: (id: string) => void
  readonly onViewAll: () => void
  readonly onMore: (resume: ResumeListItem) => void
}

function MyResumesSection(props: MyResumesSectionProps): ReactElement {
  const { resumes, loading, onOpen, onViewAll, onMore } = props
  return (
    <section className="mt-6">
      <SectionHeader title="我的简历" actionLabel="查看全部" onAction={onViewAll} />
      <div
        className={cn(
          'mt-3 flex gap-3 overflow-x-auto px-4',
          'snap-x snap-mandatory',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {loading &&
          Array.from({ length: 2 }, (_, i): ReactElement => <ResumeCardSkeleton key={i} />)}
        {!loading &&
          resumes.map((r): ReactElement => (
            <ResumeCard
              key={r.id}
              resume={r}
              onClick={(): void => onOpen(r.id)}
              onMore={(): void => onMore(r)}
            />
          ))}
      </div>
    </section>
  )
}

function ResumeCard({
  resume,
  onClick,
  onMore,
}: {
  readonly resume: ResumeListItem
  readonly onClick: () => void
  readonly onMore: () => void
}): ReactElement {
  const hasCover: boolean = Boolean(resume.thumbnail)
  return (
    <div
      className={cn(
        'snap-start shrink-0 w-[280px] min-h-[136px] rounded-2xl p-3',
        'bg-white border border-slate-200 flex gap-3 relative',
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex gap-3 text-left active:scale-[0.98] transition-transform min-w-0"
        aria-label={`打开 ${resume.title || '简历'}`}
      >
        <div
          className={cn(
            'h-[104px] w-[76px] rounded-xl shrink-0 overflow-hidden relative',
            'border border-slate-200 bg-white',
          )}
        >
          {hasCover ? (
            <Image
              src={resume.thumbnail as string}
              alt={resume.title || '简历'}
              fill
              sizes="76px"
              className="object-cover object-top"
            />
          ) : (
            <ResumeSvgPlaceholder />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="text-[15px] font-semibold text-slate-900 truncate">
              {resume.title || '未命名简历'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {formatUpdateTime(resume.updatedAt)}
            </div>
          </div>
          <div className="flex items-center">
            <span className="text-[11px] text-violet-600">点击打开 →</span>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={(e): void => {
          e.stopPropagation()
          onMore()
        }}
        className={cn(
          'absolute bottom-3 right-3 h-7 w-7 rounded-lg',
          'flex items-center justify-center text-slate-400',
          'hover:bg-slate-100 active:bg-slate-200 transition-colors',
        )}
        aria-label="更多操作"
      >
        <MoreHorizontal size={16} />
      </button>
    </div>
  )
}

function ResumeCardSkeleton(): ReactElement {
  return (
    <div className="snap-start shrink-0 w-[280px] min-h-[136px] rounded-2xl p-3 bg-white border border-slate-200 flex gap-3">
      <div className="h-[104px] w-[76px] rounded-xl bg-slate-100 animate-pulse" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-slate-100 rounded animate-pulse" />
        <div className="mt-auto h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
      </div>
    </div>
  )
}

function EmptyResumesHint({
  onCreate,
  creating,
}: {
  readonly onCreate: () => void
  readonly creating: boolean
}): ReactElement {
  return (
    <section className="mt-6 mx-4 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center">
      <div className="text-3xl">📝</div>
      <div className="mt-2 text-[14px] font-semibold text-slate-900">还没有简历</div>
      <div className="mt-1 text-[12px] text-slate-500">
        创建你的第一份简历，开启求职之旅
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={creating}
        className="mt-3 px-4 py-2 rounded-xl bg-violet-600 text-white text-[13px] font-medium active:scale-95 transition-transform disabled:opacity-70"
      >
        {creating ? '创建中…' : '创建新简历'}
      </button>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Templates section
// ---------------------------------------------------------------------------

function TemplatesSection({
  templates,
  onSelect,
}: {
  readonly templates: readonly TemplateConfig[]
  readonly onSelect: (id: string) => void
}): ReactElement {
  return (
    <section className="mt-6">
      <SectionHeader title="风格简历模板" />
      <div className="mt-3 px-4 grid grid-cols-2 gap-3">
        {templates.map((tpl): ReactElement => (
          <TemplateCard key={tpl.id} template={tpl} onClick={(): void => onSelect(tpl.id)} />
        ))}
      </div>
    </section>
  )
}

function TemplateCard({
  template,
  onClick,
}: {
  readonly template: TemplateConfig
  readonly onClick: () => void
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative rounded-2xl overflow-hidden bg-white',
        'border border-slate-200 active:scale-[0.98] transition-transform text-left',
        'shadow-sm',
      )}
    >
      <div className="relative aspect-[210/297] bg-slate-50">
        {template.preview ? (
          <Image
            src={template.preview}
            alt={template.name}
            fill
            sizes="(max-width: 640px) 50vw, 240px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-[12px]">
            暂无预览
          </div>
        )}
        {template.tags?.includes('旗舰') && (
          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow">
            旗舰
          </span>
        )}
      </div>
      <div className="p-2.5">
        <div className="text-[13px] font-semibold text-slate-900 truncate">
          {template.name}
        </div>
        <div className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
          {template.description}
        </div>
      </div>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  readonly title: string
  readonly actionLabel?: string
  readonly onAction?: () => void
}): ReactElement {
  return (
    <div className="px-4 flex items-center justify-between">
      <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-[12px] text-slate-500 flex items-center gap-0.5 active:text-violet-600"
        >
          {actionLabel}
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * Floating bottom bar prompting the guest user to log in. Animates a
 * subtle vertical float to draw attention without being intrusive.
 */
function LoginTipBar({ onLogin }: { readonly onLogin: () => void }): ReactElement {
  return (
    <div
      className={cn(
        'fixed left-4 right-4 z-40',
        'rounded-2xl bg-white/80 backdrop-blur-md border border-white/50',
        'shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
        'px-4 py-3 flex items-center justify-between gap-3',
        'animate-[float_2.4s_ease-in-out_infinite]',
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
    >
      <span className="text-[13px] text-slate-800 font-medium">
        登录后可以保存简历数据哦
      </span>
      <button
        type="button"
        onClick={onLogin}
        className={cn(
          'shrink-0 h-9 px-4 rounded-full text-white text-[13px] font-semibold',
          'bg-violet-600 active:bg-violet-700',
          'shadow-md shadow-violet-600/25 active:scale-95 transition-all',
          'flex items-center gap-1',
        )}
      >
        <LogIn size={14} /> 立即登录
      </button>
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}

// ResumeActionSheet + RenameDialog + resume list cache live in
// `@/features/m/resume-list/shared` and are imported at the top of this file.
