import { templateMetadata } from './template-metadata'
import { sortTemplatesByUsage } from './template-order'

/** Public catalog intentionally excludes editor-only and hidden templates. */
export const templateCatalog = sortTemplatesByUsage(templateMetadata.filter((template) => template.visibility.catalog))
