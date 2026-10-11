'use client'

import type { ReactElement } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Clock3 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { track } from '@/lib/analytics'

const PROMPT_VERSION = 'v5'
const PROMPT_DELAY_MS = 800
const STORAGE_PREFIX = 'acquisition-source-prompted:'

const SOURCE_OPTIONS = [
  { value: 'xiaohongshu', label: '小红书', note: '内容种草', iconSrc: '/icons/acquisition-source/xiaohongshu.svg' },
  { value: 'douyin', label: '抖音', note: '短视频', iconSrc: '/icons/acquisition-source/douyin.svg' },
  { value: 'ai_tool', label: '豆包 / 其他 AI', note: 'AI 工具推荐', iconSrc: '/icons/acquisition-source/doubao.png' },
  { value: 'zhihu', label: '知乎', note: '问答推荐', iconSrc: '/icons/acquisition-source/zhihu.svg' },
  { value: 'wechat', label: '公众号 / 朋友圈', note: '微信渠道', iconSrc: '/icons/acquisition-source/wechat.svg' },
  { value: 'search', label: '搜索引擎', note: '主动搜索', iconSrc: '/icons/acquisition-source/search.svg' },
  { value: 'friend', label: '朋友推荐', note: '熟人分享', iconSrc: '/icons/acquisition-source/friend.svg' },
  { value: 'other', label: '其他渠道', note: '线下或其他', iconSrc: '/icons/acquisition-source/other.svg' },
] as const

interface AcquisitionSourceDialogProps {
  readonly userId?: string | null
}

export function AcquisitionSourceDialog({ userId }: AcquisitionSourceDialogProps): ReactElement | null {
  const [open, setOpen] = useState(false)
  const [otherMode, setOtherMode] = useState(false)
  const [otherDetail, setOtherDetail] = useState('')
  const completedRef = useRef(false)
  const storageKey = userId ? `${STORAGE_PREFIX}${userId}:${PROMPT_VERSION}` : null

  useEffect(() => {
    completedRef.current = false
    if (!storageKey || typeof window === 'undefined') return
    if (window.localStorage.getItem(storageKey)) return

    const timer = window.setTimeout(() => setOpen(true), PROMPT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [storageKey])

  const complete = (
    source: string,
    eventName: 'acquisition_source_selected' | 'acquisition_source_skipped',
    extraProperties: Record<string, unknown> = {},
  ): void => {
    if (completedRef.current) return
    completedRef.current = true
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, new Date().toISOString())
      } catch {
        // A storage failure must not prevent the user from continuing.
      }
    }
    track(eventName, {
      entry: 'acquisition_source_dialog',
      source,
      promptVersion: PROMPT_VERSION,
      ...extraProperties,
    })
    setOtherMode(false)
    setOtherDetail('')
    setOpen(false)
  }

  const handleSourceClick = (source: string): void => {
    if (source === 'other') {
      setOtherMode(true)
      setOtherDetail('')
      return
    }
    complete(source, 'acquisition_source_selected')
  }

  const submitOther = (): void => {
    const sourceDetail = otherDetail.trim()
    if (!sourceDetail) return
    complete('other', 'acquisition_source_selected', { sourceDetail })
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen && open && !completedRef.current) {
      complete('prefer_not_to_say', 'acquisition_source_skipped')
      return
    }
    setOpen(nextOpen)
  }

  if (!userId) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[456px] gap-0 overflow-hidden border-0 bg-white p-0 shadow-2xl">
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 px-6 pb-6 pt-7 sm:px-7">
          <div className="absolute -right-8 -top-12 h-32 w-32 rounded-full bg-violet-200/40 blur-2xl" />
          <DialogHeader className="relative space-y-2 pr-5">
            <span className="w-fit rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold tracking-[0.16em] text-violet-600">
              1 秒小调查
            </span>
            <DialogTitle className="text-[22px] font-bold tracking-tight text-slate-900">你是从哪里知道智简简历的？</DialogTitle>
            <DialogDescription className="text-sm leading-6 text-slate-500">
              选一个最接近的来源，帮助我们把简历工具做得更好。
            </DialogDescription>
          </DialogHeader>
        </div>

        {otherMode ? (
          <div className="space-y-4 p-6 sm:p-7">
            <div>
              <p className="text-base font-semibold text-slate-800">具体是从哪里知道的？</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">例如：B站、微博、同事分享、某篇文章……</p>
            </div>
            <input
              autoFocus
              value={otherDetail}
              onChange={(event) => setOtherDetail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitOther()
              }}
              maxLength={40}
              placeholder="请输入渠道名称"
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setOtherMode(false)
                  setOtherDetail('')
                }}
                className="h-11 flex-1 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 transition hover:border-violet-200 hover:text-violet-700"
              >
                返回渠道列表
              </button>
              <button
                type="button"
                disabled={!otherDetail.trim()}
                onClick={submitOther}
                className="h-11 flex-1 rounded-xl bg-violet-600 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-200"
              >
                提交
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 p-6 sm:p-7">
            {SOURCE_OPTIONS.map(({ value, label, note, iconSrc }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleSourceClick(value)}
                className="group flex min-h-[68px] items-center gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-left transition hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm transition group-hover:scale-105">
                  <img className="h-6 w-6 object-contain" src={iconSrc} alt="" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-700 group-hover:text-violet-700">{label}</span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">{note}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => complete('prefer_not_to_say', 'acquisition_source_skipped')}
          className="mx-auto mb-6 inline-flex items-center gap-1 text-xs text-slate-400 transition hover:text-slate-600 sm:mb-7"
        >
          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
          暂不选择
        </button>
      </DialogContent>
    </Dialog>
  )
}
