import React from "react";
import { CheckCircle2, MessageSquareHeart, Quote } from "lucide-react";

interface LandingTestimonialsProps {
  readonly id?: string;
}

interface LandingTestimonial {
  readonly id: string;
  readonly quote: string;
  readonly displayName: string;
  readonly meta: string;
  readonly statusLabel: string;
}

const TESTIMONIALS: readonly LandingTestimonial[] = [
  {
    id: "fresh-graduate",
    quote:
      "我是应届生，最难的是不知道校园项目怎么写。AI 生成后把课程项目和社团经历都整理成了简历语言，改一改就能投。",
    displayName: "应届生用户",
    meta: "校招投递 · 已脱敏",
    statusLabel: "好评",
  },
  {
    id: "java-developer",
    quote:
      "模板不花哨，但看起来很专业。导出的 PDF 排版稳定，投 Java 开发岗时 HR 没再提醒我格式问题，省了很多折腾。",
    displayName: "Java 开发求职者",
    meta: "技术岗投递 · 已脱敏",
    statusLabel: "好评",
  },
  {
    id: "career-switch",
    quote:
      "之前的简历像流水账，导入后 AI 帮我把运营经历改成结果导向，数据和动作都清楚了，面试官也更容易问到重点。",
    displayName: "转行运营用户",
    meta: "旧简历优化 · 已脱敏",
    statusLabel: "好评",
  },
  {
    id: "product-manager",
    quote:
      "我最喜欢按岗位生成初稿，产品经理经历里的需求分析、协作和结果都能被提炼出来，不用从空白文档开始憋。",
    displayName: "产品经理求职者",
    meta: "岗位定制 · 已脱敏",
    statusLabel: "好评",
  },
];

const FEEDBACK_SIGNALS = [
  "导出 PDF 体验",
  "模板排版细节",
  "AI 生成质量",
] as const;

export const LandingTestimonials = ({
  id,
}: LandingTestimonialsProps): React.ReactElement => {
  return (
    <section id={id} className="bg-slate-50 py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-fuchsia-100 bg-white px-3.5 py-1.5 shadow-sm">
              <MessageSquareHeart className="h-4 w-4 text-fuchsia-500" />
              <span className="text-sm font-semibold text-fuchsia-600">
                真实用户反馈
              </span>
            </div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[34px]">
              真实求职场景里，
              <span className="text-violet-600">用户这样评价</span>
            </h2>
          </div>
          <div className="max-w-2xl lg:justify-self-end">
            <p className="text-base leading-8 text-slate-500">
              固定展示来自典型求职场景的精选好评：应届生、技术岗、转行用户和产品经理，都能更快做出可投递简历。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {FEEDBACK_SIGNALS.map((signal) => (
                <span
                  key={signal}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  {signal}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-4 [scrollbar-width:none] lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-4 lg:grid lg:w-auto lg:grid-cols-4">
            {TESTIMONIALS.map((item) => (
              <article
                key={item.id}
                className="w-[280px] shrink-0 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:w-auto"
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    <Quote className="h-5 w-5" />
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-extrabold text-emerald-600">
                    {item.statusLabel}
                  </span>
                </div>
                <p className="min-h-[84px] text-[15px] leading-7 text-slate-700 line-clamp-4">
                  “{item.quote}”
                </p>
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="text-sm font-bold text-slate-900">
                    {item.displayName}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{item.meta}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
