"use client";
import { useState } from "react";
import type { FillMetrics } from "@/features/extension-analytics/report";
import { getStoredAdminPassword, setStoredAdminPassword } from "@/lib/admin-auth";

interface Report { rows:FillMetrics[]; total:number; sampled:number; truncated:boolean }
export default function ExtensionMetricsPage() {
  const [password,setPassword]=useState("");
  const [days,setDays]=useState(7);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [report,setReport]=useState<Report|null>(null);
  async function load(event:React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const credential=password || getStoredAdminPassword();
    try {
      const response=await fetch("/next-api/admin/extension-metrics",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({adminPassword:credential,days})});
      const data=await response.json();
      if (!response.ok) throw new Error(data.error || "读取失败");
      setStoredAdminPassword(credential); setReport(data);
    } catch (cause) {setError(cause instanceof Error ? cause.message : "读取失败");setReport(null);}
    finally {setBusy(false);}
  }
  return <section className="space-y-5">
    <header><h1 className="text-xl font-semibold text-slate-900">插件填写效果</h1><p className="mt-2 text-sm text-slate-500">直接读取已落库并去重的填写结果，按招聘站点和插件版本排查问题。</p></header>
    <form onSubmit={load} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <label className="text-sm text-slate-600">管理员密码<input type="password" autoComplete="off" value={password} onChange={e=>setPassword(e.target.value)} placeholder="已验证时可使用当前会话" className="mt-1 block rounded-lg border border-slate-300 px-3 py-2" /></label>
      <label className="text-sm text-slate-600">统计范围<select value={days} onChange={e=>setDays(Number(e.target.value))} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2">{[1,7,30,90].map(day=><option key={day} value={day}>最近{day}天</option>)}</select></label>
      <button disabled={busy} className="rounded-lg bg-violet-600 px-4 py-2 text-sm text-white disabled:opacity-50">{busy?"读取中…":"查询填写效果"}</button>
    </form>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <p className="text-sm leading-6 text-slate-600">写入成功率＝新增填写÷（新增填写＋写入失败）。原本有值不算本次成功；未识别字段和资料缺项单独统计。字段成功不代表招聘网站接受保存或投递。</p>
    {report && <>
      <p className="text-sm text-slate-600">共 {report.total} 次填写结果。{report.truncated && `当前仅展示最近${report.sampled}次，请缩短统计范围，勿当作全量统计。`}</p>
      {report.rows.length===0 ? <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">该范围暂无已入库的填写结果。请完成一次插件填写后再查询。</div> : <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full whitespace-nowrap text-left text-sm">
        <caption className="sr-only">按站点及插件版本分组的填写效果</caption>
        <thead className="bg-slate-50 text-slate-600"><tr>{["站点 / 版本","填写次数","完整 / 部分 / 失败","新增填写","已有值","写入失败","未识别","资料缺项","写入成功率","缺少具体日","新增区块失败","平均耗时"].map(title=><th key={title} scope="col" className="px-4 py-3 font-medium">{title}</th>)}</tr></thead>
        <tbody>{report.rows.map(row=><tr key={`${row.domain}:${row.version}`} className="border-t border-slate-100"><th scope="row" className="px-4 py-3 font-normal"><span>{row.domain}</span><span className="block text-xs text-slate-500">{row.version}</span></th>{[row.runs,`${row.successfulRuns} / ${row.partialRuns} / ${row.failedRuns}`,row.filled,row.existing,row.failed,row.unmatched,row.missing,row.writableSuccessRate===null?"—":`${(row.writableSuccessRate*100).toFixed(1)}%`,row.datePrecisionMissing,row.repeatersFailed,`${(row.averageDurationMs/1000).toFixed(1)}秒`].map((value,i)=><td key={i} className="px-4 py-3 text-slate-700">{value}</td>)}</tr>)}</tbody>
      </table></div>}
    </>}
  </section>;
}
