import type { Metadata } from "next";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronRight,
  Copy,
  Eye,
  GraduationCap,
  Info,
  Medal,
  Plus,
  Target,
  UserRound,
  Wrench,
  BookOpenText,
  Building2,
  MessageCircleMore,
  Ellipsis,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "我的简历",
  description: "移动端简历编辑首页，按模块管理简历内容并查看完整度。",
  robots: { index: false, follow: false },
};

function Tag({ children, tone = "success" }: { children: string; tone?: "success" | "warn" }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs ${tone === "success" ? "bg-emerald-50 text-emerald-500" : "bg-amber-50 text-amber-500"}`}>{children}</span>;
}

export default function MobileEditPage() {
  return (
    <main className="min-h-screen bg-[#F6F7FC] pb-28 text-slate-800">
      <div className="mx-auto max-w-md px-4 pt-5">
        <header className="mb-4 flex items-center justify-between">
          <h1 className="text-[42px] font-semibold tracking-tight text-slate-900">我的简历</h1>
          <div className="flex gap-2">
            <button className="rounded-full border border-slate-200 bg-white p-3"><Eye className="size-5" /></button>
            <button className="rounded-full border border-slate-200 bg-white p-3"><Ellipsis className="size-5" /></button>
          </div>
        </header>

        <section className="mb-4 rounded-2xl border border-[#E7E9F3] bg-white p-4">
          <div className="flex items-center gap-4">
            <div className="grid size-[78px] place-items-center rounded-full bg-[conic-gradient(theme(colors.violet.600)_280deg,#E9E5FF_280deg)] p-[7px]"><div className="grid size-full place-items-center rounded-full bg-white text-[22px] font-semibold">78%</div></div>
            <div className="flex-1">
              <p className="text-[36px] font-semibold leading-none">简历完整度 <span className="text-violet-600">78%</span></p>
              <p className="mt-1 text-sm text-slate-500">超过 68% 的同龄求职者</p>
              <button className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-3 py-1 text-sm font-medium text-violet-600">提升建议<ChevronRight className="size-3.5" /></button>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <li className="flex items-center gap-2 text-slate-600"><span className="size-2 rounded-full bg-emerald-400" />已填写 18/24 项内容</li>
            <li className="flex items-center gap-2 text-slate-600"><Info className="size-4 text-amber-400" />优化 4 处可提升点</li>
            <li className="flex items-center gap-2 text-slate-600"><Info className="size-4 text-slate-400" />待补充 2 项关键信息</li>
          </ul>
        </section>

        <section className="mb-4 overflow-hidden rounded-2xl border border-[#E7E9F3] bg-white">
          {[[UserRound, "基本信息", "张小明 · 男 · 24岁 · 138****1234 · 上海"], [Target, "求职意向", "前端开发工程师 · 上海 · 15-20K · 随时到岗"] as const].map(([Icon, title, desc], idx) => (
            <div key={title} className={`flex items-center justify-between px-4 py-3 ${idx === 0 ? "border-b border-slate-100" : ""}`}>
              <div className="flex items-center gap-3"><span className="rounded-xl bg-violet-100 p-2 text-violet-600"><Icon className="size-5" /></span><div><p className="font-semibold">{title}</p><p className="text-sm text-slate-500">{desc}</p></div></div>
              <div className="flex items-center gap-2"><Tag>已完善</Tag><ChevronRight className="size-4 text-slate-400" /></div>
            </div>
          ))}
        </section>

        <section className="mb-4 rounded-2xl border border-[#E7E9F3] bg-white p-4">
          <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><BriefcaseBusiness className="size-5 text-violet-600" /><h2 className="text-2xl font-semibold">工作经历</h2><span className="rounded-full bg-violet-100 px-2 text-sm text-violet-600">2</span></div><button className="text-violet-600">管理</button></div>
          <p className="mb-3 text-sm text-slate-500">💡 建议至少写 1 段 “有成果” 的经历</p>
          <div className="rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">前端开发工程师 · 某某科技有限公司</p><div className="flex items-center gap-2"><Tag>完整</Tag><ChevronRight className="size-4 text-slate-400" /></div></div><p className="text-sm text-slate-500">2022.07 - 至今 · 上海</p></div>
          <div className="mt-2 rounded-xl border border-slate-200 p-3"><div className="mb-2 flex items-center justify-between"><p className="font-semibold">前端开发工程师 · 某某网络科技</p><div className="flex items-center gap-2"><Tag tone="warn">待补：成果</Tag><ChevronRight className="size-4 text-slate-400" /></div></div><p className="text-sm text-slate-500">2021.03 - 2022.06 · 广州</p><div className="mt-3 rounded-lg bg-[#F7F8FC] p-3 text-sm text-slate-600"><p className="mb-1 font-medium">亮点摘要</p><ul className="list-disc space-y-1 pl-5"><li>负责公司官网及活动页的开发与维护</li><li>使用 Vue3 + TypeScript 重构核心模块</li><li>优化首屏加载性能，提升 30% 加载速度</li></ul></div><div className="mt-3 grid grid-cols-2 gap-2"><button className="rounded-xl bg-gradient-to-r from-violet-700 to-violet-500 py-2.5 text-white">编辑这一段</button><button className="rounded-xl border border-violet-300 py-2.5 text-violet-600"><span className="inline-flex items-center gap-1"><Copy className="size-4" />复制</span></button></div></div>
          <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-xl border border-dashed border-violet-300 py-2.5 text-violet-600"><Plus className="size-4" />添加工作经历</button>
        </section>

        <section className="mb-4 rounded-2xl border border-[#E7E9F3] bg-white p-4"><div className="mb-3 flex items-center justify-between"><div className="flex items-center gap-2"><Building2 className="size-5 text-orange-400" /><h2 className="text-2xl font-semibold">项目经历</h2><span className="rounded-full bg-violet-100 px-2 text-sm text-violet-600">2</span></div><button className="text-violet-600">管理</button></div><div className="space-y-3 text-slate-700"><div className="flex items-start justify-between"><div><p className="font-semibold">企业官网改版项目</p><p className="text-sm text-slate-500">2023.04 - 2023.06 · 团队项目</p></div><div className="flex items-center gap-2"><Tag>完整</Tag><ChevronRight className="size-4 text-slate-400" /></div></div><div className="flex items-start justify-between"><div><p className="font-semibold">电商小程序开发</p><p className="text-sm text-slate-500">2022.09 - 2022.12 · 个人项目</p></div><div className="flex items-center gap-2"><Tag tone="warn">待补：亮点</Tag><ChevronRight className="size-4 text-slate-400" /></div></div></div><button className="mt-3 flex w-full items-center justify-center gap-1 text-violet-600"><Plus className="size-4" />添加项目经历</button></section>

        <section className="mb-4 rounded-2xl border border-[#E7E9F3] bg-white p-4"><div className="flex items-start justify-between"><div className="flex items-center gap-2"><GraduationCap className="size-5 text-emerald-500" /><h2 className="text-2xl font-semibold">教育经历</h2><span className="rounded-full bg-violet-100 px-2 text-sm text-violet-600">1</span></div><div className="flex items-center gap-2"><Tag>完整</Tag><ChevronRight className="size-4 text-slate-400" /></div></div><p className="mt-1 text-slate-600">本科 · 计算机科学与技术 · 上海大学</p><p className="text-sm text-slate-500">2018.09 - 2022.06</p><button className="mt-3 flex w-full items-center justify-center gap-1 text-violet-600"><Plus className="size-4" />添加教育经历</button></section>

        <section className="mb-4"><p className="mb-2 text-sm font-medium text-slate-500">更多内容（可选）</p><div className="grid grid-cols-2 gap-2 text-sm">{[[Wrench, "技能特长"], [BriefcaseBusiness, "实习经历"], [BookOpenText, "校园经历"], [Medal, "荣誉奖项"], [Target, "证书"], [MessageCircleMore, "自我评价"]].map(([Icon, label]) => (<button key={label} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5"><span className="inline-flex items-center gap-1.5 text-slate-600"><Icon className="size-4 text-violet-500" />{label as string}</span><Plus className="size-4 text-slate-400" /></button>))}</div></section>

        <div className="mb-3 rounded-2xl border border-[#E7E9F3] bg-white px-4 py-3"><p className="inline-flex items-center gap-1 text-base font-semibold text-violet-600"><Sparkles className="size-4" />AI 简历建议</p><p className="mt-1 text-sm text-slate-500">你的简历还有提升空间，补充量化成果可显著提高通过率</p></div>
        <div className="mb-5 grid grid-cols-2 gap-3"><Link href="/editor/new?source=ai" className="rounded-2xl border border-violet-300 bg-white py-3 text-center font-semibold text-violet-600">AI 优化</Link><Link href="/editor" className="rounded-2xl bg-gradient-to-r from-violet-700 to-violet-500 py-3 text-center font-semibold text-white">预览简历</Link></div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white"><div className="mx-auto grid max-w-md grid-cols-3 py-2 text-center text-sm text-slate-400"><span className="text-violet-600">简历</span><span>模板</span><span>我的</span></div></nav>
    </main>
  );
}
