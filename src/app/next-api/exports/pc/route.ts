import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { saveExportTemp } from '@/lib/export-temp-store';
import { uploadExportAsset } from '@/lib/upload-export-asset';
import { checkQuotaForUser, peekQuotaForUser } from '@/lib/quota/quota-checker';

function getStringField(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeFileName(value: string): string {
  return (value || 'resume').replace(/[/:*?"<>|]/g, '_');
}

export async function POST(req: Request): Promise<NextResponse> {
  const cookieStore = await cookies();
  const wxId = cookieStore.get('auth_uid')?.value || '';
  if (!wxId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get('file');
  const resumeId = getStringField(form, 'resumeId');
  const templateId = getStringField(form, 'templateId') || null;
  const requestedFileName = sanitizeFileName(getStringField(form, 'fileName'));

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing PDF file' }, { status: 400 });
  }
  if (!resumeId) {
    return NextResponse.json({ error: 'Missing resumeId' }, { status: 400 });
  }

  const resume = await prisma.resume.findFirst({
    where: { id: resumeId, user: { wxId } },
    select: { id: true, title: true, template: true, userId: true },
  });
  if (!resume) {
    return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  }

  const quotaPeek = await peekQuotaForUser(wxId, 'pdf:export');
  if (!quotaPeek.allowed) {
    return NextResponse.json({
      error: quotaPeek.message,
      quotaExceeded: true,
      remaining: quotaPeek.remaining,
      isVip: quotaPeek.isVip,
    }, { status: 429 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = requestedFileName || sanitizeFileName(resume.title);
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

  const ossAsset = await uploadExportAsset({
    token: saved.token,
    buffer,
    contentType: 'application/pdf',
    extension: 'pdf',
  });

  const consumed = await checkQuotaForUser(wxId, 'pdf:export');
  if (!consumed.allowed) {
    return NextResponse.json({
      error: consumed.message,
      quotaExceeded: true,
      remaining: consumed.remaining,
      isVip: consumed.isVip,
    }, { status: 429 });
  }

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

  return NextResponse.json({
    id: saved.token,
    type: 'pdf',
    fileName,
    downloadUrl: `/next-api/export-file/${saved.token}`,
    expiresAt: new Date(saved.expiresAt).toISOString(),
    remaining: consumed.remaining,
    isVip: consumed.isVip,
  });
}
