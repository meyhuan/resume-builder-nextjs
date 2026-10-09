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
    return await withQuotaCheck('ai:editor-assist', async () => {
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
          // Fixed-interval heartbeat to prevent timeout even when model is slow
          const HEARTBEAT_INTERVAL_MS = 15000;
          let lastHeartbeat = Date.now();
          let heartbeatTimer: NodeJS.Timeout | null = null;

          const sendHeartbeat = () => {
            const now = Date.now();
            if (now - lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
              controller.enqueue(
                encoder.encode(JSON.stringify({ type: 'progress' }) + '\n')
              );
              lastHeartbeat = now;
            }
          };

          // Start fixed-interval heartbeat timer
          heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

          try {
            const generator = streamInterviewPrep({
              resumeData,
              jobDescription: jobDescription.slice(0, MAX_INTERVIEW_PREP_JD_LENGTH),
              aiConfig,
              signal: request.signal,
            });

            let result;
            let chunkCount = 0;
            const THROTTLE_EVERY_N_CHUNKS = 10;

            // Stream progress heartbeats to prevent proxy timeout
            // The generator yields string chunks and returns the final InterviewPrepOutput
            while (true) {
              const { done, value } = await generator.next();
              
              if (done) {
                // The return value is in value when done is true
                result = value;
                break;
              }
              
              // Throttle progress events - only send every Nth chunk
              chunkCount++;
              if (chunkCount % THROTTLE_EVERY_N_CHUNKS === 0) {
                sendHeartbeat();
              }
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
          } finally {
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer);
            }
          }
        },
        cancel() {
          // Client disconnected - the request signal will abort the generator
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
