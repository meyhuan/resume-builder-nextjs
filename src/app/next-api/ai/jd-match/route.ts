import { NextRequest, NextResponse } from 'next/server';
import { withQuotaCheck } from '@/lib/quota/quota-guard';
import {
  analyzeJdMatch,
  MAX_JD_MATCH_JD_LENGTH,
  MAX_JD_MATCH_RESUME_LENGTH,
  type JdMatchRequest,
} from '@/lib/seo/jd-match';

function normalizeRequestBody(body: unknown): JdMatchRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }
  const record = body as Record<string, unknown>;
  return {
    jobDescription: typeof record.jobDescription === 'string' ? record.jobDescription : '',
    resumeText: typeof record.resumeText === 'string' ? record.resumeText : '',
    targetRole: typeof record.targetRole === 'string' ? record.targetRole : undefined,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = normalizeRequestBody(await request.json());
    if (!body) {
      return NextResponse.json({ error: '请求格式不正确' }, { status: 400 });
    }
    if (!body.jobDescription.trim()) {
      return NextResponse.json({ error: '请先粘贴目标岗位 JD' }, { status: 400 });
    }
    if (!body.resumeText.trim()) {
      return NextResponse.json({ error: '请先粘贴简历文本' }, { status: 400 });
    }

    return withQuotaCheck('ai:optimize-resume', async () => {
      const result = analyzeJdMatch(body);
      return NextResponse.json({
        ...result,
        limits: {
          jobDescription: MAX_JD_MATCH_JD_LENGTH,
          resumeText: MAX_JD_MATCH_RESUME_LENGTH,
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[jd-match] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
