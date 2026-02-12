import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: '我的简历 - 管理你的所有简历',
  description: '在智简简历控制台管理你的所有简历，一键创建新简历，使用 AI 智能生成专业内容，免费导出高清 PDF。',
  robots: { index: false, follow: false },
};
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { FileText, Plus, Trash2, Clock, Sparkles, Layout } from "lucide-react";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";

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
     // Fetch resumes for the logged-in user
    const resumes = await prisma.resume.findMany({
        where: { user: { wxId: userId } },
        orderBy: { updatedAt: "desc" },
    });

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-violet-600 to-fuchsia-600" />
      
      {/* Content Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-20">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-12 text-white">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Layout className="w-6 h-6" />
              </span>
              我的简历
            </h1>
            <p className="mt-2 text-violet-100 opacity-90">管理你的所有简历，随时编辑、导出</p>
          </div>
          <form action={async () => {
            "use server"
            const id = await createResume();
            const { redirect } = await import("next/navigation");
            redirect(`/editor/${id}`);
          }}>
            <Button size="lg" className="bg-white text-violet-700 hover:bg-white/90 shadow-xl shadow-violet-900/20 font-bold rounded-xl border-0">
              <Plus className="w-5 h-5 mr-2" />
              新建简历
            </Button>
          </form>
        </header>

        {/* Resume Grid */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[32px] p-8 shadow-xl border border-white/60 min-h-[600px]">
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[400px] text-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <div className="w-20 h-20 bg-violet-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Sparkles className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">开启你的求职之旅</h3>
              <p className="text-slate-500 mb-8 max-w-md">暂无简历。点击上方按钮，AI 将协助你快速生成一份专业简历。</p>
              <form action={async () => {
                  "use server"
                  const id = await createResume();
                  const { redirect } = await import("next/navigation");
                  redirect(`/editor/${id}`);
                }}>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-violet-500/30">
                    <Plus className="w-5 h-5 mr-2" />
                    立即创建第一份简历
                  </Button>
              </form>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {/* Add New Card (as first item) */}
              <form action={async () => {
                "use server"
                const id = await createResume();
                const { redirect } = await import("next/navigation");
                redirect(`/editor/${id}`);
              }}>
                <button className="w-full h-full min-h-[320px] rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-400 hover:bg-violet-50/50 transition-all group flex flex-col items-center justify-center gap-4 text-slate-400 hover:text-violet-600">
                  <div className="w-16 h-16 rounded-full bg-white border border-slate-200 group-hover:border-violet-300 group-hover:scale-110 transition-all flex items-center justify-center shadow-sm">
                    <Plus className="w-8 h-8" />
                  </div>
                  <span className="font-semibold">新建空白简历</span>
                </button>
              </form>

              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="group relative bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  <Link href={`/editor/${resume.id}`} className="block relative aspect-[210/297] bg-slate-100 overflow-hidden cursor-pointer">
                    {resume.thumbnail ? (
                      <Image 
                        src={resume.thumbnail} 
                        alt={resume.title} 
                        fill 
                        className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                        <FileText className="w-12 h-12 mb-2 opacity-50" />
                        <span className="text-xs">暂无预览</span>
                      </div>
                    )}
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                      <span className="text-white text-sm font-medium bg-white/20 backdrop-blur px-3 py-1 rounded-full border border-white/30">
                        点击编辑
                      </span>
                    </div>
                  </Link>
                  
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-slate-800 text-lg truncate flex-1" title={resume.title}>
                        {resume.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-violet-50 text-violet-600 uppercase tracking-wider border border-violet-100">
                        {resume.template || 'Default'}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-slate-400 text-xs mb-4">
                      <Clock className="w-3.5 h-3.5 mr-1" />
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

                    <div className="mt-auto pt-4 border-t border-slate-50 flex justify-end">
                      <form action={deleteResume.bind(null, resume.id)}>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50"
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
    </div>
  );
  } catch {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
              <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                 <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">无法连接服务</h3>
              <p className="text-slate-500 text-sm mb-6">数据库连接失败，请稍后重试。</p>
              <Button variant="outline" onClick={() => window.location.reload()}>刷新页面</Button>
            </div>
          </div>
      )
  }
}
