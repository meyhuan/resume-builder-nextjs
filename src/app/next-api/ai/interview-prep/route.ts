import { NextRequest, NextResponse } from 'next/server';
import { extractAIConfig, AIConfigError } from '@/lib/ai/provider';
import { generateInterviewPrep } from '@/lib/ai/interview-prep';
import {
  interviewPrepInputSchema,
  MAX_INTERVIEW_PREP_JD_LENGTH,
} from '@/lib/ai/interview-prep-schema';
import { withQuotaCheck } from '@/lib/quota/quota-guard';

/**
 * POST /next-api/ai/interview-prep
 *
 * Resume + optional JD → BOSS greetings, self-intro, interview Q&A, optional cover letter.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    return withQuotaCheck('ai:editor-assist', async () => {
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

      const aiConfig = extractAIConfig(request);
      const result = await generateInterviewPrep({
        resumeData,
        jobDescription: jobDescription.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH),
        aiConfig,
      });

      return NextResponse.json(result);
    });
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[interview-prep] Error:', message);
    return NextResponse.json({ error: '面试准备生成失败' }, { status: 500 });
  }
}
