import { NextRequest, NextResponse } from 'next/server';
import { extractAIConfig, AIConfigError } from '@/lib/ai/provider';
import { generateInterviewPrep } from '@/lib/ai/interview-prep';
import {
  interviewPrepInputSchema,
  MAX_INTERVIEW_PREP_JD_LENGTH,
} from '@/lib/ai/interview-prep-schema';
import { withCareerQuota } from '@/lib/quota/career-quota-guard';

/**
 * POST /next-api/ai/interview-prep
 *
 * Resume + optional JD → BOSS greetings, self-intro, interview Q&A, optional cover letter.
 */
export async function POST(request: NextRequest): Promise<Response> {
  const started = performance.now();
  const timings: Record<string, number> = {};
  let part = 'unknown';
  let status = 500;
  try {
    const response = await withCareerQuota(async () => {
      timings.quota = performance.now() - started;
      const validationStart = performance.now();
      const body = await request.json();
      const parsed = interviewPrepInputSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: '请求格式不正确', details: parsed.error.issues },
          { status: 400 },
        );
      }

      const jobDescription = (parsed.data.jobDescription ?? '').trim();

      const resumeData = parsed.data.resumeData;
      if (!resumeData?.sections) {
        return NextResponse.json({ error: '缺少简历数据' }, { status: 400 });
      }

      part = parsed.data.part;
      const aiConfig = extractAIConfig(request);
      timings.validation = performance.now() - validationStart;
      const result = await generateInterviewPrep({
        resumeData,
        jobDescription: jobDescription.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH),
        aiConfig,
        part: parsed.data.part,
        signal: request.signal,
        onTiming: (stage, duration) => { timings[stage] = duration; },
      });

      return NextResponse.json(result);
    });
    status = response.status;
    return response;
  } catch (error) {
    if (error instanceof AIConfigError) {
      status = 503;
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[interview-prep] Error:', message);
    return NextResponse.json({ error: '面试准备生成失败' }, { status: 500 });
  } finally {
    console.info('[interview-prep] timing', { part, status, ...Object.fromEntries(Object.entries(timings).map(([key, value]) => [key + 'Ms', Math.round(value)])), totalMs: Math.round(performance.now() - started) });
  }
}
