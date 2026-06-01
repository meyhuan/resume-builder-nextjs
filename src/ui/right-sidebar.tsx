/**
 * RightSidebar — Panel-based sidebar driven by the active toolbar action.
 *
 * Each panel has a title bar with a close (×) button.
 * The 排版美化 panel contains sub-tabs for template switching and theme settings.
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import type { TemplateConfig } from '@/templates/template-loader'
import type { PanelId } from '@/ui/editor-toolbar'
import ThemePanel from '@/ui/theme-panel'
import { useAppStore } from '@/state/store'
import { RESUME_SCENARIOS } from '@/dev/resume-scenarios'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Layout, Upload, Database, X } from 'lucide-react'
import SectionManager from '@/ui/section-manager'
import AiOptimizePanel from '@/ui/ai-optimize-panel'
import Image from 'next/image'

export interface RightSidebarProps {
  readonly activePanel: PanelId
  readonly onClose: () => void
  readonly theme: ThemeTokens
  readonly tpl: string
  readonly templates: TemplateConfig[]
  readonly onTplChange: (tpl: string) => void
  readonly onThemePatch: (patch: Partial<ThemeTokens>) => void
  readonly onePage?: boolean
  readonly onePageStatus?: OnePageStatus
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

/** Map panel IDs to display titles. */
const PANEL_TITLES: Record<PanelId, string> = {
  sections: '模块管理',
  layout: '排版美化',
  ai: 'AI一键优化',
  // examples: '参考案例',
  // photo: '证件照',
  // analysis: '智能分析',
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
            aria-label="关闭侧边栏"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
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
          onePageStatus={props.onePageStatus}
          onOnePageChange={props.onOnePageChange}
          onImportJson={props.onImportJson}
        />
      )}
      {activePanel === 'ai' && <AiOptimizePanel />}
      {/* {activePanel === 'examples' && <PlaceholderPanel text="参考案例功能即将上线" />} */}
      {/* {activePanel === 'photo' && <PlaceholderPanel text="证件照功能即将上线" />} */}
      {/* {activePanel === 'analysis' && <PlaceholderPanel text="智能分析功能即将上线" />} */}
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
  readonly onePageStatus?: OnePageStatus
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

function LayoutPanel(props: LayoutPanelProps): ReactElement {
  const { theme, tpl, templates } = props
  const [scenarioId, setScenarioId] = useState(RESUME_SCENARIOS[0]?.id ?? '')
  const selectedScenario = RESUME_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? RESUME_SCENARIOS[0]

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

  function handleLoadScenario(): void {
    if (!selectedScenario) return
    if (window.confirm(`加载「${selectedScenario.name}」将覆盖当前所有内容，确定吗？`)) {
      useAppStore.getState().loadScenarioData(selectedScenario.resume)
    }
  }

  return (
    <Tabs defaultValue="templates" className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 shrink-0">
        <TabsList className="w-full h-11 rounded-2xl p-1 gap-1 border border-slate-200 bg-slate-50 shadow-sm">
          <TabsTrigger
            value="templates"
            className="flex-1 rounded-xl text-sm font-semibold
              data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm
              text-slate-500 hover:text-slate-700 transition-all"
          >
            切换模板
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 rounded-xl text-sm font-semibold
              data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm
              text-slate-500 hover:text-slate-700 transition-all"
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
              <button
                key={template.id}
                type="button"
                aria-pressed={tpl === template.id}
                aria-label={`选择模板 ${template.name}`}
                className={`group relative cursor-pointer rounded-xl border transition-all duration-200 overflow-hidden ${
                  tpl === template.id
                    ? 'border-violet-500 ring-2 ring-violet-100 shadow-sm bg-white'
                    : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-md'
                }`}
                onClick={(): void => props.onTplChange(template.id)}
              >
                <div className="aspect-[3/4] bg-slate-50 overflow-hidden relative border-b border-slate-100">
                  {template.preview ? (
                    <Image
                      src={template.preview}
                      alt={template.name}
                      fill
                      className="object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      sizes="160px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-200">
                      <Layout className="w-8 h-8 opacity-40" />
                    </div>
                  )}
                  {tpl === template.id && (
                    <div className="absolute inset-0 bg-violet-500/5 transition-opacity" />
                  )}
                  {tpl === template.id && (
                    <div className="absolute top-2 right-2 w-7 h-7 bg-violet-500 text-white rounded-full flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" className="w-3 h-3">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l3.5 3.5a.3.3 0 0 0 .42-.02L13 5" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3 bg-white text-left">
                  <div className="font-semibold text-[15px] leading-5 text-slate-800 line-clamp-1">{template.name}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">
                    {template.tags?.[0] || '通用'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 bg-white shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-sm font-semibold h-11 bg-slate-50 rounded-xl border-slate-200 shadow-none text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-white transition-all"
            onClick={handleImportClick}
          >
            <Upload className="h-4 w-4" />
            导入 JSON 简历
          </Button>
        </div>
      </TabsContent>

      {/* Settings sub-tab */}
      <TabsContent value="settings" className="flex-1 m-0 p-0 overflow-hidden">
        <div className="h-full flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            <div className="bg-transparent overflow-hidden">
              <ThemePanel
                theme={theme}
                onUpdate={props.onThemePatch}
                onClose={() => {}}
                onePage={props.onePage}
                onePageStatus={props.onePageStatus}
                onOnePageChange={props.onOnePageChange}
                locksPrimaryColor={templates.find((t) => t.id === tpl)?.locksPrimaryColor}
                activeTemplateName={templates.find((t) => t.id === tpl)?.name}
              />
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-3 p-4 border-t border-slate-200 bg-white shrink-0">
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-slate-700">模板测试数据</div>
                <select
                  value={scenarioId}
                  onChange={(event) => setScenarioId(event.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-white focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
                >
                  {RESUME_SCENARIOS.map((scenario) => (
                    <option key={scenario.id} value={scenario.id}>
                      {scenario.name}
                    </option>
                  ))}
                </select>
                {selectedScenario ? (
                  <p className="text-[11px] leading-4 text-slate-500">{selectedScenario.description}</p>
                ) : null}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-sm font-semibold h-11 bg-slate-50 rounded-xl border-slate-200 shadow-none text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-white transition-all"
                onClick={handleLoadScenario}
              >
                <Database className="h-3.5 w-3.5" />
                加载场景数据
              </Button>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
