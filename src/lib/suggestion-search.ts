interface Suggestion {
  label: string
  value?: string
  aliases?: readonly string[]
}

export const normalizeSuggestionQuery = (text: string) => text.toLocaleLowerCase('zh-CN').replace(/[\s'’]/g, '')

/** Exact names/aliases first; name fragments precede alias fragments. Source order breaks ties. */
export function rankSuggestions<T extends Suggestion>(options: readonly T[], query: string): readonly T[] {
  const search = normalizeSuggestionQuery(query)
  if (!search) return options
  return options.map(option => {
    const names = [option.label, option.value ?? option.label].map(normalizeSuggestionQuery)
    const aliases = (option.aliases ?? []).map(normalizeSuggestionQuery)
    const score = names.includes(search) ? 0 : aliases.includes(search) ? 1
      : names.some(name => name.startsWith(search)) ? 2 : names.some(name => name.includes(search)) ? 3
      : aliases.some(alias => alias.startsWith(search)) ? 4 : aliases.some(alias => alias.includes(search)) ? 5 : -1
    return { option, score }
  }).filter(result => result.score >= 0).sort((a, b) => a.score - b.score).map(result => result.option)
}
