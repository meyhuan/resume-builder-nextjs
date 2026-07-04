import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, BadgeCheck, Clock3, GitCommitHorizontal, Server, Smartphone } from 'lucide-react'
import { getReleaseInfo, type ReleaseInfo } from '@/lib/release-info'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: '版本信息 - 智简简历',
  description: '查看智简简历小程序端当前 NextJS 发布版本。',
  robots: {
    index: false,
    follow: false,
  },
}

function formatDateTime(value: string | null): string {
  if (!value) return '未记录'

  try {
    return new Intl.DateTimeFormat('zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'medium',
      hour12: false,
      timeZone: 'Asia/Shanghai',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function MobileVersionRow({
  icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
}): React.ReactElement {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-400">{label}</div>
        <div
          className={`mt-1 break-all text-sm font-semibold text-slate-900 ${
            mono ? 'font-mono text-xs leading-5' : ''
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function MobileVersionCard({ release }: { release: ReleaseInfo }): React.ReactElement {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <BadgeCheck size={19} />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-bold text-slate-900">{release.service}</div>
          <div className="mt-0.5 font-mono text-xs text-slate-400">{release.releaseId}</div>
        </div>
      </div>

      <div className="rounded-xl bg-slate-50 px-4">
        <MobileVersionRow icon={<BadgeCheck size={17} />} label="发布版本" value={release.releaseId} mono />
        <MobileVersionRow icon={<Smartphone size={17} />} label="Next.js 版本" value={release.nextVersion} mono />
        <MobileVersionRow icon={<GitCommitHorizontal size={17} />} label="Git Commit" value={release.commit} mono />
        <MobileVersionRow icon={<Clock3 size={17} />} label="发布时间" value={formatDateTime(release.createdAt)} />
        <MobileVersionRow icon={<Server size={17} />} label="版本来源" value={release.source} mono />
      </div>
    </div>
  )
}

export default async function MobileVersionPage(): Promise<React.ReactElement> {
  const release = await getReleaseInfo()

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur">
        <Link
          href="/m"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="text-sm font-semibold text-slate-800">版本信息</div>
        <div className="w-9" />
      </div>

      <main className="px-5 py-6 pb-12">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Smartphone size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">小程序端版本</h1>
            <p className="mt-1 text-xs text-slate-500">当前 NextJS 线上发布版本</p>
          </div>
        </div>

        <MobileVersionCard release={release} />

        <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 font-mono text-[11px] leading-5 text-slate-100">
          /next-api/version
        </div>
      </main>
    </div>
  )
}
