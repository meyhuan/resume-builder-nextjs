// Per-tab attribution only; never stores resume content or personal details.
type Properties = Record<string, unknown>
type Journey = Properties & { templateId: string; templateJourneyId: string; selectionMode: string; at: number }
const KEY = 'template-journeys-v1'
const TTL = 24 * 60 * 60 * 1000
let journeys: Record<string, Journey> = {}
const impressions = new Map<string, Properties>()
let loaded = false
export function clearTemplateImpressions(entry: string): void {
  for (const [key, value] of impressions) if (value.entry === entry) impressions.delete(key)
}
export function templateEventId(): string {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
  } catch {
    // Attribution identifiers are not security tokens. Older webviews may lack crypto.
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  }
}

function load(): void {
  if (loaded) return
  loaded = true
  try { const value = JSON.parse(sessionStorage.getItem(KEY) || '{}'); journeys = value && typeof value === 'object' && !Array.isArray(value) ? value : {} } catch { journeys = {} }
}
function persist(): void {
  for (const key of Object.keys(journeys)) if (!journeys[key]?.at || Date.now() - journeys[key].at > TTL) delete journeys[key]
  try { sessionStorage.setItem(KEY, JSON.stringify(journeys)) } catch { /* Memory fallback. */ }
}

export function templateJourneyProperties(event: string, p: Properties): Properties {
  if (typeof window === 'undefined' || typeof p.templateId !== 'string' || !p.templateId) return {}
  load()
  const templateId = p.templateId
  let actor = ''
  try { actor = localStorage.getItem('analytics_anonymous_id') || '' } catch { /* No cross-surface actor. */ }
  if (event === 'template_impression') {
    impressions.set(`${location.pathname}:${templateId}`, { ...p, at: Date.now() })
    return { templateActorId: actor, templateSchemaVersion: 1, occurredAt: new Date().toISOString() }
  }
  const supported = /^(template_select|editor_open|resume_preview|resume_create_success|resume_save_success|resume_save_failed|export_click|export_success|export_failed)$/.test(event)
  if (!supported) return {}
  // An async operation supplies its captured context, so a later switch cannot steal attribution.
  if (typeof p.templateJourneyId === 'string') return { templateSchemaVersion: 1, occurredAt: new Date().toISOString() }
  const key = typeof p.resumeId === 'string' && p.resumeId ? p.resumeId : 'new'
  let journey: Journey | undefined = journeys[key]
  if (journey && (!journey.at || Date.now() - journey.at > TTL)) journey = undefined
  if (event === 'editor_open' && p.selectionMode === 'default') journey = undefined
  if (event === 'resume_create_success' && p.entry === 'pc_editor_save' && key !== 'new' && journeys.new?.templateId === templateId && Date.now() - journeys.new.at < TTL) {
    journey = journeys.new
    delete journeys.new
  }
  if (event === 'template_select' || !journey || journey.templateId !== templateId) {
    const seen = impressions.get(`${location.pathname}:${templateId}`)
    const impression = seen && Date.now() - Number(seen.at) < TTL ? seen : undefined
    journey = {
      templateActorId: actor, templateId, templateJourneyId: templateEventId(), at: Date.now(),
      selectionMode: event === 'template_select' ? 'active' :
        p.selectionMode === 'default' || (event === 'resume_create_success' && p.createMethod === 'manual') ? 'default' : 'restored_or_direct',
      ...(event === 'template_select' && impression ? {
        impressionId: impression.impressionId, listId: impression.listId,
        position: impression.position, selectionEntry: impression.entry, filter: impression.filter,
      } : {}),
    }
  }
  journeys[key] = journey
  persist()
  const { at: _at, ...fields } = journey
  return { ...fields, templateSchemaVersion: 1, occurredAt: new Date().toISOString() }
}

/** Capture before awaiting save/export, and spread into the completion event. */
export function captureTemplateJourney(templateId: string, resumeId?: string | null): Properties {
  try {
    const { occurredAt: _time, ...context } = templateJourneyProperties('resume_preview', { templateId, resumeId })
    return context
  } catch { return {} }
}

/** Keep native navigation parameters bounded and independent of gallery filter size. */
export function serializeTemplateJourney(templateId: string, resumeId?: string | null): string {
  try {
    const context = captureTemplateJourney(templateId, resumeId)
    const fields: Properties = { templateSchemaVersion: 1 }
    for (const key of ['templateJourneyId', 'templateActorId', 'selectionMode', 'templateId', 'impressionId', 'listId', 'selectionEntry']) {
      if (typeof context[key] === 'string' && context[key].length <= 150) fields[key] = context[key]
    }
    return JSON.stringify(fields)
  } catch { return '{}' }
}
