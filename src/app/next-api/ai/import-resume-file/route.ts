import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';
import DocmindApi, {
  SubmitDocStructureJobAdvanceRequest,
  GetDocStructureResultRequest,
} from '@alicloud/docmind-api20220711';
import OpenAI from 'openai';
import { checkQuota } from '@/lib/quota/quota-checker';
import { applyRateLimit } from '@/lib/ai/with-rate-limit';
import { getDefaultModel, resolveApiKey } from '@/lib/ai/ai-config';
import { buildImportSystemPrompt, buildImportUserPrompt } from '@/lib/ai/import-prompt-builder';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_COUNT = 20;
const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'bmp', 'tif', 'gif',
]);

// ---------------------------------------------------------------------------
// DocMind SDK client
// ---------------------------------------------------------------------------

function createDocmindClient(accessKeyId: string, accessKeySecret: string): DocmindApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    accessKeyId,
    accessKeySecret,
    endpoint: 'docmind-api.cn-hangzhou.aliyuncs.com',
  };
  return new DocmindApi(config);
}

// ---------------------------------------------------------------------------
// DocMind: submit job with file stream
// ---------------------------------------------------------------------------

async function submitDocmindJob(
  client: DocmindApi,
  fileBuffer: Buffer,
  fileName: string,
): Promise<string> {
  console.log('[DocMind] submitDocmindJob start, fileName:', fileName, 'bufferSize:', fileBuffer.byteLength);
  const request = new SubmitDocStructureJobAdvanceRequest({
    fileName,
    fileUrlObject: Readable.from(fileBuffer),
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const runtime: any = { connectTimeout: 60000, readTimeout: 60000 };
  let response: Awaited<ReturnType<typeof client.submitDocStructureJobAdvance>>;
  try {
    response = await client.submitDocStructureJobAdvance(request, runtime);
  } catch (sdkErr) {
    console.error('[DocMind] submitDocStructureJobAdvance threw:', sdkErr);
    throw sdkErr;
  }
  console.log('[DocMind] submit response statusCode:', response.statusCode);
  console.log('[DocMind] submit response body:', JSON.stringify(response.body));
  const jobId = response.body?.data?.id;
  if (!jobId) {
    throw new Error('文档解析任务提交失败，响应: ' + JSON.stringify(response.body));
  }
  return jobId;
}

// ---------------------------------------------------------------------------
// DocMind: poll for result and extract text from layouts
// ---------------------------------------------------------------------------

interface DocmindLayout {
  text?: string;
}

async function pollDocmindResult(client: DocmindApi, jobId: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLL_COUNT; attempt++) {
    console.log(`[DocMind] poll attempt ${attempt + 1}/${MAX_POLL_COUNT}, jobId:`, jobId);
    const request = new GetDocStructureResultRequest({ id: jobId });
    let response: Awaited<ReturnType<typeof client.getDocStructureResult>>;
    try {
      response = await client.getDocStructureResult(request);
    } catch (sdkErr) {
      console.error('[DocMind] getDocStructureResult threw:', sdkErr);
      throw sdkErr;
    }
    const body = response.body;
    console.log(`[DocMind] poll response statusCode: ${response.statusCode}, completed: ${body?.completed}, status: ${body?.status}`);

    if (body?.completed) {
      const status = (body.status ?? '').toLowerCase();
      console.log('[DocMind] job finished, status:', status);
      if (status !== 'success') {
        console.error('[DocMind] job failed, body:', JSON.stringify(body));
        throw new Error(body.message || '文档解析失败，请稍后重试');
      }
      console.log('[DocMind] data keys:', Object.keys((body.data as object) ?? {}));
      return extractTextFromLayouts(body.data);
    }

    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error('文档解析超时，请稍后重试');
}

function extractTextFromLayouts(data: unknown): string {
  if (!data || typeof data !== 'object') {
    console.warn('[DocMind] extractTextFromLayouts: data is empty or not object, got:', typeof data);
    return '';
  }
  const layouts = (data as Record<string, unknown>).layouts;
  console.log('[DocMind] layouts type:', typeof layouts, 'isArray:', Array.isArray(layouts), 'length:', Array.isArray(layouts) ? layouts.length : 'N/A');
  if (!Array.isArray(layouts)) return '';
  const text = (layouts as DocmindLayout[])
    .filter((l) => typeof l.text === 'string' && l.text.trim().length > 0)
    .map((l) => l.text!.trim())
    .join('\n');
  console.log('[DocMind] extracted text length:', text.length);
  return text;
}

// ---------------------------------------------------------------------------
// LLM: parse extracted text into ExternalResume JSON
// ---------------------------------------------------------------------------

async function parseTextWithLLM(resumeText: string): Promise<unknown> {
  const model = getDefaultModel();
  const apiKey = resolveApiKey(model);
  const client = new OpenAI({ apiKey, baseURL: model.baseUrl });

  const response = await client.chat.completions.create({
    model: model.name,
    messages: [
      { role: 'system', content: buildImportSystemPrompt() },
      { role: 'user', content: buildImportUserPrompt(resumeText) },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    response_format: { type: 'json_object' },
    stream: false,
  });

  const content = response.choices[0]?.message?.content ?? '';
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return JSON.parse(cleaned);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

/**
 * POST /next-api/ai/import-resume-file
 *
 * Accepts multipart form upload (field: "file").
 * 1. Submits file to Aliyun DocMind SDK for text extraction.
 * 2. Polls until job completes and extracts text from layouts.
 * 3. Sends extracted text to LLM to parse into ExternalResume JSON.
 * 4. Returns { resumeData } to the frontend.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const quota = await checkQuota('ai:import-section');
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.message, quotaExceeded: true, remaining: quota.remaining },
        { status: 429 },
      );
    }

    const rateLimitResponse = await applyRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

    const accessKeyId = process.env.ALIYUN_DOCMIND_ACCESS_KEY_ID ?? '';
    const accessKeySecret = process.env.ALIYUN_DOCMIND_ACCESS_KEY_SECRET ?? '';
    if (!accessKeyId || !accessKeySecret) {
      return NextResponse.json({ error: '文档解析服务未配置，请联系管理员' }, { status: 503 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: '请上传简历文件' }, { status: 400 });
    }

    const fileName = file.name;
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        { error: '不支持的文件格式，请上传 Word、PDF 或图片文件' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过 8MB' }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const docmindClient = createDocmindClient(accessKeyId, accessKeySecret);

    console.log(`[import-resume-file] Submitting DocMind job: ${fileName} (${fileBuffer.byteLength} bytes)`);
    const jobId = await submitDocmindJob(docmindClient, fileBuffer, fileName);

    console.log(`[import-resume-file] Polling DocMind job: ${jobId}`);
    const extractedText = await pollDocmindResult(docmindClient, jobId);

    if (!extractedText.trim()) {
      return NextResponse.json({ error: '简历内容为空，请检查文件是否正确' }, { status: 422 });
    }

    console.log(`[import-resume-file] Extracted ${extractedText.length} chars, calling LLM`);
    const resumeData = await parseTextWithLLM(extractedText);

    return NextResponse.json({ resumeData });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[import-resume-file] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
