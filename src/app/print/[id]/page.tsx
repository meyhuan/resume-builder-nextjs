import type { ReactElement } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyPrintToken } from '@/lib/print-token'
import type { ResumeData } from '@/entities/resume/resume-data'
import { extractEditorMeta } from '@/entities/editor/editor-meta'
import PrintRenderer from './print-renderer'

interface PrintPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; tpl?: string }>
}

const BLEED_TEMPLATE_IDS: ReadonlySet<string> = new Set([
  'elegant',
  'warm',
  'lanxin',
  'qingyun',
  'mashang',
  'xingtan',
  'zhumo',
  'lifeng',
  'qingsui',
])

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

  const rawContent = (record.content ?? {}) as Record<string, unknown>
  const { content, meta } = extractEditorMeta(rawContent)

  const templateId: string = (tpl && typeof tpl === 'string' ? tpl : record.template) || 'simple'
  const resumeData: ResumeData = content as unknown as ResumeData
  
  // Extract the saved theme for the selected template, if any
  const savedTheme = meta.themes[templateId]

  // In one-page mode, we remove the native CSS @page margins completely to give the container maximum space.
  // We also conditionally build the per-page margin overrides.
  const isOnePage = meta.onePageMode
  const isBleedTemplate: boolean = BLEED_TEMPLATE_IDS.has(templateId)
  const pagePaddingV = savedTheme?.pagePaddingVertical ?? 22
  const pageMarginCss = isOnePage || isBleedTemplate ? 'margin: 0;' : `margin: ${pagePaddingV}mm 0;`
  const bleedFirstPageCss = ''
  const onePageCss = isOnePage
    ? `
        .page[data-one-page="true"] {
          max-height: 297mm !important;
          height: 297mm !important;
          overflow: hidden !important;
          page-break-after: avoid !important;
          break-after: avoid !important;
        }`
    : ''
  const bleedPageCss = isBleedTemplate && !isOnePage
    ? `
        .page {
          min-height: 0 !important;
          height: auto !important;
        }
        .resume-container[data-bleed="true"] {
          min-height: calc(297mm - 1px) !important;
        }`
    : ''
  const perPageMarginCss = isOnePage || isBleedTemplate
    ? ''
    : `
        .resume-container,
        .resume-body-content {
          padding-top: 0 !important;
          padding-bottom: 0 !important;
        }`

  console.log('[print/page] rendering', { id, templateId, title: record.title, hasSavedTheme: !!savedTheme, primaryColor: savedTheme?.primaryColor, isOnePage, isBleedTemplate })

  return (
    <div className="print-stage">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700;900&family=Noto+Serif+SC:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      <style>{`
        html, body { margin: 0; padding: 0; background: #ffffff; }
        .print-stage { width: 210mm; margin: 0 auto; background: #ffffff; }
        .print-stage .page { width: 210mm; min-height: 297mm; background: #ffffff; box-shadow: none; border-radius: 0; }
        .print-stage * { box-shadow: none !important; filter: none !important; }
        /* @page margin provides top/bottom whitespace on every page (including page 2+).
           Remove the template container's own vertical padding so it doesn't double up on page 1. */
        @page { size: A4; ${pageMarginCss} }
        ${bleedFirstPageCss}
        ${onePageCss}
        ${bleedPageCss}
        ${perPageMarginCss}
      `}</style>
      <div className="page" id="print-root" data-one-page={isOnePage ? 'true' : 'false'}>
        <PrintRenderer resume={resumeData} templateId={templateId} savedTheme={savedTheme} />
      </div>
    </div>
  )
}
