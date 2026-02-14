import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Trash2, Clock, Sparkles, Wand2, ArrowLeft, FileDown } from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

export const metadata: Metadata = {
  title: '我的简历 - 管理你的所有简历',
  description: '在智简简历控制台管理你的所有简历，一键创建新简历，使用 AI 智能生成专业内容，免费导出高清 PDF。',
  robots: { index: false, follow: false },
};

// Server Action for creating a new resume
async function createResume() {
  "use server";
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  const resume = await prisma.resume.create({
    data: {
      title: "未命名简历",
      content: {},
      template: "simple",
      user: {
        connect: { wxId: userId }
      },
    },
  });
  return resume.id;
}

// Server Action for deleting
async function deleteResume(id: string) {
  "use server";
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) throw new Error("Unauthorized");
  await prisma.resume.delete({
    where: {
      id,
      user: { wxId: userId }
    }
  });
  revalidatePath("/dashboard");
}

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("auth_uid")?.value;
  if (!userId) {
    redirect('/login?redirect=/dashboard');
  }
  try {
    const resumes = await prisma.resume.findMany({
      where: { user: { wxId: userId } },
      orderBy: { updatedAt: "desc" },
    });
    return (
      <div className="min-h-screen bg-white relative">
        {/* Background Decorative Orbs Wrapper */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/10 rounded-full blur-[100px]" />
        </div>

        {/* Top Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-600 to-fuchsia-500" />

        {/* Nav Bar — Glassmorphism */}
        <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-slate-100 shadow-[0_4px_30px_rgba(0,0,0,0.03)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-violet-600 transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回首页</span>
              </Link>
              <div className="h-5 w-px bg-slate-200" />
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-500 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </span>
                我的简历
              </h1>
            </div>
            <form action={async () => {
              "use server"
              const id = await createResume();
              const { redirect } = await import("next/navigation");
              redirect(`/editor/${id}`);
            }}>
              <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-full shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105 transition-all duration-300 border-0 font-semibold px-6">
                <Plus className="w-4 h-4 mr-1.5" />
                新建简历
              </Button>
            </form>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Stats Overview */}
          <div className="flex flex-wrap items-center gap-6 mb-10">
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <FileText className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">{resumes.length}</div>
                <div className="text-xs text-slate-500">份简历</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-100 flex items-center justify-center">
                <Wand2 className="w-5 h-5 text-fuchsia-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">AI</div>
                <div className="text-xs text-slate-500">智能辅助</div>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <FileDown className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900">免费</div>
                <div className="text-xs text-slate-500">导出 PDF</div>
              </div>
            </div>
          </div>

          {/* Resume Grid */}
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              {/* Decorative ring */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-20 animate-pulse" />
                <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-lg">
                  <Sparkles className="w-10 h-10 text-violet-500" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">开启你的求职之旅</h2>
              <p className="text-slate-500 mb-10 max-w-md leading-relaxed">
                还没有简历？点击下方按钮，AI 将协助你<br />快速生成一份专业的求职简历。
              </p>
              <form action={async () => {
                "use server"
                const id = await createResume();
                const { redirect } = await import("next/navigation");
                redirect(`/editor/${id}`);
              }}>
                <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white rounded-full px-10 py-6 text-lg shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-105 transition-all duration-300 border-0 font-bold">
                  <Wand2 className="w-5 h-5 mr-2" />
                  AI 创建第一份简历
                </Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-7">
              {/* New Resume Card */}
              <form action={async () => {
                "use server"
                const id = await createResume();
                const { redirect } = await import("next/navigation");
                redirect(`/editor/${id}`);
              }}>
                <button className="w-full h-full min-h-[360px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-400 hover:bg-violet-50/30 transition-all duration-300 group flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-violet-600 cursor-pointer">
                  <div className="relative">
                    <div className="absolute inset-0 bg-violet-500 rounded-full blur-lg opacity-0 group-hover:opacity-20 transition-opacity duration-300" />
                    <div className="relative w-16 h-16 rounded-full bg-white border border-slate-200 group-hover:border-violet-300 group-hover:scale-110 transition-all duration-300 flex items-center justify-center shadow-sm">
                      <Plus className="w-7 h-7" />
                    </div>
                  </div>
                  <span className="font-semibold text-sm">新建空白简历</span>
                </button>
              </form>

              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-500 overflow-hidden flex flex-col"
                >
                  {/* Thumbnail */}
                  <Link href={`/editor/${resume.id}`} className="block relative aspect-[210/297] bg-slate-50 overflow-hidden cursor-pointer">
                    {resume.thumbnail ? (
                      <Image
                        src={resume.thumbnail}
                        alt={resume.title}
                        fill
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                        <FileText className="w-10 h-10 mb-2 opacity-40" />
                        <span className="text-[11px] text-slate-400">暂无预览</span>
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-violet-900/70 via-violet-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                      <span className="text-white text-sm font-semibold bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 shadow-sm">
                        点击编辑
                      </span>
                    </div>
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </Link>

                  {/* Card Info */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-800 text-base truncate flex-1" title={resume.title}>
                        {resume.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 uppercase tracking-wider border border-violet-100 shrink-0">
                        {resume.template || 'Default'}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-400 text-xs">
                      <Clock className="w-3.5 h-3.5 mr-1.5" />
                      <span>
                        {new Date(resume.updatedAt).toLocaleDateString('zh-CN', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                      <Link href={`/editor/${resume.id}`} className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
                        继续编辑 →
                      </Link>
                      <form action={deleteResume.bind(null, resume.id)}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                          title="删除简历"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center p-10 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-md relative z-10">
          <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">无法连接服务</h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">数据库连接失败，请稍后重试。</p>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-full px-6 border-slate-200 hover:border-violet-400 hover:text-violet-600 transition-colors">
              刷新页面
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}
