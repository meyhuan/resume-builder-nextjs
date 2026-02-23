import type { Metadata } from "next";
import ResumeEditor from "@/components/ResumeEditor";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: '简历编辑器 - 可视化编辑你的简历',
  description: '使用智简简历可视化编辑器，拖拽排版、AI 智能填写、实时预览，轻松制作专业简历。',
  robots: { index: false, follow: false },
};

function EditorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p>正在加载编辑器...</p>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<EditorFallback />}>
      <ResumeEditor />
    </Suspense>
  );
}
