import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingFooter } from "@/components/landing/LandingFooter";
import Image from "next/image";
import { Heart, Code2, Coffee, MessageCircle, Mail, TreePine, Users } from "lucide-react";
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
              你好，我是<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">袁小智</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              10 年程序员，兼职独立开发者，智简简历的作者。
            </p>
          </div>

          <div className="space-y-8 animate-in slide-in-from-bottom duration-700 delay-150">
            {/* Story Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-violet-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">我的故事</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  从大学开始，我就喜欢自己写代码做小应用。2014 年做了个五子棋 App 挂上广告，赚到了人生第一个 2 万块。后来做过几十个小程序和网站，大部分都死掉了——跟风卖流量卡、搞小红书虚拟资料、做咸鱼无货源，踩了无数的坑。
                </p>
                <p>
                  直到有一天，我回头看了看自己手上唯一还有人在用的产品——一个简历小程序。数据虽然不大，但真的有人在付费，有人在留言感谢。
                </p>
                <p>
                  我想起后台收到过的一条留言：一个用户说他以前在 QQ 浏览器用过我的工具，后来找不到了，难过了好久，终于在微信又搜到了。他说：<strong className="text-slate-800">"开发者大大，这个小程序我超爱，求求你千万别下架。"</strong>
                </p>
                <p>
                  那一刻我意识到，我写的不仅仅是代码，我是在实实在在地帮人解决问题。于是我决定收窄方向，把所有精力都放在这一款产品上，把它做好、做深、做出温度。
                </p>
                <p>
                  这就是<strong className="text-slate-800 font-semibold">智简简历</strong>的由来。
                </p>
              </div>
            </div>

            {/* Why indie dev */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <TreePine className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">为什么是独立开发？</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  我有房贷要还，有女儿要养，不能一冲动就辞职。但上个月女儿生日，我本来打算 6 点下班回家给她拆蛋糕，结果 5 点半一条通知：全组紧急开会。那一开就是两个小时。
                </p>
                <p>
                  坐在会议室里，看着窗外一点点黑下来，我心里就一个念头：如果我能靠自己的产品养活自己，是不是就不用在这个下午，缺席女儿的生日？
                </p>
                <p>
                  <strong className="text-slate-800">打工是换钱，独立开发是种树。</strong>种树的前期很痛苦，可能大半年都没有果子。但只要根扎稳了，它能长出你这辈子都求不来的「选择权」。
                </p>
              </div>
            </div>

            {/* Why this product is different */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">用心做产品</h2>
              </div>
              <div className="space-y-4 text-slate-600 leading-relaxed text-lg">
                <p>
                  以前我只会抄，别人加什么功能我就加什么，根本不知道为什么。
                </p>
                <p>
                  后来我沉下心去想：应届生缺的是「经历模板」来填补空白，而十年经验的职场人需要的是「专业化的数字表达」。不同身份、不同岗位，需要的东西完全不一样。
                </p>
                <p>
                  所以我把这些痛点一条一条写进代码里——针对在校生、应届生、职场人做不同的 AI 引导流程；针对不同岗位类别调整用词和重点；把「手动填写」变成「智能选择」，让每一步都在帮你解决问题，而不是制造新的焦虑。
                </p>
                <p>
                  我不想做一辆「更好看的马车」，我想给你一辆<strong className="text-slate-800">真正能解决问题的汽车</strong>。
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
                  因为我知道求职是什么滋味。辛辛苦苦填完简历，导出时弹出付费弹窗；好不容易选了个模板，PDF 上印着去不掉的水印——这种体验太糟糕了。
                </p>
                <p>
                  作为独立开发者，我没有投资人的盈利指标，这让我能保持产品的纯粹。
                </p>
                <p>
                  我承诺：<strong className="text-slate-800 font-semibold">所有简历编辑、AI 生成、AI 排版、导出 PDF 功能，永远免费。无套路、无广告、无水印。</strong>
                </p>
                <p>
                  如果你觉得这个工具帮到了你，或者你拿到了满意的 Offer，推荐给你的同学和朋友就是对我最大的鼓励。
                </p>
              </div>
            </div>

            {/* Contact Section */}
            <div className="bg-white/70 backdrop-blur-md rounded-3xl p-8 md:p-12 border border-white shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center">
                  <MessageCircle className="w-6 h-6 text-sky-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">找到我</h2>
              </div>
              <div className="text-slate-600 leading-relaxed text-lg mb-8">
                <p>
                  遇到问题、有功能建议、或者只是想聊聊求职的困惑，都可以直接加我微信。这里没有客服机器人，只有我本人。每一条消息我都会认真回复。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-6 items-center bg-white/50 p-6 rounded-2xl border border-white shadow-sm">
                <div className="w-32 h-auto bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 shrink-0">
                  <Image src="/wx.webp" alt="袁小智微信二维码" width={600} height={818} className="w-full h-auto object-contain" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-slate-800">职场学长袁小智</h3>
                  <div className="space-y-1.5 text-sm text-slate-500">
                    <p className="flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-green-500 shrink-0" />
                      微信号：kkyycc01
                    </p>
                    <p className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                      邮箱：627655140@qq.com
                    </p>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    问题反馈 · 求职交流 · 功能建议 · 商务合作
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
