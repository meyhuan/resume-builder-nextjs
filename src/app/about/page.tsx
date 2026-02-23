import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Heart, Code2, Coffee, MessageCircle } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: '关于开发者 - 智简简历',
  description: '独立开发者倾力打造，永久免费的 AI 简历工具。',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <LandingHeader />
      
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
              <span className="text-sm font-semibold text-slate-700">独立开发者作品</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
              你好，我是<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">智简简历</span>的作者
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              一个致力于用技术解决实际问题的程序员。
            </p>
          </div>

          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 delay-150">
            {/* Story Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">我的初衷</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  我还记得自己刚毕业时找工作的焦虑。面对空白的 Word 文档，完全不知道该怎么包装自己的经历，排版也总是弄得一团糟。
                </p>
                <p>
                  后来我发现，市面上的简历工具虽然多，但往往伴随着各种套路：要么必须开通 VIP 才能使用好看的模板，要么辛辛苦苦填完内容，导出 PDF 时才提示要付费解锁，甚至有些免费导出的简历还带着巨大的去不掉的水印。
                </p>
                <p>
                  我觉得这件事不应该是这样的。求职本来就已经是一件压力很大的事情了，工具应该帮忙减轻负担，而不是制造新的焦虑。
                </p>
                <p>
                  于是，就有了<strong className="text-slate-800 font-semibold">智简简历</strong>。
                </p>
              </div>
            </div>

            {/* Free Promise Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-rose-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">为什么完全免费？</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  作为一个独立开发者，我没有背负投资人的盈利指标，这让我也能保持产品的纯粹。
                </p>
                <p>
                  我承诺：<strong className="text-slate-800 font-semibold">所有基础的简历编辑、排版、AI 辅助生成、以及导出 PDF 功能，永远免费。无套路、无广告、无水印。</strong>
                </p>
                <p>
                  如果你觉得这个工具真的帮到了你，或者你成功拿到了满意的 Offer，欢迎推荐给你的同学和朋友。这对我来说就是最大的鼓励！
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-sky-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">联系交流</h2>
              </div>
              <div className="text-slate-600 leading-relaxed text-lg mb-8">
                <p>
                  如果你在使用过程中遇到任何问题，或者对产品有好的建议，随时可以通过微信公众号找到我。这里没有冷冰冰的客服机器人，只有我本人。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/50 p-6 rounded-2xl border border-white shadow-sm">
                <div className="w-32 h-32 bg-white rounded-xl shadow-sm flex items-center justify-center text-sm text-slate-400 border border-slate-100 shrink-0">
                  {/* Placeholder for QR Code */}
                  <div className="text-center">
                    <div className="w-20 h-20 bg-slate-100 mx-auto mb-2 rounded-lg flex items-center justify-center text-slate-300">
                      QR
                    </div>
                    微信公众号
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">扫码关注公众号</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    获取最新的功能更新。<br/>
                    如果你在求职中遇到困惑，也欢迎找我聊聊。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
