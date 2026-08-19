'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { JdMatchResponse } from '@/lib/seo/jd-match';

type ApiJdMatchResponse = JdMatchResponse & {
  readonly error?: string;
};

export function JdMatchTool(): ReactElement {
  const [targetRole, setTargetRole] = useState<string>('AI产品经理');
  const [jobDescription, setJobDescription] = useState<string>('');
  const [resumeText, setResumeText] = useState<string>('');
  const [result, setResult] = useState<JdMatchResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsLoading(true);
    try {
      const response = await fetch('/next-api/ai/jd-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetRole,
          jobDescription,
          resumeText,
        }),
      });
      const data = await response.json() as ApiJdMatchResponse;
      if (!response.ok) {
        throw new Error(data.error || '分析失败，请稍后再试');
      }
      setResult(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '分析失败，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">目标岗位</span>
          <input
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            placeholder="例如：产品经理、前端开发"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">目标岗位 JD</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="mt-2 min-h-36 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            placeholder="粘贴岗位职责、任职要求和加分项"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-slate-700">你的简历文本</span>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            className="mt-2 min-h-40 w-full resize-y rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 outline-none focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            placeholder="粘贴个人优势、项目经历、工作经历和技能"
          />
        </label>

        {error ? (
          <div className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading} className="bg-violet-600 text-white hover:bg-violet-700">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isLoading ? '正在分析…' : '开始分析'}
          </Button>
        </div>
      </form>

      {result ? (
        <div className="space-y-6 border-t border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-sm text-slate-500">匹配分</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{result.score}</p>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              基于 JD 关键词和简历文本的粗略覆盖度，用来判断先改哪里。
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <KeywordPanel title="已覆盖" keywords={result.matchedKeywords} emptyText="暂未识别到已覆盖关键词" tone="success" />
            <KeywordPanel title="建议补充" keywords={result.missingKeywords} emptyText="暂无明显缺失关键词" tone="warning" />
          </div>

          {result.prioritySuggestions.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium text-slate-800">优先优化</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
                {result.prioritySuggestions.map((suggestion) => (
                  <li key={suggestion}>· {suggestion}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.sectionSuggestions.length > 0 ? (
            <div className="space-y-4">
              <h2 className="text-sm font-medium text-slate-800">分模块建议</h2>
              {result.sectionSuggestions.map((suggestion) => (
                <div key={suggestion.section} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                  <h3 className="text-sm font-medium text-slate-800">{suggestion.section}</h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{suggestion.issue}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{suggestion.suggestion}</p>
                </div>
              ))}
            </div>
          ) : null}

          {result.nextActions.length > 0 ? (
            <div>
              <h2 className="text-sm font-medium text-slate-800">下一步</h2>
              <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
                {result.nextActions.map((action) => (
                  <li key={action}>· {action}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

type KeywordPanelProps = {
  readonly title: string;
  readonly keywords: readonly string[];
  readonly emptyText: string;
  readonly tone: 'success' | 'warning';
};

function KeywordPanel({ title, keywords, emptyText, tone }: KeywordPanelProps): ReactElement {
  const toneClass = tone === 'success'
    ? 'bg-emerald-50 text-emerald-800'
    : 'bg-amber-50 text-amber-800';
  return (
    <div>
      <h2 className="text-sm font-medium text-slate-800">{title}</h2>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {keywords.length > 0 ? keywords.map((keyword) => (
          <span key={keyword} className={`rounded-md px-2 py-0.5 text-xs ${toneClass}`}>
            {keyword}
          </span>
        )) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </div>
  );
}
