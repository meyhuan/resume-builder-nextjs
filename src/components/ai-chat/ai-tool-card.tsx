'use client';

import type { ReactElement } from 'react';
import { Check, Loader2 } from 'lucide-react';
import {
  collectProposalsFromOutput,
  describeProposal,
} from '@/components/ai-chat/apply-block-change';
import type { JdAnalysisOutput } from '@/lib/ai/jd-analysis-schema';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function getToolName(part: { type?: string }): string {
  return typeof part.type === 'string' ? part.type.replace(/^tool-/, '') : '';
}

export function AiToolCard(props: {
  readonly part: Record<string, unknown>;
}): ReactElement {
  const toolName = getToolName(props.part);
  const state = typeof props.part.state === 'string' ? props.part.state : '';
  const output = props.part.output;
  const isRunning = state !== 'output-available' && state !== 'output-error';

  if (isRunning) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-violet-700">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        正在调用 {toolName}…
      </div>
    );
  }

  if (state === 'output-error') {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-600">
        工具失败：{toolName}
      </div>
    );
  }

  const proposals = collectProposalsFromOutput(output);
  if (proposals.length > 0) {
    return (
      <div className="space-y-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
          <Check className="h-3.5 w-3.5" />
          已写入简历 · {proposals.length} 处改动
        </div>
        {proposals.length <= 4 && (
          <ul className="space-y-0.5 text-[11px] text-emerald-700">
            {proposals.map((proposal, index) => (
              <li key={`${describeProposal(proposal)}-${index}`}>{describeProposal(proposal)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (toolName === 'analyzeJdMatch' && isRecord(output) && isRecord(output.analysis)) {
    return <JdResultCard result={output.analysis as unknown as JdAnalysisOutput} />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
      已完成工具：{toolName}
    </div>
  );
}

function JdResultCard(props: { readonly result: JdAnalysisOutput }): ReactElement {
  return (
    <div className="rounded-xl border border-violet-200 bg-white px-3 py-3 space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-slate-700">岗位匹配分析</span>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">
          {Math.round(props.result.overallScore)} 分
        </span>
      </div>
      <p className="text-slate-600 leading-relaxed">{props.result.summary}</p>
      {props.result.missingKeywords.length > 0 && (
        <p className="text-[11px] text-amber-700">缺失关键词：{props.result.missingKeywords.slice(0, 8).join('、')}</p>
      )}
    </div>
  );
}
