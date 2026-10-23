import { beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => { vi.resetModules(); sessionStorage.clear(); localStorage.clear(); localStorage.setItem('analytics_anonymous_id', 'browser-1') })
describe('template attribution', () => {
  it('keeps identifiers available when webview crypto is unavailable', async () => {
    const { templateEventId } = await import('./template-journey')
    vi.stubGlobal('crypto', undefined)
    try {
      expect(templateEventId()).toBeTruthy()
      expect(templateEventId()).not.toBe(templateEventId())
    } finally { vi.unstubAllGlobals() }
  })
  it('bounds native handoff metadata even with a large gallery filter', async () => {
    const { templateJourneyProperties: enrich, serializeTemplateJourney } = await import('./template-journey')
    enrich('template_impression', { templateId: 'simple', impressionId: 'seen', listId: 'list', filter: 'x'.repeat(10000) })
    const selected = enrich('template_select', { templateId: 'simple', resumeId: 'r1' })
    const serialized = serializeTemplateJourney('simple', 'r1')
    expect(serialized.length).toBeLessThan(1500)
    expect(JSON.parse(serialized).templateJourneyId).toBe(selected.templateJourneyId)
    expect(JSON.parse(serialized).filter).toBeUndefined()
  })
  it('joins visible exposure, explicit selection, creation and save without treating defaults as choices', async () => {
    const { templateJourneyProperties: enrich } = await import('./template-journey')
    enrich('template_impression', { templateId: 'simple', impressionId: 'seen', listId: 'list', position: 2 })
    const selection = enrich('template_select', { templateId: 'simple' })
    const created = enrich('resume_create_success', { resumeId: 'r1', templateId: 'simple', entry: 'pc_editor_save' })
    expect(created.templateJourneyId).toBe(selection.templateJourneyId)
    expect(created.impressionId).toBe('seen')
    expect(created.selectionMode).toBe('active')
    expect(created.templateActorId).toBe('browser-1')
    const other = enrich('resume_create_success', { resumeId: 'r2', templateId: 'simple', createMethod: 'manual' })
    expect(other.selectionMode).toBe('default')
    expect(other.impressionId).toBeUndefined()
  })
  it('keeps in-flight saves attached to the selected journey and isolates resumes', async () => {
    const { templateJourneyProperties: enrich, captureTemplateJourney: capture } = await import('./template-journey')
    const first = enrich('template_select', { templateId: 'simple', resumeId: 'r1' })
    const snapshot = capture('simple', 'r1')
    expect(snapshot.occurredAt).toBeUndefined()
    enrich('template_select', { templateId: 'elegant', resumeId: 'r1' })
    const latest = enrich('template_select', { templateId: 'simple', resumeId: 'r1' })
    const completed = { ...enrich('resume_save_success', { ...snapshot, templateId: 'simple', resumeId: 'r1' }), ...snapshot }
    expect(completed.templateJourneyId).toBe(first.templateJourneyId)
    expect(latest.templateJourneyId).not.toBe(first.templateJourneyId)
    expect(capture('simple', 'r2').templateJourneyId).not.toBe(first.templateJourneyId)
  })
  it('survives reload and storage denial', async () => {
    const first = await import('./template-journey')
    const before = first.templateJourneyProperties('template_select', { templateId: 'simple', resumeId: 'r1' })
    vi.resetModules()
    const second = await import('./template-journey')
    expect(second.captureTemplateJourney('simple', 'r1').templateJourneyId).toBe(before.templateJourneyId)
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied') })
    expect(() => second.captureTemplateJourney('elegant', 'r1')).not.toThrow()
    spy.mockRestore()
  })
})
