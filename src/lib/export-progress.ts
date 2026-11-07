export const EXPORT_PROGRESS = {
  saving: '正在保存最新简历…',
  preparing: '正在准备预览…',
  generating: '正在生成 Word 文件…',
  queued: '预览任务排队中，请稍候…',
  warming: '正在启动 Word 预览服务，首次使用需要稍等…',
  converting: '正在排版 Word 文档…',
  rendering: '正在生成分页预览…',
  cached: '已找到相同内容的预览，正在加载…',
  storing: '正在准备预览文件…',
  loading: '正在加载预览图片…',
} as const
export type ExportProgressStage = keyof typeof EXPORT_PROGRESS
export type ExportProgressListener = (stage: ExportProgressStage) => void
