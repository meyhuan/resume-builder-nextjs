'use client';

import { useState, type FormEvent, type ReactElement } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
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
    <section className="rounded-2xl border border-violet-100 bg-white p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-2 text-slate-900">
        <Sparkles className="w-5 h-5 text-violet-500" />
        <h2 className="text-2xl font-extrabold">JD 匹配度分析</h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目标岗位</span>
          <input
            value={targetRole}
            onChange={(event) => setTargetRole(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="例如：AI产品经理、AIGC运营、RAG工程师"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">目标岗位 JD</span>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="mt-2 min-h-40 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="粘贴招聘网站上的岗位职责、任职要求和加分项"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-slate-700">你的简历文本</span>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            className="mt-2 min-h-44 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
            placeholder="粘贴简历中的个人优势、项目经历、工作经历和技能栏"
          />
        </label>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          开始分析
        </button>
      </form>

      {error ? (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {result ? (
        <div className="mt-8 space-y-6">
          <div className="rounded-2xl bg-violet-50 p-6">
            <div className="text-sm font-semibold text-violet-700">匹配分</div>
            <div className="mt-2 text-5xl font-extrabold text-violet-700">{result.score}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              这是基于 JD 关键词和简历文本的粗略匹配度，适合判断优先优化方向。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <KeywordPanel title="已覆盖关键词" keywords={result.matchedKeywords} emptyText="暂未识别到已覆盖关键词" tone="success" />
            <KeywordPanel title="建议补充关键词" keywords={result.missingKeywords} emptyText="暂无明显缺失关键词" tone="warning" />
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
            <h3 className="font-extrabold text-slate-900">优先优化建议</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {result.prioritySuggestions.map((suggestion) => (
                <li key={suggestion}>· {suggestion}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.sectionSuggestions.map((suggestion) => (
              <article key={suggestion.section} className="rounded-2xl border border-slate-100 bg-white p-5">
                <h3 className="font-extrabold text-slate-900">{suggestion.section}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{suggestion.issue}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{suggestion.suggestion}</p>
              </article>
            ))}
          </div>

          <div className="rounded-2xl border border-violet-100 bg-white p-5">
            <h3 className="font-extrabold text-slate-900">下一步</h3>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              {result.nextActions.map((action) => (
                <li key={action} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-violet-500 shrink-0 mt-1" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
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
  const toneClass = tone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5">
      <h3 className="font-extrabold text-slate-900">{title}</h3>
      <div className="mt-4 flex flex-wrap gap-2">
        {keywords.length > 0 ? keywords.map((keyword) => (
          <span key={keyword} className={`rounded-full px-3 py-1 text-xs font-semibold ${toneClass}`}>
            {keyword}
          </span>
        )) : (
          <span className="text-sm text-slate-400">{emptyText}</span>
        )}
      </div>
    </section>
  );
}
