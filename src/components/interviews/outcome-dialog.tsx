'use client'

import type { FormEvent, ReactElement } from 'react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { OUTCOME_REASON_CODES, OUTCOME_REASON_LABEL, OUTCOME_RESULTS, OUTCOME_RESULT_LABEL } from '@/lib/interviews/interview-contracts'

interface OutcomeDraft { readonly result: string; readonly replyReceived: boolean; readonly interviewReached: number; readonly offerReceived: boolean; readonly reasonCodes: readonly string[]; readonly note: string | null }

export function OutcomeDialog({ applicationId, outcome }: { readonly applicationId: string; readonly outcome?: OutcomeDraft | null }): ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setBusy(true)
    const form = new FormData(event.currentTarget)
    const payload = { result: String(form.get('result')), replyReceived: form.get('replyReceived') === 'on', interviewReached: Number(form.get('interviewReached') || 0), offerReceived: form.get('offerReceived') === 'on', reasonCodes: form.getAll('reasonCodes').map(String), note: String(form.get('note') || '') }
    try {
      const response = await fetch(`/next-api/applications/${applicationId}/outcome`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || '保存结果失败')
      toast.success('结果反馈已保存')
      setOpen(false); router.refresh()
    } catch (error) { toast.error(error instanceof Error ? error.message : '保存失败') } finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger asChild><Button size="sm" variant="outline" className="border-emerald-200 bg-white text-emerald-700"><ClipboardCheck />{outcome ? '更新结果' : '记录结果'}</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-[620px]"><DialogHeader><DialogTitle>投递结果反馈</DialogTitle><DialogDescription>用于个人复盘，可随时更新；页面只描述历史事实，不推断录用概率。</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><label className="block text-sm font-medium text-slate-700">当前结果<select name="result" defaultValue={outcome?.result ?? 'ONGOING'} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal">{OUTCOME_RESULTS.map((result) => <option key={result} value={result}>{OUTCOME_RESULT_LABEL[result]}</option>)}</select></label><div className="grid gap-2 sm:grid-cols-2"><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600"><input type="checkbox" name="replyReceived" defaultChecked={outcome?.replyReceived} />收到过回复</label><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600"><input type="checkbox" name="offerReceived" defaultChecked={outcome?.offerReceived} />获得 Offer</label></div><label className="block text-sm font-medium text-slate-700">进入第几轮面试<input name="interviewReached" type="number" min={0} max={20} defaultValue={outcome?.interviewReached ?? 0} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 font-normal" /></label><fieldset><legend className="text-sm font-medium text-slate-700">可能原因（可多选）</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{OUTCOME_REASON_CODES.map((code) => <label key={code} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"><input type="checkbox" name="reasonCodes" value={code} defaultChecked={outcome?.reasonCodes.includes(code)} />{OUTCOME_REASON_LABEL[code]}</label>)}</div></fieldset><label className="block text-sm font-medium text-slate-700">补充说明<textarea name="note" defaultValue={outcome?.note ?? ''} rows={4} maxLength={6000} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal leading-6" /></label><DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>取消</Button><Button type="submit" disabled={busy} className="bg-emerald-600 text-white hover:bg-emerald-700">{busy && <Loader2 className="animate-spin" />}保存结果</Button></DialogFooter></form></DialogContent></Dialog>
}

