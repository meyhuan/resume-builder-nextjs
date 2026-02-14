/**
 * RightSidebar — Panel-based sidebar driven by the active toolbar action.
 *
 * Each panel has a title bar with a close (×) button.
 * The 排版美化 panel contains sub-tabs for template switching and theme settings.
 */
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { TemplateConfig } from '@/templates/template-loader'
import type { PanelId } from '@/ui/editor-toolbar'
import ThemePanel from '@/ui/theme-panel'
import { useAppStore } from '@/state/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Layout, Upload, Database, X } from 'lucide-react'
import SectionManager from '@/ui/section-manager'
import Image from 'next/image'
import { getTemplatesAction } from '@/app/admin/actions'

export interface RightSidebarProps {
  readonly activePanel: PanelId
  readonly onClose: () => void
  readonly theme: ThemeTokens
  readonly tpl: string
  readonly templates: TemplateConfig[]
  readonly onTplChange: (tpl: string) => void
  readonly onThemePatch: (patch: Partial<ThemeTokens>) => void
  readonly onePage?: boolean
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

/** Map panel IDs to display titles. */
const PANEL_TITLES: Record<PanelId, string> = {
  sections: '模块管理',
  layout: '排版美化',
  examples: '参考案例',
  photo: '证件照',
  analysis: '智能分析',
  ai: 'AI一键优化',
}

export default function RightSidebar(props: RightSidebarProps): ReactElement {
  const { activePanel, onClose, theme, tpl, templates } = props

  return (
    <div className="flex flex-col h-full bg-transparent">
      {/* Panel header */}
      {activePanel !== 'sections' && (
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">{PANEL_TITLES[activePanel]}</h2>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Panel content */}
      {activePanel === 'sections' && (
        <SectionManager onClose={onClose} />
      )}
      {activePanel === 'layout' && (
        <LayoutPanel
          theme={theme}
          tpl={tpl}
          templates={templates}
          onTplChange={props.onTplChange}
          onThemePatch={props.onThemePatch}
          onePage={props.onePage}
          onOnePageChange={props.onOnePageChange}
          onImportJson={props.onImportJson}
        />
      )}
      {activePanel === 'examples' && <PlaceholderPanel text="参考案例功能即将上线" />}
      {activePanel === 'photo' && <PlaceholderPanel text="证件照功能即将上线" />}
      {activePanel === 'analysis' && <PlaceholderPanel text="智能分析功能即将上线" />}
      {activePanel === 'ai' && <PlaceholderPanel text="AI一键优化功能即将上线" />}
    </div>
  )
}

/** Placeholder for panels not yet implemented. */
function PlaceholderPanel(props: { readonly text: string }): ReactElement {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <p className="text-sm text-slate-400">{props.text}</p>
    </div>
  )
}

/** 排版美化 panel — contains template grid + theme settings as sub-tabs. */
interface LayoutPanelProps {
  readonly theme: ThemeTokens
  readonly tpl: string
  readonly templates: TemplateConfig[]
  readonly onTplChange: (tpl: string) => void
  readonly onThemePatch: (patch: Partial<ThemeTokens>) => void
  readonly onePage?: boolean
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

function LayoutPanel(props: LayoutPanelProps): ReactElement {
  const { theme, tpl, templates } = props
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string>>({})

  useEffect(() => {
    async function fetchThumbnails(): Promise<void> {
      const res = await getTemplatesAction()
      if (res.success && res.data) {
        const map: Record<string, string> = {}
        for (const t of res.data) {
          if (t.thumbnail) {
            map[t.id] = t.thumbnail
          }
        }
        setThumbnailMap(map)
      }
    }
    fetchThumbnails()
  }, [])

  function handleImportClick(): void {
    const json = prompt('粘贴 JSON 简历数据：')
    if (json) {
      try {
        props.onImportJson?.(json)
      } catch (e) {
        alert(`导入失败: ${e}`)
      }
    }
  }

  return (
    <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 shrink-0">
        <TabsList className="w-full h-10 bg-slate-100/80 backdrop-blur-md rounded-xl p-1 gap-1 border border-slate-200/50">
          <TabsTrigger
            value="templates"
            className="flex-1 rounded-lg text-xs font-bold
              data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm
              text-slate-500 hover:text-slate-900"
          >
            切换模板
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 rounded-lg text-xs font-bold
              data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm
              text-slate-500 hover:text-slate-900"
          >
            排版设置
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Templates sub-tab */}
      <TabsContent value="templates" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
        <div className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-2 gap-4 pb-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className={`group relative cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden ${
                  tpl === template.id
                    ? 'border-violet-500 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5 bg-white'
                    : 'border-slate-100 bg-white hover:border-violet-200 hover:shadow-md hover:-translate-y-0.5'
                }`}
                onClick={(): void => props.onTplChange(template.id)}
              >
                <div className="aspect-[3/4] bg-slate-50 overflow-hidden relative">
                   {thumbnailMap[template.id] ? (
                     <Image
                       src={thumbnailMap[template.id]}
                       alt={template.name}
                       fill
                       className="object-cover transition-transform duration-500 group-hover:scale-105"
                       sizes="160px"
                     />
                   ) : (
                     <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                       <Layout className="w-10 h-10 opacity-30" />
                     </div>
                   )}
                   {tpl === template.id && (
                     <div className="absolute inset-0 bg-violet-600/5 transition-opacity" />
                   )}
                   {tpl === template.id && (
                     <div className="absolute top-2.5 right-2.5 w-6 h-6 bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                        <span className="text-[10px] font-bold">✓</span>
                     </div>
                   )}
                   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="px-3 py-2.5">
                  <div className="font-bold text-[11px] text-slate-800 line-clamp-1">{template.name}</div>
                  <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                    {template.tags?.[0] || '通用'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-white/60 backdrop-blur-md shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs font-bold h-10 bg-white rounded-xl border-slate-200 text-slate-600 hover:border-violet-200 hover:text-violet-600 hover:bg-violet-50 transition-all shadow-sm"
            onClick={handleImportClick}
          >
            <Upload className="h-3.5 w-3.5" />
            导入 JSON 简历
          </Button>
        </div>
      </TabsContent>

      {/* Settings sub-tab */}
      <TabsContent value="settings" className="flex-1 m-0 p-0 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
              <ThemePanel
                theme={theme}
                onUpdate={props.onThemePatch}
                onClose={() => {}}
                onePage={props.onePage}
                onOnePageChange={props.onOnePageChange}
              />
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 border-t border-slate-100 bg-white/60 backdrop-blur-md shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-xs font-bold h-10 bg-white rounded-xl border-slate-200 text-slate-600 hover:border-violet-200 hover:text-violet-600 hover:bg-violet-50 transition-all shadow-sm"
                onClick={() => {
                  if (window.confirm('加载测试数据将覆盖当前所有内容，确定吗？')) {
                    useAppStore.getState().loadTestData()
                  }
                }}
              >
                <Database className="h-3.5 w-3.5" />
                加载测试数据
              </Button>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
