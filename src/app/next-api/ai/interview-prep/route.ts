import { NextRequest, NextResponse } from 'next/server';
import { extractAIConfig, AIConfigError } from '@/lib/ai/provider';
import { streamInterviewPrep } from '@/lib/ai/interview-prep';
import {
  interviewPrepInputSchema,
  MAX_INTERVIEW_PREP_JD_LENGTH,
} from '@/lib/ai/interview-prep-schema';
import { withQuotaCheck } from '@/lib/quota/quota-guard';

export const maxDuration = 180;

/**
 * POST /next-api/ai/interview-prep
 *
 * Resume + optional JD → BOSS greetings, self-intro, interview Q&A, optional cover letter.
 * Streams NDJSON progress events to prevent proxy timeout on long LLM generations.
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

      // Stream NDJSON to keep the connection alive during long generation
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            const generator = streamInterviewPrep({
              resumeData,
              jobDescription: jobDescription.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH),
              aiConfig,
            });

            let result;
            // Stream progress heartbeats to prevent proxy timeout
            // The generator yields string chunks and returns the final InterviewPrepOutput
            while (true) {
              const { done, value } = await generator.next();
              
              if (done) {
                // The return value is in value when done is true
                result = value;
                break;
              }
              
              // Each yielded chunk is a progress indicator
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'progress' }) + '\n')
              );
            }

            if (!result) {
              throw new Error('生成器未返回结果');
            }

            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'result', data: result }) + '\n')
            );
            controller.close();
          } catch (error) {
            const message = error instanceof Error ? error.message : '面试准备生成失败';
            controller.enqueue(
              encoder.encode(JSON.stringify({ type: 'error', error: message }) + '\n')
            );
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'X-Accel-Buffering': 'no',
        },
      });
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
