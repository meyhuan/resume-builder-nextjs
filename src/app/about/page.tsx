import type { Metadata } from 'next';
import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LandingFooter } from '@/components/landing/LandingFooter';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { CHANGELOG } from '@/lib/changelog';

export const metadata: Metadata = {
  title: '关于开发者 - 智简简历',
  description: '独立开发者倾力打造，帮你免费制作一份可投递简历的 AI 简历工具。',
  alternates: {
    canonical: 'https://aijianli.cn/about',
  },
};

export default function AboutPage(): ReactElement {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <LandingHeader forceSolid />

      <main className="flex-grow pb-16 pt-24">
        <article className="mx-auto w-full max-w-2xl px-4 sm:px-6">
          <p className="text-sm text-slate-400">
            <Link href="/" className="hover:text-slate-600">首页</Link>
            <span className="px-1.5">/</span>
            <span className="text-slate-600">关于开发者</span>
          </p>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
            袁小智
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            10 年程序员，兼职独立开发者，智简简历的作者。
          </p>

          <section className="mt-12">
            <h2 className="text-base font-semibold text-slate-900">我的故事</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
              <p>
                从大学开始，我就喜欢自己写代码做小应用。2014 年做了个五子棋 App 挂上广告，赚到了人生第一个 2 万块。后来做过几十个小程序和网站，大部分都死掉了——跟风卖流量卡、搞小红书虚拟资料、做咸鱼无货源，踩了无数的坑。
              </p>
              <p>
                直到有一天，我回头看了看自己手上唯一还有人在用的产品——一个简历小程序。数据虽然不大，但真的有人在付费，有人在留言感谢。
              </p>
              <p>
                我想起后台收到过的一条留言：一个用户说他以前在 QQ 浏览器用过我的工具，后来找不到了，难过了好久，终于在微信又搜到了。他说：
                <span className="font-medium text-slate-800">「开发者大大，这个小程序我超爱，求求你千万别下架。」</span>
              </p>
              <p>
                那一刻我意识到，我写的不仅仅是代码，我是在实实在在地帮人解决问题。于是我决定收窄方向，把所有精力都放在这一款产品上，把它做好、做深、做出温度。
              </p>
              <p>
                这就是<span className="font-medium text-slate-800">智简简历</span>的由来。
              </p>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-base font-semibold text-slate-900">为什么是独立开发？</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
              <p>
                我有房贷要还，有女儿要养，不能一冲动就辞职。但上个月女儿生日，我本来打算 6 点下班回家给她拆蛋糕，结果 5 点半一条通知：全组紧急开会。那一开就是两个小时。
              </p>
              <p>
                坐在会议室里，看着窗外一点点黑下来，我心里就一个念头：如果我能靠自己的产品养活自己，是不是就不用在这个下午，缺席女儿的生日？
              </p>
              <p>
                打工是换钱，独立开发是种树。种树的前期很痛苦，可能大半年都没有果子。但只要根扎稳了，它能长出你这辈子都求不来的「选择权」。
              </p>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-base font-semibold text-slate-900">用心做产品</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
              <p>
                以前我只会抄，别人加什么功能我就加什么，根本不知道为什么。
              </p>
              <p>
                后来我沉下心去想：应届生缺的是「经历模板」来填补空白，而十年经验的职场人需要的是「专业化的数字表达」。不同身份、不同岗位，需要的东西完全不一样。
              </p>
              <p>
                所以我把这些痛点一条一条写进代码里——针对在校生、应届生、职场人做不同的引导流程；针对不同岗位类别调整用词和重点；把「手动填写」变成「智能选择」，让每一步都在帮你解决问题，而不是制造新的焦虑。
              </p>
              <p>
                我不想做一辆更好看的马车，我想给你一辆真正能解决问题的工具。
              </p>
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-base font-semibold text-slate-900">为什么能免费做？</h2>
            <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-[15px]">
              <p>
                因为我知道求职是什么滋味。辛辛苦苦填完简历，导出时弹出付费弹窗；好不容易选了个模板，PDF 上印着去不掉的水印——这种体验太糟糕了。
              </p>
              <p>
                作为独立开发者，我没有投资人的盈利指标，这让我能保持产品的纯粹。
              </p>
              <p>
                我承诺：你可以免费制作一份可投递简历，并在免费额度内导出高清 PDF。
              </p>
              <p>
                如果你觉得这个工具帮到了你，或者你拿到了满意的 Offer，推荐给你的同学和朋友就是对我最大的鼓励。
              </p>
            </div>
          </section>

          <section id="changelog" className="mt-12 scroll-mt-28">
            <h2 className="text-base font-semibold text-slate-900">更新日志</h2>
            <dl className="mt-4 space-y-5">
              {CHANGELOG.map((item, index) => (
                <div key={`${item.date}-${index}`}>
                  <dt className="text-xs text-slate-400">{item.date}</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-600">{item.text}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12 border-t border-slate-200 pt-10">
            <h2 className="text-base font-semibold text-slate-900">找到我</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              遇到问题、有功能建议、或者只是想聊聊求职的困惑，都可以直接加我微信。这里没有客服机器人，只有我本人。每一条消息我都会认真回复。
            </p>
            <div className="mt-6 flex items-start gap-5">
              <div className="w-28 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-white sm:w-32">
                <Image src="/wx.webp" alt="袁小智微信二维码" width={600} height={818} className="h-auto w-full object-contain" />
              </div>
              <div className="min-w-0 text-sm leading-6 text-slate-600">
                <p className="font-medium text-slate-800">职场学长袁小智</p>
                <p className="mt-2">微信号：kkyycc01</p>
                <p>邮箱：627655140@qq.com</p>
                <p className="mt-2 text-xs text-slate-400">问题反馈 · 求职交流 · 功能建议 · 商务合作</p>
              </div>
            </div>
          </section>

          <p className="mt-12 text-sm text-slate-500">
            还没有简历？
            <Link href="/ai" className="ml-1 text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-violet-700">
              免费生成一份
            </Link>
            。
          </p>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
