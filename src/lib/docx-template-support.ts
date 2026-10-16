/**
 * DOCX export is intentionally limited to the three templates that have a
 * dedicated semantic renderer. A template being renderable in HTML does not
 * imply that its CSS layout can be reproduced faithfully in WordprocessingML.
 */
export const DOCX_SUPPORTED_TEMPLATE_IDS = [
  'canva-minimal',
  'canva-columns',
  'canva-sidebar',
  // Legacy verification renderers remain available for existing documents.
  'simple',
  'jingrui',
  'chengyan',
] as const

export type DocxTemplateId = (typeof DOCX_SUPPORTED_TEMPLATE_IDS)[number]

export function isDocxTemplateSupported(templateId: string | undefined | null): templateId is DocxTemplateId {
  return DOCX_SUPPORTED_TEMPLATE_IDS.includes(templateId as DocxTemplateId)
}
