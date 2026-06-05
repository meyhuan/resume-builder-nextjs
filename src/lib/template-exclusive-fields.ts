export interface BaseInfoCustomFieldLike {
  readonly label?: string | null
  readonly value?: string | null
}

const TEMPLATE_METRIC_LABEL_PATTERN = /^业绩[1-3]$/
const TEMPLATE_HIGHLIGHT_LABEL_PATTERN = /^亮点[1-3]$/

export function isTemplateMetricField(label: string): boolean {
  return TEMPLATE_METRIC_LABEL_PATTERN.test(label)
}

export function isTemplateHighlightField(label: string): boolean {
  return TEMPLATE_HIGHLIGHT_LABEL_PATTERN.test(label)
}

export function isTemplateExclusiveBaseInfoField(label: string): boolean {
  return isTemplateMetricField(label) || isTemplateHighlightField(label)
}

export function isUserVisibleBaseInfoCustomField(field: BaseInfoCustomFieldLike): boolean {
  return Boolean(field.label && field.value && !isTemplateExclusiveBaseInfoField(field.label))
}

export function splitTemplateExclusiveBaseInfoFields<T extends BaseInfoCustomFieldLike>(
  fields: readonly T[] | undefined
): { ordinaryFields: T[]; exclusiveFields: T[] } {
  const ordinaryFields: T[] = []
  const exclusiveFields: T[] = []

  for (const field of fields ?? []) {
    if (field.label && isTemplateExclusiveBaseInfoField(field.label)) {
      exclusiveFields.push(field)
    } else {
      ordinaryFields.push(field)
    }
  }

  return { ordinaryFields, exclusiveFields }
}
