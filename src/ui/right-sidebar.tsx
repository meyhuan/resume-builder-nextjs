/**
 * RightSidebar with Dynamic Template Support
 * Redesigned with shadcn/ui components for professional appearance
 */
import { useState } from 'react'
import type { ReactElement } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { TemplateConfig } from '@/templates/template-loader'
import ThemePanel from '@/ui/theme-panel'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Layout, Settings, Upload } from 'lucide-react'

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

  function handleImportClick(): void {
    const json = prompt('粘贴JSON简历数据：')
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
  const filteredTemplates = searchTag
    ? templates.filter((t) => t.tags?.includes(searchTag))
    : templates

  return (
    <Card className="print:hidden w-full">
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="templates" className="gap-2">
            <Layout className="h-4 w-4" />
            Templates
            <Badge variant="secondary" className="text-xs">
              {templates.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4 p-4">
          {/* Tag Filter */}
          {allTags.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Filter by tag</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={!searchTag ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSearchTag('')}
                >
                  All
                </Badge>
                {allTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={searchTag === tag ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSearchTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <Separator />
            </div>
          ) : null}

          {/* Template Grid */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Available templates ({filteredTemplates.length})
            </p>
            <div className="grid grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
              {filteredTemplates.map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    tpl === template.id
                      ? 'ring-2 ring-primary shadow-sm'
                      : 'hover:ring-1 hover:ring-border'
                  }`}
                  onClick={(): void => props.onTplChange(template.id)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="font-medium text-sm">{template.name}</div>
                    {template.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    ) : null}
                    {template.tags && template.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No templates found
            </div>
          ) : null}

          <Separator />

          {/* Import Button */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleImportClick}
          >
            <Upload className="h-4 w-4" />
            Import JSON Resume
          </Button>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="p-4">
          <ThemePanel
            theme={theme}
            onUpdate={props.onThemePatch}
            onClose={() => {
              // No close action needed with tabs
            }}
            onePage={props.onePage}
            onOnePageChange={props.onOnePageChange}
          />
        </TabsContent>
      </Tabs>
    </Card>
  )
}
