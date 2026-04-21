'use client'

import { type ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, MessageCircle, Mail, Code2 } from 'lucide-react'
import Image from 'next/image'

/**
 * Mobile about page: developer story, contact, and changelog.
 */
export default function MobileAboutPage(): ReactElement {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-3 h-12 bg-white/90 backdrop-blur border-b border-slate-200">
        <button
          type="button"
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-100"
          onClick={(): void => router.back()}
          aria-label="返回"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-sm font-semibold text-slate-800">关于开发者</div>
        <div className="w-9" />
      </div>

      <div className="flex-1 px-5 py-6 pb-12">
        <div className="flex flex-col gap-5">
          {/* Developer intro */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Code2 size={18} className="text-violet-600" />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900">袁小智</div>
                <div className="text-xs text-slate-400">10 年程序员 · 独立开发者</div>
              </div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                从大学开始，我就喜欢自己写代码做小应用。后来做过几十个小程序和网站，大部分都死掉了。
              </p>
              <p>
                直到有一天，我回头看了看自己手上唯一还有人在用的产品——一个简历小程序。真的有人在付费，有人在留言感谢。
              </p>
              <p>
                有人留言说：<strong className="text-slate-800">&ldquo;开发者大大，这个小程序我超爱，求求你千万别下架。&rdquo;</strong>
              </p>
              <p>
                那一刻我意识到，我写的不仅仅是代码，我是在实实在在地帮人解决问题。于是我决定把所有精力都放在这一款产品上，把它做好、做深、做出温度。
              </p>
            </div>
          </div>

          {/* Free promise */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Heart size={18} className="text-rose-500" />
              </div>
              <div className="text-base font-bold text-slate-900">为什么完全免费？</div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed space-y-3">
              <p>
                因为我知道求职是什么滋味。辛辛苦苦填完简历，导出时弹出付费弹窗——这种体验太糟糕了。
              </p>
              <p>
                <strong className="text-slate-800">所有简历编辑、AI 生成、导出 PDF 功能，永远免费。无套路、无广告、无水印。</strong>
              </p>
              <p>
                如果你觉得这个工具帮到了你，推荐给你的同学和朋友就是对我最大的鼓励。
              </p>
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-sky-100 flex items-center justify-center">
                <MessageCircle size={18} className="text-sky-500" />
              </div>
              <div className="text-base font-bold text-slate-900">找到我</div>
            </div>
            <div className="text-sm text-slate-600 leading-relaxed mb-4">
              遇到问题、有功能建议，都可以直接加我微信。这里没有客服机器人，只有我本人。
            </div>
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-4">
              <div className="w-20 h-auto bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100 shrink-0">
                <Image src="/wx.webp" alt="袁小智微信二维码" width={600} height={818} className="w-full h-auto object-contain" />
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold text-slate-800">职场学长袁小智</div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <MessageCircle size={12} className="text-green-500" />
                  微信号：kkyycc01
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <Mail size={12} className="text-blue-500" />
                  627655140@qq.com
                </div>
                <div className="text-[10px] text-slate-400">问题反馈 · 求职交流 · 功能建议</div>
              </div>
            </div>
          </div>

          {/* Changelog */}
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <div className="text-base font-bold text-slate-900 mb-4">更新日志</div>
            <div className="space-y-3">
              {CHANGELOG.map((item, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="text-xs text-slate-400 shrink-0 mt-0.5 w-16">{item.date}</div>
                  <div className="text-sm text-slate-600 leading-relaxed">{item.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const CHANGELOG: readonly { date: string; text: string }[] = [
  { date: '2025.04', text: '🚀 移动端编辑器全新上线，支持拖拽排序、AI 润色、导入简历' },
  { date: '2025.03', text: '✨ AI 分段生成上线，每个模块都能 AI 帮你写' },
  { date: '2025.02', text: '🎨 新增温暖模板，4 套模板全部免费' },
  { date: '2025.01', text: '🐛 修了个头像裁剪的 bug，是用户微信反馈的' },
  { date: '2024.12', text: '🎉 AI 一键生成简历功能上线' },
  { date: '2024.10', text: '📝 富文本编辑器升级，支持加粗、列表' },
]
