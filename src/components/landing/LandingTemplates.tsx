"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getAllTemplates,
  type TemplateConfig,
} from "@/templates/template-loader";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Gem,
  GraduationCap,
  Layout,
  Sparkles,
  Wand2,
} from "lucide-react";

interface TemplatesSectionProps {
  id?: string;
}

const FEATURED_TEMPLATE_IDS = [
  "qingsui",
  "mashang",
  "xinghe",
  "hengjian",
  "yuanshan",
  "yiyetong",
  "zhumo",
  "simple",
] as const;

const TEMPLATE_SCENES: Record<string, string> = {
  qingsui: "校招 / 应届",
  mashang: "技术 / 算法",
  xinghe: "产品 / 运营",
  hengjian: "国企 / 银行",
  yuanshan: "管理 / 资深",
  yiyetong: "海投 / 一页",
  zhumo: "内容 / 文案",
  simple: "通用 / 极简",
};

const TEMPLATE_HIGHLIGHTS = [
  {
    icon: <GraduationCap className="h-4 w-4" />,
    label: "应届生友好",
  },
  {
    icon: <BriefcaseBusiness className="h-4 w-4" />,
    label: "职场人可用",
  },
  {
    icon: <FileText className="h-4 w-4" />,
    label: "高清 PDF 导出",
  },
];

function getFeaturedTemplates(
  templates: readonly TemplateConfig[],
): TemplateConfig[] {
  const templateMap = new Map(
    templates.map((template) => [template.id, template]),
  );
  const featuredTemplates = FEATURED_TEMPLATE_IDS.map((id) =>
    templateMap.get(id),
  ).filter((template): template is TemplateConfig => Boolean(template));

  return featuredTemplates.length > 0
    ? featuredTemplates
    : templates.slice(0, 8);
}

export const LandingTemplates = ({ id }: TemplatesSectionProps) => {
  const templates = getAllTemplates();
  const featuredTemplates = getFeaturedTemplates(templates);
  const railRef = React.useRef<HTMLDivElement>(null);
  const [scrollState, setScrollState] = React.useState({
    canScrollLeft: false,
    canScrollRight: false,
  });

  const updateScrollState = React.useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;

    const maxScrollLeft = rail.scrollWidth - rail.clientWidth;
    setScrollState({
      canScrollLeft: rail.scrollLeft > 4,
      canScrollRight: rail.scrollLeft < maxScrollLeft - 4,
    });
  }, []);

  React.useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    updateScrollState();
    rail.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    return () => {
      rail.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState]);

  React.useEffect(() => {
    const frameId = window.requestAnimationFrame(updateScrollState);
    return () => window.cancelAnimationFrame(frameId);
  }, [featuredTemplates.length, updateScrollState]);

  const scrollTemplates = React.useCallback(
    (direction: -1 | 1) => {
      const rail = railRef.current;
      if (!rail) return;

      rail.scrollBy({
        left: direction * Math.max(220, rail.clientWidth * 0.82),
        behavior: "smooth",
      });
      window.setTimeout(updateScrollState, 360);
    },
    [updateScrollState],
  );

  return (
    <section id={id} className="bg-white py-14 md:py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12 lg:px-8">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3.5 py-1.5">
            <Gem className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold text-violet-700">
              精选简历模板
            </span>
          </div>

          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-4xl">
            不用逛完整个模板库，
            <span className="text-violet-600">先选最稳的几套</span>
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-500">
            首页只展示高频场景的代表模板：校招、技术、产品运营、国企银行、管理岗和海投一页版。
            先快速判断风格，再进入模板中心细选。
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {TEMPLATE_HIGHLIGHTS.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-colors hover:bg-violet-700"
            >
              查看全部 {templates.length} 套模板
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ai"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition-colors hover:border-violet-200 hover:text-violet-600"
            >
              <Sparkles className="h-4 w-4" />让 AI 先生成内容
            </Link>
          </div>
        </div>

        <div className="min-w-0">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">热门模板橱窗</p>
              <p className="mt-1 text-xs text-slate-400">
                横向浏览，不打断首页阅读节奏
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 md:flex">
                <CheckCircle2 className="h-3.5 w-3.5" />
                免费可投递
              </div>
              <button
                type="button"
                aria-label="查看上一组模板"
                disabled={!scrollState.canScrollLeft}
                onClick={() => scrollTemplates(-1)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-sm transition-all ${
                  scrollState.canScrollLeft
                    ? "border-slate-200 text-slate-700 hover:border-violet-200 hover:text-violet-600"
                    : "cursor-not-allowed border-slate-100 text-slate-300"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="查看下一组模板"
                disabled={!scrollState.canScrollRight}
                onClick={() => scrollTemplates(1)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white shadow-sm transition-all ${
                  scrollState.canScrollRight
                    ? "border-slate-200 text-slate-700 hover:border-violet-200 hover:text-violet-600"
                    : "cursor-not-allowed border-slate-100 text-slate-300"
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div
              ref={railRef}
              className="snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              <div className="grid auto-cols-[168px] grid-flow-col gap-4 sm:auto-cols-[190px] lg:auto-cols-[198px]">
                {featuredTemplates.length > 0
                  ? featuredTemplates.map((item, index) => (
                      <Link
                        key={item.id}
                        href={`/editor?template=${item.id}`}
                        className="group snap-start rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-500/10"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-slate-100">
                          {item.preview ? (
                            <Image
                              src={item.preview}
                              alt={`${item.name}简历模板预览`}
                              fill
                              sizes="(max-width: 640px) 168px, 198px"
                              className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                              <Layout className="h-12 w-12 opacity-30" />
                            </div>
                          )}
                          {index < 3 ? (
                            <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-extrabold text-violet-600 shadow-sm backdrop-blur">
                              推荐
                            </span>
                          ) : null}
                        </div>

                        <div className="px-1 pt-3">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-bold text-slate-900">
                              {item.name}
                            </h3>
                            <Wand2 className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-violet-500" />
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {TEMPLATE_SCENES[item.id] ?? item.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {(item.tags ?? []).slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))
                  : [1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="snap-start rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm"
                      >
                        <div className="aspect-[3/4] animate-pulse rounded-xl bg-slate-100" />
                        <div className="space-y-2 px-1 pt-3">
                          <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                          <div className="h-3 w-full rounded bg-slate-50" />
                        </div>
                      </div>
                    ))}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-8 bg-gradient-to-r from-white to-transparent sm:block" />
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-10 bg-gradient-to-l from-white to-transparent sm:block" />
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            {["ATS 友好", "中文排版", "在线换色", "一键套用"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
