'use client'

import { useCallback, useEffect, useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getCookie } from 'cookies-next'
import { toast } from 'sonner'
import { createLogger } from '@/lib/logger'
import { ArrowLeft, MoreHorizontal, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
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

type ListState = 'checking-auth' | 'loading' | 'ready' | 'error'

const log = createLogger('m/resumes')

/**
 * Full mobile list of the user's resumes. Uses the same session cache as
 * `/m` so repeat visits show the list instantly (stale-while-revalidate).
 */
export default function MobileResumesClient(): ReactElement {
  const router = useRouter()
  log.info('mount')
  const [resumes, setResumes] = useState<readonly ResumeListItem[]>([])
  const [state, setState] = useState<ListState>('checking-auth')
  const [creating, setCreating] = useState<boolean>(false)
  const [actionTarget, setActionTarget] = useState<ResumeListItem | null>(null)
  const [renameTarget, setRenameTarget] = useState<ResumeListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ResumeListItem | null>(null)

  useEffect((): void | (() => void) => {
    const uid: string | undefined = getCookie('auth_uid') as string | undefined
    if (!uid) {
      log.warn('no auth cookie, redirect to login')
      router.replace('/login?redirect=/m/resumes')
      return
    }
    const cached: readonly ResumeListItem[] | null = readResumeListCache()
    if (cached) {
      setResumes(cached)
      setState('ready')
    } else {
      setState('loading')
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
        setState('ready')
        writeResumeListCache(list)
      } catch (e: unknown) {
        log.error('fetch resumes failed', { error: e instanceof Error ? e.message : String(e) })
        if (cancelled) return
        if (!cached) setState('error')
      }
    })()
    return (): void => {
      cancelled = true
    }
  }, [router])

  const refresh = useCallback(async (): Promise<void> => {
    log.info('refresh resumes start')
    try {
      const res: Response = await fetch('/next-api/resumes', { credentials: 'include' })
      log.info('refresh resumes HTTP', { status: res.status })
      if (!res.ok) return
      const list: ResumeListItem[] = await res.json()
      log.info('refresh resumes parsed', { count: list.length })
      setResumes(list)
      writeResumeListCache(list)
    } catch (e: unknown) {
      log.error('refresh resumes failed', { error: e instanceof Error ? e.message : String(e) })
    }
  }, [])

  const handleCreate = useCallback(async (): Promise<void> => {
    if (creating) return
    setCreating(true)
    try {
      log.info('create resume start')
      const res: Response = await fetch('/next-api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ title: '我的简历', content: {}, template: 'simple' }),
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
  }, [creating, router])

  const handleAction = useCallback(
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
          await refresh()
        } catch {
          toast.error('复制失败，请稍后再试')
        }
        return
      }
      if (action === 'delete') {
        setDeleteTarget(target)
      }
    },
    [actionTarget, refresh, router],
  )

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    const target: ResumeListItem | null = deleteTarget
    if (!target) return
    try {
      await deleteResumeAction(target.id)
      toast.success('删除成功')
      setDeleteTarget(null)
      await refresh()
    } catch {
      toast.error('删除失败，请稍后再试')
    }
  }, [deleteTarget, refresh])

  const handleRenameSubmit = useCallback(
    async (next: string): Promise<void> => {
      const target: ResumeListItem | null = renameTarget
      if (!target) return
      const trimmed: string = next.trim()
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
        await refresh()
      } catch {
        toast.error('重命名失败，请稍后再试')
      }
    },
    [renameTarget, refresh],
  )

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
    >
      {/* Top bar */}
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

      {/* List body */}
      {state === 'checking-auth' || state === 'loading' ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="animate-spin" size={18} />
          <span className="ml-2 text-sm">加载中…</span>
        </div>
      ) : state === 'error' ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 px-8 text-center">
          <div className="text-4xl mb-3">😢</div>
          <div className="text-sm mb-4">加载失败，请稍后再试</div>
          <button
            type="button"
            onClick={(): void => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm"
          >
            重试
          </button>
        </div>
      ) : resumes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <div className="text-5xl mb-4">📝</div>
          <div className="text-[15px] font-semibold text-slate-900 mb-1">还没有简历</div>
          <div className="text-[13px] text-slate-500 mb-5">创建你的第一份简历，开启求职之旅</div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium shadow-lg shadow-violet-600/30 active:scale-95 transition-transform disabled:opacity-70"
          >
            {creating ? '创建中…' : '创建新简历'}
          </button>
        </div>
      ) : (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {resumes.map((r): ReactElement => (
            <ResumeRow
              key={r.id}
              resume={r}
              onClick={(): void => router.push(`/m/edit?id=${r.id}`)}
              onMore={(): void => setActionTarget(r)}
            />
          ))}
        </div>
      )}

      {/* Floating "new resume" FAB */}
      {state === 'ready' && resumes.length > 0 && (
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className={cn(
            'fixed right-4 z-30 h-12 px-4 rounded-full bg-violet-600 text-white',
            'flex items-center gap-2 shadow-lg shadow-violet-600/30 active:scale-95 transition-transform',
            'disabled:opacity-70',
          )}
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
          aria-label="创建新简历"
        >
          {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          <span className="text-sm font-medium">新建简历</span>
        </button>
      )}

      <ResumeActionSheet
        target={actionTarget}
        onClose={(): void => setActionTarget(null)}
        onSelect={handleAction}
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
    </div>
  )
}

/**
 * Horizontal row card — thumbnail on the left, title + timestamp on the
 * right, "more" button at the far right.
 */
function ResumeRow({
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
    <div className="relative rounded-2xl bg-white border border-slate-200 p-3 flex gap-3">
      <button
        type="button"
        onClick={onClick}
        className="flex-1 flex gap-3 text-left active:scale-[0.99] transition-transform min-w-0"
        aria-label={`打开 ${resume.title || '简历'}`}
      >
        <div
          className={cn(
            'h-[96px] w-[72px] rounded-xl shrink-0 overflow-hidden relative',
            'border border-slate-200 bg-white',
          )}
        >
          {hasCover ? (
            <Image
              src={resume.thumbnail as string}
              alt={resume.title || '简历'}
              fill
              sizes="72px"
              className="object-cover object-top"
            />
          ) : (
            <ResumeSvgPlaceholder />
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between min-w-0 py-0.5">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-slate-900 truncate">
              {resume.title || '未命名简历'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {formatUpdateTime(resume.updatedAt)}
            </div>
          </div>
          <div className="text-[11px] text-violet-600">点击打开 →</div>
        </div>
      </button>
      <button
        type="button"
        onClick={onMore}
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
