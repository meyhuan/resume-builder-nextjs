'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { toPng } from 'html-to-image'
import { getAllTemplates, type TemplateConfig } from '@/templates/template-loader'
import { TEST_RESUME_JSON } from '@/io/default-resume-data'
import { mapExternalResume } from '@/io/external-resume-importer'
import { upsertTemplateAction, getTemplatesAction } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Camera, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

// Helper to get theme for templates (using default values)
const DEFAULT_THEME = {
  primaryColor: '#111827',
  textColor: '#111827',
  fontFamily: 'Inter, Noto Sans SC, system-ui, sans-serif',
  fontSize: 14,
  lineHeight: 1.5,
  spacingScale: 1,
}

const testResumeData = mapExternalResume(TEST_RESUME_JSON)

export default function TemplateAdminPage() {
  const [dbTemplates, setDbTemplates] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const previewRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Load existing templates from DB
  useEffect(() => {
    async function load() {
      const res = await getTemplatesAction()
      if (res.success && res.data) {
        const map = res.data.reduce((acc: any, t: any) => {
          acc[t.id] = t
          return acc
        }, {})
        setDbTemplates(map)
      }
    }
    load()
  }, [])

  const handleCapture = async (template: TemplateConfig) => {
    const el = previewRefs.current[template.id]
    if (!el) return

    setLoading(template.id)
    try {
      // Small delay to ensure styles are applied
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const dataUrl = await toPng(el, {
        quality: 0.8,
        pixelRatio: 1, // Keep it smaller for thumbnails
        skipFonts: false,
      })

      const res = await upsertTemplateAction({
        id: template.id,
        name: template.name,
        description: template.description,
        thumbnail: dataUrl,
      })

      if (res.success) {
        setDbTemplates(prev => ({ ...prev, [template.id]: res.data }))
        toast.success(`${template.name} 快照已更新`)
      } else {
        toast.error('保存失败: ' + res.error)
      }
    } catch (err) {
      console.error(err)
      toast.error('捕获失败，请重试')
    } finally {
      setLoading(null)
    }
  }

  const templates = getAllTemplates()

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold">提示：</p>
          <p>点击“捕获快照”按钮，系统将使用测试数据渲染该模板并生成缩略图存入数据库。生成的图片将直接展示在用户端的模板选择列表中。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => {
          const TemplateComponent = template.component
          const dbData = dbTemplates[template.id]
          const isProcessing = loading === template.id

          return (
            <Card key={template.id} className="overflow-hidden flex flex-col border-2 transition-all hover:border-blue-200">
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{template.description}</p>
                  </div>
                  <Badge variant={dbData?.thumbnail ? "outline" : "secondary"} className="text-[10px]">
                    {dbData?.thumbnail ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" /> 已同步
                      </span>
                    ) : '未同步'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="p-0 bg-gray-200 relative aspect-[210/297] overflow-hidden">
                {/* 预览区域 - 缩小比例显示 */}
                <div className="absolute inset-0 origin-top-left scale-[0.2] w-[500%] h-[500%] pointer-events-none bg-white">
                  <div ref={el => { previewRefs.current[template.id] = el }} className="w-[210mm] mx-auto min-h-[297mm]">
                    <Suspense fallback={<div className="p-20 text-center text-4xl">Loading...</div>}>
                      <TemplateComponent resume={testResumeData} theme={DEFAULT_THEME} />
                    </Suspense>
                  </div>
                </div>
                
                {/* 遮罩层，防止交互影响捕获 */}
                <div className="absolute inset-0 z-10" />

                {isProcessing && (
                  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                      <p className="text-xs font-medium text-blue-600">正在捕获...</p>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-3 border-t bg-white gap-2">
                <Button 
                  size="sm" 
                  className="flex-1 gap-2" 
                  onClick={() => handleCapture(template)}
                  disabled={isProcessing}
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  捕获快照
                </Button>
                {dbData?.thumbnail && (
                  <Button size="sm" variant="outline" className="px-3" title="查看原图" onClick={() => {
                    const win = window.open()
                    win?.document.write(`<img src="${dbData.thumbnail}" style="max-width:100%">`)
                  }}>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
