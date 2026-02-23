import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Clock, Sparkles, Wand2, ArrowLeft, FileDown } from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import { defaultResume } from "@/state/store";
import { DeleteResumeButton } from "@/components/dashboard/delete-resume-button";

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
      content: JSON.parse(JSON.stringify(defaultResume)),
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
      <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden">
        {/* Background Decorative Orbs Wrapper - Glassmorphism base */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#8B5CF6]/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[120px]" />
        </div>

        {/* Nav Bar — Glassmorphism */}
        <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-xl border-b border-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2 text-slate-500 hover:text-[#8B5CF6] transition-colors text-sm font-medium">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">返回首页</span>
              </Link>
              <div className="h-4 w-px bg-slate-200" />
              <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center shadow-sm">
                  <FileText className="w-4 h-4 text-white" />
                </span>
                我的简历
              </h1>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Action Cards Overview */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10 w-full md:w-[70%] lg:w-[55%] xl:w-[45%]">
            {/* AI生成简历 */}
            <div className="rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 p-[1px] shadow-sm hover:shadow-md transition-shadow h-[84px]">
              <Link href="/ai" className="flex flex-col items-center justify-center gap-1.5 bg-white/90 backdrop-blur-md rounded-[11px] h-full hover:bg-white/60 transition-colors">
                <Wand2 className="w-5 h-5 text-fuchsia-500" />
                <span className="text-xs sm:text-[13px] font-medium text-slate-800">AI生成简历</span>
              </Link>
            </div>
            
            {/* 创建新简历 */}
            <form action={async () => {
              "use server"
              const id = await createResume();
              const { redirect } = await import("next/navigation");
              redirect(`/editor/${id}`);
            }} className="w-full h-[84px]">
              <button type="submit" className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-slate-50 shadow-sm hover:shadow-md transition-all">
                <Plus className="w-6 h-6 text-slate-700 font-light" />
                <span className="text-xs sm:text-[13px] font-medium text-slate-800">创建新简历</span>
              </button>
            </form>

            {/* 导入简历 */}
            <button type="button" className="w-full h-[84px] flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 hover:bg-slate-50 shadow-sm transition-all opacity-80 cursor-not-allowed" title="暂未开放">
              <FileDown className="w-5 h-5 text-slate-700" />
              <span className="text-xs sm:text-[13px] font-medium text-slate-800">导入简历</span>
            </button>
          </div>

          {/* Resume Grid */}
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm text-center">
              <div className="w-20 h-20 bg-[#F5F3FF] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">开启求职之旅</h2>
              <p className="text-slate-500 mb-8 max-w-sm text-sm leading-relaxed">
                你还没有创建过简历。点击下方按钮，让 AI 协助你快速生成一份专业出彩的求职简历。
              </p>
              <Link href="/ai">
                <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg px-8 py-5 text-base shadow-sm transition-all duration-200 font-medium">
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI 创建简历
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* New Resume Card */}
              <form action={async () => {
                "use server"
                const id = await createResume();
                const { redirect } = await import("next/navigation");
                redirect(`/editor/${id}`);
              }}>
                <button className="w-full h-[280px] bg-white/40 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 hover:border-[#8B5CF6] hover:bg-white/80 transition-all duration-200 group flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-[#8B5CF6]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-[#F5F3FF] flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm">新建空白简历</span>
                </button>
              </form>

              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="group relative bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col h-[280px] overflow-hidden"
                >
                  {/* Thumbnail Container */}
                  <Link href={`/editor/${resume.id}`} className="block relative flex-1 bg-slate-50 border-b border-slate-100 overflow-hidden">
                    {resume.thumbnail ? (
                      <Image
                         src={resume.thumbnail}
                         alt={resume.title}
                         fill
                         className="object-cover object-top"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium">暂无预览</span>
                      </div>
                    )}
                    {/* Flat Glass Overlay on Hover */}
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="bg-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm">
                        编辑简历
                      </span>
                    </div>
                  </Link>

                  {/* Card Info - Flat */}
                  <div className="p-4 bg-white flex flex-col gap-3 shrink-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-slate-800 text-sm truncate flex-1" title={resume.title}>
                        {resume.title}
                      </h3>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 shrink-0">
                        {resume.template || 'Default'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-slate-400 text-xs">
                        <Clock className="w-3.5 h-3.5 mr-1" />
                        <span className="truncate max-w-[100px]">
                          {new Date(resume.updatedAt).toLocaleDateString('zh-CN', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <DeleteResumeButton onDelete={async () => {
                        "use server"
                        await deleteResume(resume.id)
                      }} />
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
