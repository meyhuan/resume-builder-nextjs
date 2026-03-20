import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { Plus, Clock, Sparkles, Wand2, FileDown, FileText } from "lucide-react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import { ResumeCardActions } from "@/components/dashboard/resume-card-actions";
import { createResume, renameResume, duplicateResume, deleteResume } from "./actions";

export const metadata: Metadata = {
  title: 'My Resumes - Manage All Your Resumes',
  description: 'Manage all your resumes, create new ones with one click, use AI to generate professional content, and export high-quality PDFs for free.',
  robots: { index: false, follow: false },
};

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

        {/* Page Title & Old Version Notice */}
        <div className="relative z-10 pt-8 pb-2 px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">My Resumes</h1>
          
          <a 
            href="https://w2025.aijianli.cn" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm hover:bg-amber-100 transition-colors shadow-sm w-fit"
          >
            <Clock className="w-4 h-4" />
            <span>Can&apos;t find your old resumes? Click to recover (legacy version)</span>
          </a>
        </div>

        {/* Main Content */}
        <div className="relative z-10 px-6 sm:px-10 lg:px-12 py-6">
          {/* Action Cards Overview */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-10 w-full md:w-[70%] lg:w-[60%] xl:w-[50%]">
            {/* AI Generate Resume */}
            <div className="rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-400 p-[1px] shadow-sm hover:shadow-md transition-shadow h-[76px]">
              <Link href="/ai" className="flex flex-col items-center justify-center gap-1.5 bg-white/90 backdrop-blur-md rounded-[11px] h-full hover:bg-white/60 transition-colors">
                <Wand2 className="w-5 h-5 text-fuchsia-500" />
                <span className="text-xs sm:text-[13px] font-medium text-slate-800">AI Generate</span>
              </Link>
            </div>
            
            {/* Create New Resume */}
            <form action={async () => {
              "use server"
              const id = await createResume();
              const { redirect } = await import("next/navigation");
              redirect(`/editor/${id}`);
            }} className="w-full h-[76px]">
              <button type="submit" className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-slate-50 shadow-sm hover:shadow-md transition-all">
                <Plus className="w-6 h-6 text-slate-700 font-light" />
                <span className="text-xs sm:text-[13px] font-medium text-slate-800">New Resume</span>
              </button>
            </form>

            {/* Import Resume */}
            <Link href="/import" className="w-full h-[76px] flex flex-col items-center justify-center gap-1.5 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 hover:border-violet-300 hover:bg-slate-50 shadow-sm hover:shadow-md transition-all">
              <FileDown className="w-5 h-5 text-slate-700" />
              <span className="text-xs sm:text-[13px] font-medium text-slate-800">Import</span>
            </Link>
          </div>

          {/* Resume Grid */}
          {resumes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-sm text-center">
              <div className="w-20 h-20 bg-[#F5F3FF] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Sparkles className="w-8 h-8 text-[#8B5CF6]" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Start Your Career Journey</h2>
              <p className="text-slate-500 mb-8 max-w-sm text-sm leading-relaxed">
                You haven&apos;t created any resumes yet. Click the button below to let AI help you quickly generate a professional resume.
              </p>
              <Link href="/ai">
                <Button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white rounded-lg px-8 py-5 text-base shadow-sm transition-all duration-200 font-medium">
                  <Wand2 className="w-4 h-4 mr-2" />
                  AI Create Resume
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {/* New Resume Card */}
              <form action={async () => {
                "use server"
                const id = await createResume();
                const { redirect } = await import("next/navigation");
                redirect(`/editor/${id}`);
              }}>
                <button className="w-full aspect-[1/1.414] bg-white/40 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 hover:border-[#8B5CF6] hover:bg-white/80 transition-all duration-200 group flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-[#8B5CF6]">
                  <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-[#F5F3FF] flex items-center justify-center transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-medium text-sm">New Blank Resume</span>
                </button>
              </form>

              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="group relative bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col aspect-[1/1.414] overflow-hidden"
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
                        <span className="text-xs font-medium">No Preview</span>
                      </div>
                    )}
                    {/* Flat Glass Overlay on Hover */}
                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="bg-white text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg shadow-sm">
                        Edit Resume
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
                          {new Date(resume.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric'
                          })}
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
          <h3 className="text-xl font-bold text-slate-900 mb-2">Unable to Connect</h3>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">Database connection failed. Please try again later.</p>
          <Link href="/dashboard">
            <Button variant="outline" className="rounded-full px-6 border-slate-200 hover:border-violet-400 hover:text-violet-600 transition-colors">
              Refresh Page
            </Button>
          </Link>
        </div>
      </div>
    );
  }
}
