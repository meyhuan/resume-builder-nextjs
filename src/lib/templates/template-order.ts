import snapshot from './template-usage-snapshot.json'

const usage = new Map(snapshot.rows.map(row => [row.template, row]))

/** Shared display order only; never changes default templates or ID lookups. */
export function sortTemplatesByUsage<T extends { readonly id: string }>(templates: readonly T[]): T[] {
  return [...templates].sort((left, right) => {
    const a = usage.get(left.id)
    const b = usage.get(right.id)
    return (b?.users ?? 0) - (a?.users ?? 0) || (b?.records ?? 0) - (a?.records ?? 0)
  })
}
