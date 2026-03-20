/**
 * RightSidebar — Panel-based sidebar driven by the active toolbar action.
 *
 * Each panel has a title bar with a close (×) button.
 * The Layout panel contains sub-tabs for template switching and theme settings.
 */
import type { ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { OnePageStatus } from '@/hooks/use-one-page-mode'
import type { TemplateConfig } from '@/templates/template-loader'
import type { PanelId } from '@/ui/editor-toolbar'
import ThemePanel from '@/ui/theme-panel'
import { useAppStore } from '@/state/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Layout, Upload, Database, X } from 'lucide-react'
import SectionManager from '@/ui/section-manager'
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
  sections: 'Sections',
  layout: 'Layout',
  examples: 'Examples',
  photo: 'Photo',
  analysis: 'Analysis',
  ai: 'AI Optimize',
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
            aria-label="Close sidebar"
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
      {activePanel === 'examples' && <PlaceholderPanel text="Examples coming soon" />}
      {activePanel === 'photo' && <PlaceholderPanel text="Photo feature coming soon" />}
      {activePanel === 'analysis' && <PlaceholderPanel text="Analysis feature coming soon" />}
      {activePanel === 'ai' && <PlaceholderPanel text="AI Optimize feature coming soon" />}
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

/** Layout panel — contains template grid + theme settings as sub-tabs. */
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

  function handleImportClick(): void {
    const json = prompt('Paste JSON resume data:')
    if (json) {
      try {
        props.onImportJson?.(json)
      } catch (e) {
        alert(`Import failed: ${e}`)
      }
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
            Templates
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex-1 rounded-xl text-sm font-semibold
              data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-sm
              text-slate-500 hover:text-slate-700 transition-all"
          >
            Settings
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
                aria-label={`Select template ${template.name}`}
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
                    {template.tags?.[0] || 'General'}
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
            Import JSON Resume
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
              />
            </div>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 border-t border-slate-200 bg-white shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 text-sm font-semibold h-11 bg-slate-50 rounded-xl border-slate-200 shadow-none text-slate-700 hover:border-slate-300 hover:text-slate-900 hover:bg-white transition-all"
                onClick={() => {
                  if (window.confirm('Loading test data will overwrite all current content. Are you sure?')) {
                    useAppStore.getState().loadTestData()
                  }
                }}
              >
                <Database className="h-3.5 w-3.5" />
                Load Test Data
              </Button>
            </div>
          )}
        </div>
      </TabsContent>
    </Tabs>
  )
}
