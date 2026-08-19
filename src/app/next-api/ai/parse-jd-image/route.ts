import { NextRequest, NextResponse } from 'next/server';
import { extractJdTextFromImage } from '@/lib/ai/parse-jd-image';
import { getRateLimitIdentity } from '@/lib/ai/get-rate-limit-identity';
import { consumeRateLimit } from '@/lib/ai/rate-limiter';
import { MAX_JD_ANALYSIS_JD_LENGTH } from '@/lib/ai/jd-analysis-schema';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const OCR_LIMIT_ANONYMOUS = 8;
const OCR_LIMIT_AUTHENTICATED = 20;

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/bmp',
]);

interface UploadedFormFile {
  name: string;
  type: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
}

function getUploadedFormFile(value: FormDataEntryValue | null): UploadedFormFile | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<UploadedFormFile>;
  if (
    typeof candidate.name !== 'string'
    || typeof candidate.size !== 'number'
    || typeof candidate.arrayBuffer !== 'function'
  ) {
    return null;
  }
  return {
    name: candidate.name,
    type: typeof candidate.type === 'string' ? candidate.type : '',
    size: candidate.size,
    arrayBuffer: () => candidate.arrayBuffer!.call(value),
  };
}

function resolveMimeType(file: UploadedFormFile): string | null {
  const type = file.type.toLowerCase();
  if (ALLOWED_MIME_TYPES.has(type)) {
    return type === 'image/jpg' ? 'image/jpeg' : type;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'bmp') return 'image/bmp';
  return null;
}

/**
 * POST /next-api/ai/parse-jd-image
 *
 * OCR a JD screenshot (BOSS / 智联 / 猎聘) into plain text.
 * Does not consume editor-assist quota; uses a dedicated daily rate limit.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const { identifier, isAuthenticated } = await getRateLimitIdentity(request);
    const rate = consumeRateLimit(
      `jd-ocr:${identifier}`,
      isAuthenticated ? OCR_LIMIT_AUTHENTICATED : OCR_LIMIT_ANONYMOUS,
    );
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: isAuthenticated
            ? '今日截图识别次数已用完，请直接粘贴文字，或明天再试'
            : '今日截图识别次数已用完，登录后次数更多，也可直接粘贴文字',
          rateLimitExceeded: true,
        },
        { status: 429 },
      );
    }

    const formData = await request.formData();
    const file = getUploadedFormFile(formData.get('file'));
    if (!file) {
      return NextResponse.json({ error: '请上传职位截图' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: '截图不能超过 5MB' }, { status: 400 });
    }
    const mimeType = resolveMimeType(file);
    if (!mimeType) {
      return NextResponse.json({ error: '请上传 PNG、JPG 或 WebP 截图' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractJdTextFromImage({ buffer, mimeType });
    if (!text || text.length < 20) {
      return NextResponse.json({ error: '没识别到职位描述，请换一张包含职责和要求的截图' }, { status: 422 });
    }

    return NextResponse.json({
      text: text.slice(0, MAX_JD_ANALYSIS_JD_LENGTH),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '服务器内部错误';
    console.error('[parse-jd-image] Error:', message);
    return NextResponse.json({ error: '截图识别失败，请稍后重试或直接粘贴文字' }, { status: 500 });
  }
}
