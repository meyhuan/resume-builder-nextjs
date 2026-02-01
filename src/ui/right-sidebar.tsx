/**
 * RightSidebar with Dynamic Template Support
 * Redesigned with shadcn/ui components for professional appearance
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { TemplateConfig } from '@/templates/template-loader'
import ThemePanel from '@/ui/theme-panel'
import { useAppStore } from '@/state/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Palette, Layout, Upload, Search, Database } from 'lucide-react'
import { Input } from '@/components/ui/input'

export interface RightSidebarProps {
  readonly theme: ThemeTokens
  readonly tpl: string
  readonly templates: TemplateConfig[]
  readonly onTplChange: (tpl: string) => void
  readonly onThemePatch: (patch: Partial<ThemeTokens>) => void
  readonly onePage?: boolean
  readonly onOnePageChange?: (v: boolean) => void
  readonly onImportJson?: (json: string) => void
}

export default function RightSidebar(props: RightSidebarProps): ReactElement {
  const { theme, tpl, templates } = props
  const [searchTag, setSearchTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  // 获取所有标签
  const allTags = Array.from(
    new Set(templates.flatMap((t) => t.tags || []))
  ).sort()

  // 过滤模板
  const filteredTemplates = templates.filter((t) => {
    const matchesTag = !searchTag || t.tags?.includes(searchTag)
    const matchesQuery = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTag && matchesQuery
  })

  return (
    <div className="flex flex-col h-full bg-white border-none shadow-none">
      <Tabs defaultValue="templates" className="flex-1 flex flex-col">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-gray-50/50 rounded-none border-b shrink-0 px-1">
          <TabsTrigger value="templates" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Layout className="h-4 w-4" />
            <span className="font-medium">布局模板</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Palette className="h-4 w-4" />
            <span className="font-medium">主题样式</span>
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 flex flex-col m-0 p-0 overflow-hidden">
          <div className="p-4 space-y-4 shrink-0 border-b bg-white/50 backdrop-blur-sm">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="搜索模板名称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-none focus-visible:ring-1 focus-visible:ring-primary/20"
              />
            </div>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <Badge
                  variant={!searchTag ? 'default' : 'secondary'}
                  className="cursor-pointer px-2.5 py-0.5 text-[11px] font-medium transition-all hover:bg-primary/90"
                  onClick={() => setSearchTag('')}
                >
                  全部
                </Badge>
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={searchTag === tag ? 'default' : 'secondary'}
                    className="cursor-pointer px-2.5 py-0.5 text-[11px] font-medium transition-all hover:bg-primary/90"
                    onClick={() => setSearchTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 px-4 py-4 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-3 pb-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`group relative cursor-pointer rounded-xl border p-1 transition-all duration-200 ${
                    tpl === template.id
                      ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5'
                      : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={(): void => props.onTplChange(template.id)}
                >
                  <div className="aspect-[3/4] rounded-lg bg-gray-100 mb-2 overflow-hidden border border-gray-100 relative">
                     {/* Placeholder for template thumbnail if added later */}
                     <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                        <Layout className="w-8 h-8 opacity-20" />
                     </div>
                     {tpl === template.id && (
                       <div className="absolute top-2 right-2 w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] shadow-sm animate-in zoom-in duration-300">
                          ✓
                       </div>
                     )}
                  </div>
                  <div className="px-1 py-1">
                    <div className="font-bold text-xs text-gray-800 line-clamp-1">{template.name}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                      {template.tags?.[0] || '通用'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-gray-200" />
                </div>
                <p className="text-sm text-gray-400">未找到相关模板</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-gray-50/50 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs font-medium h-9 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              onClick={handleImportClick}
            >
              <Upload className="h-3.5 w-3.5" />
              导入 JSON 简历
            </Button>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 m-0 p-0 overflow-hidden">
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-4">
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
              <div className="p-4 border-t bg-gray-50/50 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 text-xs font-medium h-9 bg-white border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600 transition-all shadow-sm"
                  onClick={() => {
                    if (window.confirm('加载测试数据将覆盖当前所有内容，确定吗？')) {
                      useAppStore.getState().loadTestData()
                    }
                  }}
                >
                  <Database className="h-3.5 w-3.5" />
                  加载测试数据 (袁观环)
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
