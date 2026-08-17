import { NextRequest, NextResponse } from 'next/server';
import { extractAIConfig, AIConfigError } from '@/lib/ai/provider';
import { analyzeJdMatch } from '@/lib/ai/analyze-jd-match';
import { jdAnalysisInputSchema } from '@/lib/ai/jd-analysis-schema';
import { applyRateLimit } from '@/lib/ai/with-rate-limit';

const MAX_JD_LENGTH = 5000;

/**
 * POST /next-api/ai/jd-analysis
 *
 * LLM-based JD match analysis. Resume is sent from the client (Zustand state).
 * Internal beta: no quota check.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const limited = await applyRateLimit(request);
    if (limited) return limited;

    const body = await request.json();
    const parsed = jdAnalysisInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: '请求格式不正确', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const jobDescription = parsed.data.jobDescription.trim();
    if (!jobDescription) {
      return NextResponse.json({ error: '请先粘贴目标岗位 JD' }, { status: 400 });
    }

    const aiConfig = extractAIConfig(request);
    const result = await analyzeJdMatch({
      resumeData: parsed.data.resumeData,
      jobDescription: jobDescription.slice(0, MAX_JD_LENGTH),
      aiConfig,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AIConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[jd-analysis] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
