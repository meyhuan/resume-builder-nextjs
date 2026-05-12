import type { ReactElement } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyPrintToken } from '@/lib/print-token'
import type { ResumeData } from '@/entities/resume/resume-data'
import PrintRenderer from './print-renderer'

interface PrintPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; tpl?: string }>
}

export const dynamic = 'force-dynamic'

/**
 * Server-rendered print page for export pipelines (puppeteer).
 *
 * Loads the resume by id, gates on a short-lived HMAC token, and renders the
 * chosen template via a client wrapper. Used internally by
 * `/next-api/exports/mini` to capture PDF/image; not part of the user-facing UI.
 */
export default async function PrintPage(props: PrintPageProps): Promise<ReactElement> {
  const { id } = await props.params
  const { token, tpl } = await props.searchParams

  console.log('[print/page] hit', { id, hasToken: Boolean(token), tpl })

  if (!token || !verifyPrintToken(token, id)) {
    console.warn('[print/page] invalid token', { id })
    notFound()
  }

  const record = await prisma.resume.findUnique({
    where: { id },
    select: { content: true, template: true, title: true },
  })

  if (!record) {
    console.warn('[print/page] resume not found', { id })
    notFound()
  }

  const templateId: string = (tpl && typeof tpl === 'string' ? tpl : record.template) || 'simple'
  const resumeData: ResumeData = (record.content ?? {}) as unknown as ResumeData

  console.log('[print/page] rendering', { id, templateId, title: record.title })

  return (
    <div className="print-stage">
      <style>{`
        html, body { margin: 0; padding: 0; background: #ffffff; }
        .print-stage { width: 210mm; margin: 0 auto; background: #ffffff; }
        .print-stage .page { width: 210mm; min-height: 297mm; background: #ffffff; box-shadow: none; border-radius: 0; }
        .print-stage * { box-shadow: none !important; filter: none !important; }
        /* @page margin provides top/bottom whitespace on every page (including page 2+).
           Remove the template container's own vertical padding so it doesn't double up on page 1. */
        @page { size: A4; margin: 22mm 0; }
        .resume-container { padding-top: 0 !important; padding-bottom: 0 !important; }
      `}</style>
      <div className="page" id="print-root">
        <PrintRenderer resume={resumeData} templateId={templateId} />
      </div>
    </div>
  )
}
