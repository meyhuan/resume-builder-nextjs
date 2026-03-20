import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import Link from "next/link";
import { Heart, Code2, Coffee, MessageCircle, Mail, Users, Wand2, ArrowRight } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'About — AI Resume Pass',
  description: 'Built by an indie developer. Free forever AI resume builder.',
};

export default function AboutPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <LandingHeader forceSolid />
      
      <main className="flex-grow pt-32 pb-24 relative overflow-hidden">
        {/* Background Orbs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-[100px] animate-pulse-slow" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-fuchsia-500/10 rounded-full blur-[100px] animate-pulse-slow [animation-delay:2s]" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Header */}
          <div className="text-center mb-16 animate-in slide-in-from-bottom duration-700">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-md border border-white rounded-full shadow-sm mb-6">
              <Code2 className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-slate-700">Indie Developer Project</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              The Story Behind <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">AI Resume Pass</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Built with care by a solo developer who knows how frustrating job hunting can be.
            </p>
          </div>

          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 delay-150">
            {/* Story Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">My Story</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-base sm:text-lg">
                <p>
                  I&apos;ve been building software for over 10 years. I&apos;ve shipped dozens of side projects — most of them failed. But one thing kept working: a small resume tool that people actually used and loved.
                </p>
                <p>
                  One user once told me: <strong className="text-slate-800">&quot;I lost access to your tool for months and was so relieved when I found it again. Please never take it down.&quot;</strong>
                </p>
                <p>
                  That moment changed everything. I realized I wasn&apos;t just writing code — I was solving a real problem for real people. So I decided to go all in on this one product and make it the best free resume builder on the internet.
                </p>
                <p>
                  That&apos;s how <strong className="text-slate-800 font-semibold">AI Resume Pass</strong> was born.
                </p>
              </div>
            </div>

            {/* Why this product is different */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Built for Job Seekers</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-base sm:text-lg">
                <p>
                  Most resume builders are generic template tools. AI Resume Pass is different — it&apos;s designed specifically for people actively looking for jobs.
                </p>
                <p>
                  Students need help filling gaps in experience. Professionals need precise, data-driven language. Career changers need to reframe their story. Each user is different, and the AI adapts accordingly.
                </p>
                <p>
                  I don&apos;t want to build <strong className="text-slate-800">a prettier horse cart</strong>. I want to give you <strong className="text-slate-800">a car that actually gets you where you need to go</strong>.
                </p>
              </div>
            </div>

            {/* Free Promise Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-rose-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Why Completely Free?</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-base sm:text-lg">
                <p>
                  Because I know what job hunting feels like. You spend hours crafting your resume, only to hit a paywall when you try to export. Or you pick a nice template, but the PDF has an ugly watermark. That experience is terrible.
                </p>
                <p>
                  As an indie developer with no investor pressure, I can keep the product pure and user-focused.
                </p>
                <p>
                  I promise: <strong className="text-slate-800 font-semibold">All resume editing, AI generation, formatting, and PDF export will always be free. No tricks, no ads, no watermarks.</strong>
                </p>
                <p>
                  If this tool helped you land an interview or an offer, sharing it with a friend is the best way to support this project.
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 sm:p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-sky-500" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">Get in Touch</h2>
              </div>
              <div className="text-slate-600 leading-relaxed text-base sm:text-lg mb-8">
                <p>
                  Found a bug? Have a feature request? Just want to say hi? I read every message personally and respond as quickly as I can.
                </p>
              </div>
              <div className="bg-white/50 p-6 rounded-2xl border border-white shadow-sm">
                <div className="space-y-3">
                  <div className="space-y-1.5 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                      Email: support@airesumepass.com
                    </p>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Bug reports · Feature requests · Partnerships · Just saying hi
                  </p>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="bg-gradient-to-br from-violet-600 to-fuchsia-500 rounded-3xl p-6 sm:p-8 md:p-12 shadow-lg text-center">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">Start Building Your Professional Resume</h2>
              <p className="text-white/80 mb-8 max-w-lg mx-auto">
                Completely free. No sign-up required to try. Let AI write compelling resume content for you.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/ai" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-violet-700 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  <Wand2 className="w-5 h-5" />
                  Build My Resume Free
                </Link>
                <Link href="/" className="inline-flex items-center gap-2 px-8 py-3 bg-white/20 text-white font-medium rounded-full border border-white/30 hover:bg-white/30 transition-all">
                  Learn More
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
