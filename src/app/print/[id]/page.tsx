import type { ReactElement } from 'react'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { verifyPrintToken } from '@/lib/print-token'
import type { ResumeData } from '@/entities/resume/resume-data'
import { extractEditorMeta } from '@/entities/editor/editor-meta'
import { normalizeResumeContent } from '@/entities/resume/normalize-resume-content'
import { prepareResumeForExport } from '@/lib/resume-export-visibility'
import { TEMPLATE_REGISTRY } from '@/templates/template-loader'
import { buildResumeFontFaceCss } from '@/entities/theme/font-stacks'
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

  const rawContent = (record.content ?? {}) as Record<string, unknown>
  const { content, meta } = extractEditorMeta(rawContent)

  const templateId: string = (tpl && typeof tpl === 'string' ? tpl : record.template) || 'simple'
  const normalizedContent = normalizeResumeContent(
    content as unknown as Partial<ResumeData> & Record<string, unknown>,
    { fallbackId: id },
  )
  const resumeData: ResumeData = prepareResumeForExport(normalizedContent)
  
  // Extract the saved theme for the selected template, if any
  const savedTheme = meta.themes[templateId]

  // In one-page mode, we remove the native CSS @page margins completely to give the container maximum space.
  // We also conditionally build the per-page margin overrides.
  const isOnePage = meta.onePageMode
  const isBleedTemplate: boolean = TEMPLATE_REGISTRY[templateId]?.exportLayout === 'bleed'
  const pagePaddingV = savedTheme?.pagePaddingVertical ?? 22
  const pageMarginCss = isOnePage || isBleedTemplate ? 'margin: 0;' : `margin: ${pagePaddingV}mm 0;`
  const printPageMinHeightCss = isOnePage || isBleedTemplate ? '297mm' : `calc(297mm - ${pagePaddingV}mm - 2px)`
  const firstPageMarginCss = isOnePage || isBleedTemplate
    ? ''
    : `
        @page:first {
          margin-top: 0;
        }`
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

  console.log('[print/page] rendering', { id, templateId, title: record.title, hasSavedTheme: !!savedTheme, primaryColor: savedTheme?.primaryColor, isOnePage, isBleedTemplate })

  return (
    <div className="print-stage">
      <style>{`
        ${buildResumeFontFaceCss()}
        html, body { margin: 0; padding: 0; background: #ffffff; }
        .print-stage { width: 210mm; margin: 0 auto; background: #ffffff; }
        .print-stage .page { width: 210mm; min-height: ${printPageMinHeightCss}; background: #ffffff; box-shadow: none; border-radius: 0; }
        .print-stage * { box-shadow: none !important; filter: none !important; text-shadow: none !important; font-synthesis: none; }
        /* Keep the first-page top owned by the template; @page handles later page margins. */
        @page { size: A4; ${pageMarginCss} }
        ${firstPageMarginCss}
        ${onePageCss}
        ${bleedPageCss}
      `}</style>
      <div className="page" id="print-root" data-one-page={isOnePage ? 'true' : 'false'}>
        <PrintRenderer resume={resumeData} templateId={templateId} savedTheme={savedTheme} />
      </div>
    </div>
  )
}
