import type { Metadata } from "next";
import ResumeEditor from "@/components/ResumeEditor";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: 'Resume Editor - Visual Resume Builder',
  description: 'Use AI Resume Pass visual editor with drag-and-drop layout, AI-powered content, and live preview to create professional resumes effortlessly.',
  robots: { index: false, follow: false },
};

function EditorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p>Loading editor...</p>
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
