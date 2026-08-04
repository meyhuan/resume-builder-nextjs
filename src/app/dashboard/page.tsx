import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  FileDown,
  FileText,
  Plus,
  Sparkles,
  Wand2,
} from "lucide-react";

import { ResumeCardActions } from "@/components/dashboard/resume-card-actions";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  createResume,
  deleteResume,
  duplicateResume,
  renameResume,
} from "./actions";

export const metadata: Metadata = {
  title: "我的简历 - 管理你的所有简历",
  description:
    "在智简简历控制台管理你的所有简历，一键创建空白简历，使用 AI 智能生成专业内容，免费制作一份可投递简历。",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function getErrorInfo(message: string): {
  title: string;
  description: string;
  code: string;
} {
  if (
    message.includes("P1001") ||
    message.includes("Can't reach database") ||
    message.includes("ECONNREFUSED")
  ) {
    return {
      title: "服务器暂时不可用",
      description: "数据库服务未响应，可能正在重启，请稍等片刻后刷新重试。",
      code: "ERR_DB_CONNECT",
    };
  }
  if (message.includes("P1002") || message.includes("timed out")) {
    return {
      title: "连接超时",
      description:
        "服务器响应超时，可能是网络波动或服务器负载过高，请稍后重试。",
      code: "ERR_DB_TIMEOUT",
    };
  }
  if (message.includes("P1008")) {
    return {
      title: "操作超时",
      description: "数据库操作耗时过长，请刷新页面重试。",
      code: "ERR_DB_OP_TIMEOUT",
    };
  }
  if (
    message.includes("P1017") ||
    message.includes("Server has closed the connection")
  ) {
    return {
      title: "连接已断开",
      description: "与数据库的连接已断开，请刷新页面重新连接。",
      code: "ERR_DB_CLOSED",
    };
  }
  if (message.includes("P2002") || message.includes("Unique constraint")) {
    return {
      title: "数据冲突",
      description: "操作与现有数据冲突，请刷新页面后重试。",
      code: "ERR_DB_CONFLICT",
    };
  }
  if (
    message.includes("P2025") ||
    message.includes("Record to update not found")
  ) {
    return {
      title: "数据不存在",
      description: "请求的简历数据不存在，可能已被删除。",
      code: "ERR_DB_NOT_FOUND",
    };
  }
  return {
    title: "服务暂时不可用",
    description: "加载数据时遇到未知错误，请刷新页面或联系客服。",
    code: "ERR_UNKNOWN",
  };
}

function DashboardErrorState({ error }: { readonly error: unknown }) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const info = getErrorInfo(rawMessage);
  console.error("[DashboardPage] Database error:", error);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-5">
      <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[120px]" />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xl">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-500">
          <AlertTriangle className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-slate-900">{info.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {info.description}
        </p>
        <p className="mt-5 font-mono text-[11px] text-slate-300">
          错误码：{info.code}
        </p>
        <p className="mt-4 text-xs text-slate-400">
          如持续出现，请截图并添加微信{" "}
          <span className="select-all font-semibold text-slate-600">
            kkyycc01
          </span>{" "}
          联系客服
        </p>
        <Button asChild variant="outline" className="mt-6 rounded-full px-6">
          <Link href="/dashboard">刷新页面</Link>
        </Button>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const userId = (await cookies()).get("auth_uid")?.value;
  if (!userId) redirect("/login?redirect=/dashboard");

  let resumes;
  try {
    resumes = await prisma.resume.findMany({
      where: { user: { wxId: userId }, kind: "BASE" },
      orderBy: { updatedAt: "desc" },
    });
  } catch (error) {
    return <DashboardErrorState error={error} />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-[5%] -top-[10%] h-[500px] w-[500px] rounded-full bg-[#8B5CF6]/10 blur-[100px]" />
        <div className="absolute -bottom-[10%] -left-[10%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col gap-4 px-6 pb-2 pt-20 sm:px-10 md:pt-8 lg:px-12">
        <h1 className="text-2xl font-bold text-slate-800">我的简历</h1>
      </div>

      <main className="relative z-10 px-6 py-6 sm:px-10 lg:px-12">
        <div className="mb-10 grid w-full grid-cols-3 gap-3 sm:gap-4 md:w-[70%] lg:w-[60%] xl:w-[50%]">
          <div className="h-[76px] rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 p-px shadow-sm transition-shadow hover:shadow-md">
            <Link
              href="/ai"
              className="flex h-full flex-col items-center justify-center gap-1.5 rounded-[11px] bg-white/90 backdrop-blur-md transition-colors hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              <Wand2 className="h-5 w-5 text-fuchsia-500" />
              <span className="text-xs font-medium text-slate-800 sm:text-[13px]">
                AI生成简历
              </span>
            </Link>
          </div>

          <form
            action={async () => {
              "use server";
              const id = await createResume();
              redirect(`/editor/${id}`);
            }}
            className="h-[76px] w-full"
          >
            <button
              type="submit"
              className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm backdrop-blur-md transition-all hover:border-violet-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
            >
              <Plus className="h-6 w-6 text-slate-700" />
              <span className="text-xs font-medium sm:text-[13px]">
                创建空白简历
              </span>
            </button>
          </form>

          <Link
            href="/import"
            className="flex h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 text-slate-800 shadow-sm backdrop-blur-md transition-all hover:border-violet-300 hover:bg-slate-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          >
            <FileDown className="h-5 w-5 text-slate-700" />
            <span className="text-xs font-medium sm:text-[13px]">导入简历</span>
          </Link>
        </div>

        {resumes.length === 0 ? (
          <section className="flex min-h-[480px] flex-col items-center justify-center rounded-2xl border border-white bg-white/60 px-6 py-20 text-center shadow-sm backdrop-blur-md md:min-h-[560px]">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#F5F3FF] shadow-sm">
              <Sparkles className="h-8 w-8 text-[#8B5CF6]" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-slate-800">
              开启求职之旅
            </h2>
            <p className="mb-8 max-w-sm text-sm leading-relaxed text-slate-500">
              你还没有创建过简历。点击下方按钮，让 AI
              协助你快速生成一份专业出彩的求职简历。
            </p>
            <Button
              asChild
              className="rounded-lg bg-[#8B5CF6] px-8 py-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-[#7C3AED]"
            >
              <Link href="/ai">
                <Wand2 className="mr-2 h-4 w-4" />
                AI 创建简历
              </Link>
            </Button>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <form
              action={async () => {
                "use server";
                const id = await createResume();
                redirect(`/editor/${id}`);
              }}
            >
              <button className="group flex aspect-[1/1.414] w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white/40 text-slate-500 backdrop-blur-sm transition-all hover:border-[#8B5CF6] hover:bg-white/80 hover:text-[#8B5CF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 transition-colors group-hover:bg-[#F5F3FF]">
                  <Plus className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium">新建空白简历</span>
              </button>
            </form>

            {resumes.map((resume) => (
              <article
                key={resume.id}
                className="group relative flex aspect-[1/1.414] flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-md focus-within:ring-2 focus-within:ring-violet-500"
              >
                <Link
                  href={`/editor/${resume.id}`}
                  className="relative block min-h-0 flex-1 overflow-hidden border-b border-slate-100 bg-slate-50 focus-visible:outline-none"
                >
                  {resume.thumbnail ? (
                    <Image
                      src={resume.thumbnail}
                      alt={resume.title}
                      fill
                      className="object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300">
                      <FileText className="mb-2 h-8 w-8 opacity-50" />
                      <span className="text-xs font-medium">暂无预览</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <span className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-800 shadow-sm">
                      编辑简历
                    </span>
                  </div>
                </Link>

                <div className="flex shrink-0 flex-col gap-3 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800"
                      title={resume.title}
                    >
                      {resume.title}
                    </h3>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      {resume.template || "Default"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center text-xs text-slate-400">
                      <Clock className="mr-1 h-3.5 w-3.5 shrink-0" />
                      <span className="max-w-[100px] truncate">
                        {new Date(resume.updatedAt).toLocaleDateString(
                          "zh-CN",
                          {
                            year: "numeric",
                            month: "numeric",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </div>
                    <ResumeCardActions
                      resumeId={resume.id}
                      currentTitle={resume.title}
                      onRename={renameResume}
                      onDuplicate={duplicateResume}
                      onDelete={deleteResume}
                    />
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
