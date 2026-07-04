import type { Metadata } from 'next'
import { BadgeCheck, Clock3, Code2, GitCommitHorizontal, Monitor, Server } from 'lucide-react'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { LandingHeader } from '@/components/landing/LandingHeader'
import { getReleaseInfo, type ReleaseInfo } from '@/lib/release-info'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata: Metadata = {
  title: '版本信息 - 智简简历',
  description: '查看智简简历 PC Web 当前线上 NextJS 发布版本。',
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

function VersionRow({
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
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-slate-500">{label}</div>
        <div
          className={`mt-1 break-all text-base font-semibold text-slate-900 ${
            mono ? 'font-mono text-sm' : ''
          }`}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

function VersionPanel({ release }: { release: ReleaseInfo }): React.ReactElement {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <VersionRow icon={<BadgeCheck size={18} />} label="发布版本" value={release.releaseId} mono />
        <VersionRow icon={<Code2 size={18} />} label="Next.js 版本" value={release.nextVersion} mono />
        <VersionRow icon={<GitCommitHorizontal size={18} />} label="Git Commit" value={release.commit} mono />
        <VersionRow icon={<Clock3 size={18} />} label="发布时间" value={formatDateTime(release.createdAt)} />
        <VersionRow icon={<Server size={18} />} label="版本来源" value={release.source} mono />
      </div>
    </div>
  )
}

export default async function VersionPage(): Promise<React.ReactElement> {
  const release = await getReleaseInfo()

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LandingHeader forceSolid />

      <main className="flex-1 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Monitor size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">PC Web 版本信息</h1>
              <p className="mt-1 text-sm text-slate-500">当前 NextJS 线上发布版本</p>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="text-sm text-slate-500">服务</div>
                <div className="mt-1 text-lg font-semibold text-slate-950">{release.service}</div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                <Code2 size={20} />
              </div>
            </div>

            <VersionPanel release={release} />

            <div className="mt-5 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-100">
              /next-api/version
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
