import { templateMetadata } from './template-metadata'

/** Public catalog intentionally excludes editor-only and hidden templates. */
export const templateCatalog = templateMetadata.filter((template) => template.visibility.catalog)
