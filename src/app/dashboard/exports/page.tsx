import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Clock, Download, ExternalLink, FileText, RefreshCw } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: '导出记录 - 智简简历',
  description: '查看和下载已导出的简历文件。',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getTypeLabel(type: string): string {
  if (type === 'pdf') return 'PDF';
  if (type === 'image') return '图片';
  if (type === 'markdown') return 'Markdown';
  return type.toUpperCase();
}

export default async function DashboardExportsPage(): Promise<React.ReactElement> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value;
  if (!wxId) {
    redirect('/login?redirect=/dashboard/exports');
  }

  const now = new Date();
  await prisma.exportRecord.updateMany({
    where: {
      wxId,
      status: 'available',
      expiresAt: { lt: now },
    },
    data: { status: 'expired' },
  });

  const records = await prisma.exportRecord.findMany({
    where: { wxId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      resumeId: true,
      resumeTitle: true,
      templateId: true,
      type: true,
      fileName: true,
      token: true,
      expiresAt: true,
      status: true,
      createdAt: true,
    },
  });

  const availableCount = records.filter((record) => (
    record.status === 'available' && record.expiresAt.getTime() > now.getTime()
  )).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-8 sm:px-10 lg:px-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">导出记录</h1>
          <p className="mt-2 text-sm text-slate-500">
            已确认导出的文件会保存在这里，方便你重新下载或回到原简历继续编辑。
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:w-[280px]">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs text-slate-500">全部记录</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{records.length}</div>
          </div>
          <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 shadow-sm">
            <div className="text-xs text-violet-600">可下载</div>
            <div className="mt-1 text-2xl font-semibold text-violet-700">{availableCount}</div>
          </div>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">还没有导出记录</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
            从编辑器完成 PDF 或图片导出后，记录会自动出现在这里。
          </p>
          <Link href="/dashboard" className="mt-6">
            <Button className="rounded-lg bg-violet-600 px-6 text-white hover:bg-violet-700">
              返回我的简历
            </Button>
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.7fr] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium text-slate-500">
            <div>简历</div>
            <div>格式</div>
            <div>导出时间</div>
            <div>有效期</div>
            <div className="text-right">操作</div>
          </div>
          <div className="divide-y divide-slate-100">
            {records.map((record) => {
              const available = record.status === 'available' && record.expiresAt.getTime() > now.getTime();
              return (
                <div
                  key={record.id}
                  className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.9fr_0.7fr] items-center gap-4 px-5 py-4 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900" title={record.resumeTitle}>
                      {record.resumeTitle || record.fileName}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span className="truncate">{record.fileName}</span>
                      {record.templateId ? <span>模板 {record.templateId}</span> : null}
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                      {getTypeLabel(record.type)}
                    </span>
                  </div>
                  <div className="text-slate-500">{formatDate(record.createdAt)}</div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>{available ? formatDate(record.expiresAt) : '已过期'}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    {available ? (
                      <Link
                        href={`/next-api/export-file/${record.token}`}
                        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-medium text-white transition-colors hover:bg-violet-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        下载
                      </Link>
                    ) : (
                      <span className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-medium text-slate-400">
                        <RefreshCw className="h-3.5 w-3.5" />
                        需重导
                      </span>
                    )}
                    <Link
                      href={`/editor/${record.resumeId}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-violet-200 hover:text-violet-600"
                      aria-label="编辑原简历"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
