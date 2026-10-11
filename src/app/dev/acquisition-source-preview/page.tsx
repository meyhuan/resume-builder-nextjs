import { AcquisitionSourceDialog } from '@/components/analytics/AcquisitionSourceDialog'

export default function AcquisitionSourcePreviewPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 shadow-sm">
        <p className="text-sm text-slate-500">PC 端渠道来源弹窗预览</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">登录后的工作台</h1>
      </div>
      <AcquisitionSourceDialog userId="preview-user-v3" />
    </main>
  )
}
