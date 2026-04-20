'use client'

import { useState, type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { ModuleEditShell } from '../_components/module-edit-shell'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { useCustomSections } from '@/features/edit/draft/use-custom-sections'

const PRESETS: readonly string[] = [
  '语言能力', '兴趣爱好', '社交媒体', '作品集链接', '推荐人', '发表论文', '志愿经历',
]

/**
 * Custom module list page. Users can create their own sections and edit each.
 */
export default function CustomListPage(): ReactElement {
  const router = useRouter()
  const { sections, addSection, removeSection } = useCustomSections()
  const [sheetOpen, setSheetOpen] = useState<boolean>(false)
  const [inputTitle, setInputTitle] = useState<string>('')
  const [removeId, setRemoveId] = useState<string | null>(null)

  const handleAdd = (title: string): void => {
    const trimmed: string = title.trim()
    if (!trimmed) {
      toast.error('请输入模块名称')
      return
    }
    if (sections.some((s) => s.title.replace(/\s/g, '') === trimmed.replace(/\s/g, ''))) {
      toast.error('该模块名称已存在')
      return
    }
    const id: string = addSection(trimmed)
    setSheetOpen(false)
    setInputTitle('')
    router.push(`/m/edit/custom/${id}`)
  }

  return (
    <ModuleEditShell title="自定义模块" subtitle="想展示什么，都可以放进来">
      {sections.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">✨</div>
          <div className="text-sm text-slate-500 mb-1">还没有自定义模块</div>
          <div className="text-xs text-slate-400">语言、兴趣、社交媒体…都可以自由添加</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sections.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={(): void => router.push(`/m/edit/custom/${s.id}`)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{s.title}</div>
                  <div className="mt-0.5 text-xs text-slate-500 truncate">
                    {s.blocks.length > 0 ? '已填写内容' : '暂未填写'}
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
              <button
                type="button"
                onClick={(): void => setRemoveId(s.id)}
                className="w-full py-2 text-xs text-rose-500 border-t border-slate-100 flex items-center justify-center gap-1 active:bg-rose-50"
              >
                <Trash2 size={12} /> 删除此模块
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={(): void => setSheetOpen(true)}
        className="w-full rounded-2xl border-2 border-dashed border-violet-300 bg-violet-50/40 py-4 flex items-center justify-center gap-2 text-violet-600 font-medium active:scale-[0.98] transition-transform"
      >
        <Plus size={16} />
        <span>添加自定义模块</span>
      </button>

      <BottomSheet
        open={sheetOpen}
        onClose={(): void => setSheetOpen(false)}
        title="新建模块"
        height="440px"
      >
        <div className="flex flex-col gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1.5 px-1">模块名称</div>
            <input
              type="text"
              value={inputTitle}
              onChange={(e): void => setInputTitle(e.target.value)}
              placeholder="例如：语言能力"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-[15px] outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-1.5 px-1">常用模块</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={(): void => handleAdd(p)}
                  className="px-3 py-1.5 rounded-full text-sm bg-slate-50 text-slate-700 border border-slate-200 hover:border-violet-300 active:scale-95 transition-all"
                >
                  + {p}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={(): void => handleAdd(inputTitle)}
            className="mt-2 w-full py-3 rounded-xl bg-violet-600 text-white text-sm font-medium active:scale-95 transition-transform"
          >
            创建模块
          </button>
        </div>
      </BottomSheet>

      {removeId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={(): void => setRemoveId(null)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-6 top-1/2 -translate-y-1/2 z-50 rounded-2xl bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-semibold text-slate-900">删除这个模块？</h3>
            <p className="mt-1.5 text-sm text-slate-500">删除后无法恢复，确定要删除吗？</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={(): void => setRemoveId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm active:scale-95 transition-transform"
              >
                取消
              </button>
              <button
                type="button"
                onClick={(): void => {
                  removeSection(removeId)
                  setRemoveId(null)
                  toast.success('已删除')
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-medium active:scale-95 transition-transform"
              >
                删除
              </button>
            </div>
          </div>
        </>
      )}
    </ModuleEditShell>
  )
}
