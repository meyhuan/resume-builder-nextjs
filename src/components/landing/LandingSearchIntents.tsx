import React from "react";
import Link from "next/link";
import { Bot, BriefcaseBusiness, FileText, Search } from "lucide-react";

interface SearchIntentItem {
  readonly label: string;
  readonly href: string;
}

interface SearchIntentGroup {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactElement;
  readonly items: readonly SearchIntentItem[];
}

interface LandingSearchIntentsProps {
  readonly id?: string;
}

const SEARCH_INTENT_GROUPS: readonly SearchIntentGroup[] = [
  {
    title: "免费在线简历制作",
    description: "适合先做一份可投递简历，在线编辑后直接导出 PDF。",
    icon: <FileText className="h-4 w-4" />,
    items: [
      { label: "免费简历制作", href: "/editor/new" },
      { label: "在线简历制作", href: "/editor/new" },
      { label: "简历制作工具", href: "/editor/new" },
      { label: "一键生成简历", href: "/ai" },
      { label: "简历制作网站免费", href: "/answers/free-ai-resume-builder" },
      { label: "免费做出一份可投递简历", href: "/ai" },
      { label: "无水印简历生成器", href: "/answers/free-ai-resume-builder" },
    ],
  },
  {
    title: "AI 简历生成与优化",
    description: "没有思路或已有旧简历时，让 AI 帮你生成、润色和匹配 JD。",
    icon: <Bot className="h-4 w-4" />,
    items: [
      { label: "AI简历生成器", href: "/ai" },
      { label: "AI写简历", href: "/ai" },
      { label: "AI简历优化", href: "/import" },
      { label: "简历润色", href: "/ai" },
      { label: "简历修改润色", href: "/import" },
      { label: "AI智能简历制作", href: "/ai" },
      { label: "JD简历匹配", href: "/tools/jd-resume-match" },
      { label: "AI文本转简历", href: "/import" },
    ],
  },
  {
    title: "简历模板与导出格式",
    description: "先选版式，再按 PDF、ATS、Markdown、英文简历等要求制作。",
    icon: <Search className="h-4 w-4" />,
    items: [
      { label: "免费简历模板", href: "/templates" },
      { label: "简历模板 PDF 下载", href: "/templates" },
      { label: "极简简历模板", href: "/templates" },
      { label: "ATS友好简历", href: "/tools/jd-resume-match" },
      { label: "Markdown简历", href: "/import" },
      { label: "英文简历模板", href: "/templates" },
      { label: "中英文简历模板", href: "/templates" },
      { label: "个人简历模板", href: "/templates" },
    ],
  },
  {
    title: "热门岗位简历模板",
    description: "按岗位进入对应模板，适合产品、开发、运营、行政、会计等场景。",
    icon: <BriefcaseBusiness className="h-4 w-4" />,
    items: [
      { label: "应届生简历模板", href: "/templates" },
      { label: "校招简历模板", href: "/templates" },
      { label: "社招简历模板", href: "/templates" },
      { label: "产品经理简历模板", href: "/templates/产品经理" },
      { label: "前端开发简历模板", href: "/templates/前端开发" },
      { label: "运营简历模板", href: "/templates/产品运营" },
      { label: "会计简历模板", href: "/templates/会计" },
      { label: "行政简历模板", href: "/templates/行政" },
      { label: "AI产品经理简历模板", href: "/templates/ai产品经理" },
      { label: "AIGC运营简历模板", href: "/templates/aigc运营" },
    ],
  },
];

export const LandingSearchIntents = ({
  id,
}: LandingSearchIntentsProps): React.ReactElement => {
  return (
    <section id={id} className="bg-white py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3.5 py-1.5">
              <Search className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-700">
                快速开始
              </span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-[34px]">
              你想怎么做简历？
              <span className="text-violet-600">按需求直接开始</span>
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-slate-500">
            选择你现在最需要的方式：免费制作、AI 生成、旧简历优化、模板导出，
            或者直接按目标岗位开始。
          </p>
        </div>

        <div className="overflow-x-auto pb-4 [scrollbar-width:none] lg:overflow-visible lg:pb-0 [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-4 lg:grid lg:w-auto lg:grid-cols-4">
            {SEARCH_INTENT_GROUPS.map((group) => (
              <div
                key={group.title}
                className="w-[280px] shrink-0 rounded-2xl border border-slate-100 bg-slate-50/70 p-5 lg:w-auto"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                    {group.icon}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {group.title}
                  </h3>
                </div>
                <p className="mb-4 min-h-[44px] text-xs leading-6 text-slate-500">
                  {group.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <Link
                      key={`${group.title}-${item.label}`}
                      href={item.href}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-600"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
