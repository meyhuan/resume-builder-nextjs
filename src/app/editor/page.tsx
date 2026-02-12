import type { Metadata } from "next";
import ResumeEditor from "@/components/ResumeEditor";

export const metadata: Metadata = {
  title: '简历编辑器 - 可视化编辑你的简历',
  description: '使用智简简历可视化编辑器，拖拽排版、AI 智能填写、实时预览，轻松制作专业简历。',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ResumeEditor />;
}
