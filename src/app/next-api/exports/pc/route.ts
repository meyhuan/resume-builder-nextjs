import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';
import { saveExportTemp } from '@/lib/export-temp-store';
import { uploadExportAsset } from '@/lib/upload-export-asset';
import { checkQuota, peekQuota } from '@/lib/quota/quota-checker';
import { sanitizeExportFileName } from '@/lib/export-file-name';

const OSS_UPLOAD_TIMEOUT_MS = 30_000;

function getStringField(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function logStage(requestId: string, stage: string, fields: Record<string, unknown> = {}): void {
  console.log('[exports/pc]', { requestId, stage, ...fields });
}

function logFailure(requestId: string, stage: string, error: unknown, fields: Record<string, unknown> = {}): void {
  console.error('[exports/pc] failed', {
    requestId,
    stage,
    error: error instanceof Error ? error.message : String(error),
    ...fields,
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function POST(req: Request): Promise<NextResponse> {
  const requestId = randomUUID().slice(0, 8);
  const startedAt = Date.now();
  let stage = 'init';

  try {
    const cookieStore = await cookies();
    const wxId = cookieStore.get('auth_uid')?.value || '';
    if (!wxId) {
      logStage(requestId, 'unauthorized', { elapsedMs: Date.now() - startedAt });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    stage = 'parse-form';
    const form = await req.formData();
    const file = form.get('file');
    const resumeId = getStringField(form, 'resumeId');
    const templateId = getStringField(form, 'templateId') || null;
    const requestedFileNameField = getStringField(form, 'fileName');
    const requestedFileName = requestedFileNameField ? sanitizeExportFileName(requestedFileNameField) : '';

    if (!(file instanceof Blob)) {
      logStage(requestId, 'missing-file', { resumeId, elapsedMs: Date.now() - startedAt });
      return NextResponse.json({ error: 'Missing PDF file' }, { status: 400 });
    }
    if (!resumeId) {
      logStage(requestId, 'missing-resume-id', { elapsedMs: Date.now() - startedAt });
      return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 });
    }
    logStage(requestId, 'parsed-form', {
      resumeId,
      templateId,
      fileBytes: file.size,
      elapsedMs: Date.now() - startedAt,
    });

    stage = 'load-resume';
    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, user: { wxId } },
      select: { id: true, title: true, template: true, userId: true },
    });
    if (!resume) {
      logStage(requestId, 'resume-not-found', { resumeId, elapsedMs: Date.now() - startedAt });
      return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
    }

    stage = 'peek-quota';
    const quotaPeek = await peekQuota('pdf:export');
    if (!quotaPeek.allowed) {
      logStage(requestId, 'quota-blocked', { resumeId, remaining: quotaPeek.remaining, elapsedMs: Date.now() - startedAt });
      return NextResponse.json({
        error: quotaPeek.message,
        quotaExceeded: true,
        remaining: quotaPeek.remaining,
        isVip: quotaPeek.isVip,
      }, { status: 429 });
    }

    stage = 'read-file';
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = requestedFileName || sanitizeExportFileName(resume.title);

    stage = 'save-temp';
    const saved = await saveExportTemp({
      buffer,
      fileName,
      contentType: 'application/pdf',
      extension: 'pdf',
      type: 'pdf',
      confirmed: true,
      wxId,
      userId: resume.userId,
      resumeId: resume.id,
      resumeTitle: resume.title,
      templateId: templateId || resume.template || undefined,
    });
    logStage(requestId, 'saved-temp', { resumeId, token: saved.token, fileBytes: buffer.length, elapsedMs: Date.now() - startedAt });

    stage = 'upload-oss';
    const ossAsset = await withTimeout(uploadExportAsset({
      token: saved.token,
      buffer,
      contentType: 'application/pdf',
      extension: 'pdf',
    }), OSS_UPLOAD_TIMEOUT_MS, 'OSS upload');
    logStage(requestId, 'uploaded-oss', { resumeId, token: saved.token, ossKey: ossAsset.key, elapsedMs: Date.now() - startedAt });

    stage = 'consume-quota';
    const consumed = await checkQuota('pdf:export');
    if (!consumed.allowed) {
      logStage(requestId, 'quota-blocked-after-upload', { resumeId, remaining: consumed.remaining, elapsedMs: Date.now() - startedAt });
      return NextResponse.json({
        error: consumed.message,
        quotaExceeded: true,
        remaining: consumed.remaining,
        isVip: consumed.isVip,
      }, { status: 429 });
    }

    stage = 'upsert-export-record';
    await prisma.exportRecord.upsert({
      where: { token: saved.token },
      update: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: templateId || resume.template || null,
        type: 'pdf',
        fileName,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
        confirmedAt: new Date(),
      },
      create: {
        userId: resume.userId,
        wxId,
        resumeId: resume.id,
        resumeTitle: resume.title || fileName,
        templateId: templateId || resume.template || null,
        type: 'pdf',
        fileName,
        token: saved.token,
        ossKey: ossAsset.key,
        ossUrl: ossAsset.url,
        expiresAt: new Date(saved.expiresAt),
        status: 'available',
      },
    });
    logStage(requestId, 'done', { resumeId, token: saved.token, remaining: consumed.remaining, elapsedMs: Date.now() - startedAt });

    return NextResponse.json({
      id: saved.token,
      type: 'pdf',
      fileName,
      downloadUrl: `/next-api/export-file/${saved.token}`,
      expiresAt: new Date(saved.expiresAt).toISOString(),
      remaining: consumed.remaining,
      isVip: consumed.isVip,
    });
  } catch (error: unknown) {
    logFailure(requestId, stage, error, { elapsedMs: Date.now() - startedAt });
    return NextResponse.json({
      error: '导出保存失败，请稍后重试',
      requestId,
    }, { status: 500 });
  }
}
