import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import * as nodeModule from 'node:module'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

// Exercise the real save callback without mounting the template/AI/editor tree.
// All I/O and React state setters are mocked. This is a control-flow regression
// test, not a browser, database, or deployment integration test.
const editorSource = await readFile(new URL('../src/components/ResumeEditor.tsx', import.meta.url), 'utf8')
function between(start, end) {
  const from = editorSource.indexOf(start)
  const to = editorSource.indexOf(end, from)
  assert.ok(from >= 0 && to > from, `Cannot locate editor callback: ${start}`)
  return editorSource.slice(from, to)
}
const callbackSource = between('  const doSave = useCallback(async (', '  /** Auth-gated save')
const errorSource = between('function describeUnknownError(', 'export default function ResumeEditor(')
const source = `${errorSource}\n${callbackSource}\n;doSave`
// Node 22.13+ can strip types directly. Older supported project runtimes use
// the repository's existing TypeScript devDependency, without another install.
const javascript = typeof nodeModule.stripTypeScriptTypes === 'function'
  ? nodeModule.stripTypeScriptTypes(source)
  : (await import('typescript')).default.transpileModule(source, {
      compilerOptions: { target: 9, module: 0 },
    }).outputText

function makeHarness({ status = 200, revalidateError, thumbnailError, resumeId = 'resume-fixture', fetchImpl } = {}) {
  const events = []
  const requests = []
  const warnings = []
  const errors = []
  const successes = []
  const failureToasts = []
  const state = { snapshot: 'unsaved baseline', backupCleared: false, revalidations: 0, saving: false }
  const currentResume = { id: 'content-fixture', name: 'Test resume', sections: [] }
  const context = {
    Error, Event, Date, JSON, Promise,
    setTimeout: (callback) => setTimeout(callback, 0),
    console: { warn: (...args) => warnings.push(args), error: (...args) => errors.push(args) },
    useCallback: (callback) => callback,
    resumeId,
    searchParams: { get: () => null },
    saveInFlightRef: { current: false },
    pendingSaveCallbacksRef: { current: [] },
    saveRetryCountRef: { current: 0 },
    latestResumeRef: { current: currentResume },
    latestThemeRef: { current: {} },
    latestTplRef: { current: 'simple' },
    latestOnePageModeRef: { current: false },
    latestOnePageSnapshotRef: { current: null },
    latestOnePageStrategyRef: { current: 'default' },
    latestSidebarSectionIdsRef: { current: [] },
    lastThumbnailContentRef: { current: '' },
    lastThumbnailUpdateRef: { current: 0 },
    printRef: { current: null },
    THUMBNAIL_UPDATE_INTERVAL: 180000,
    MAX_SAVE_RETRIES: 3,
    setIsSaving: (value) => { state.saving = value },
    setIsManualSave: () => {},
    setSaveErrorPersistent: () => {},
    setResumeId: (id) => { state.createdId = id },
    setLastSaved: (date) => { state.savedAt = date },
    setSavedSnapshot: (snapshot) => { state.snapshot = snapshot },
    clearEditorDraftBackup: () => { state.backupCleared = true },
    captureTemplateJourney: () => ({}),
    embedEditorMeta: (content, meta) => ({ ...content, __editorMeta: meta }),
    track: (event, properties) => events.push({ event, properties }),
    toast: { success: (message) => successes.push(message), error: (message) => failureToasts.push(message) },
    window: { history: { replaceState: () => {} } },
    fetchWithNetworkRetry: async (url, options) => {
      requests.push({ url, options })
      if (fetchImpl) return fetchImpl(url, options)
      return { ok: status >= 200 && status < 300, status, json: async () => ({ id: 'created-fixture' }) }
    },
    exportImage: async () => {
      if (thumbnailError) throw thumbnailError
      return undefined
    },
    revalidateDashboard: async () => {
      state.revalidations++
      if (revalidateError) throw revalidateError
    },
  }
  return { save: runInNewContext(javascript, context), context, state, events, requests, warnings, errors, successes, failureToasts }
}

const missingAction = () => new Error('Failed to find Server Action "fixture". This request might be from an older or newer deployment.')

test('a missing dashboard action cannot turn an acknowledged content save into failure', async () => {
  const h = makeHarness({ revalidateError: missingAction() })
  const id = await h.save({ generateThumbnail: false })
  assert.equal(id, 'resume-fixture', 'save-before-export callers must receive the persisted ID')
  assert.equal(h.requests.length, 1)
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_success'])
  assert.deepEqual(h.failureToasts, [])
  assert.deepEqual(h.successes, ['保存成功'])
  assert.equal(h.state.backupCleared, true)
  assert.equal(JSON.parse(h.state.snapshot).resume.name, 'Test resume')
  assert.equal(h.state.saving, false)
  assert.equal(h.warnings.length, 1, 'cache maintenance failure remains diagnosable')
})

test('a network error in dashboard revalidation is also non-fatal after a successful write', async () => {
  const h = makeHarness({ revalidateError: new TypeError('Failed to fetch') })
  assert.equal(await h.save({ generateThumbnail: false, showSuccessToast: false }), 'resume-fixture')
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_success'])
  assert.deepEqual(h.successes, [])
  assert.deepEqual(h.failureToasts, [])
})

for (const status of [401, 404, 500]) {
  test(`HTTP ${status} from content PUT remains a real save failure and preserves backup`, async () => {
    const h = makeHarness({ status, revalidateError: missingAction() })
    assert.equal(await h.save({ generateThumbnail: false }), undefined)
    assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_failed'])
    assert.equal(h.state.revalidations, 0)
    assert.equal(h.state.backupCleared, false)
    assert.equal(h.state.snapshot, 'unsaved baseline')
    assert.deepEqual(h.failureToasts, ['保存失败，请重试'])
  })
}

test('a rejected content request remains a real save failure', async () => {
  const h = makeHarness({ fetchImpl: async () => { throw new TypeError('Network request failed') } })
  assert.equal(await h.save({ generateThumbnail: false }), undefined)
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_failed'])
  assert.equal(h.state.revalidations, 0)
  assert.equal(h.state.backupCleared, false)
})

test('autosave does not call the dashboard action', async () => {
  const h = makeHarness({ revalidateError: missingAction() })
  assert.equal(await h.save({ isAutoSave: true, generateThumbnail: false, showSuccessToast: false }), 'resume-fixture')
  assert.equal(h.state.revalidations, 0)
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_success'])
})

test('explicit revalidation opt-out is preserved', async () => {
  const h = makeHarness({ revalidateError: missingAction() })
  assert.equal(await h.save({ revalidateDashboard: false, generateThumbnail: false }), 'resume-fixture')
  assert.equal(h.state.revalidations, 0)
})

test('normal manual saves still revalidate exactly once', async () => {
  const h = makeHarness()
  assert.equal(await h.save({ generateThumbnail: false }), 'resume-fixture')
  assert.equal(h.state.revalidations, 1)
  assert.equal(h.warnings.length, 0)
})

test('newly created resumes retain their successful ID when dashboard revalidation fails', async () => {
  const h = makeHarness({ resumeId: null, revalidateError: missingAction() })
  assert.equal(await h.save({ generateThumbnail: false }), 'created-fixture')
  assert.deepEqual(h.requests.map(({ options }) => options.method), ['POST', 'PUT'])
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_create_start', 'resume_create_success', 'resume_save_success'])
})

test('thumbnail and dashboard failures do not mask acknowledged content persistence', async () => {
  const h = makeHarness({ thumbnailError: new Error('thumbnail fixture failure'), revalidateError: missingAction() })
  assert.equal(await h.save({ generateThumbnail: true }), 'resume-fixture')
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_success'])
  assert.equal(h.events[0].properties.thumbnailFailureReason, 'thumbnail fixture failure')
})

test('queued manual saves resolve successfully and flush the latest draft after an action failure', async () => {
  let releaseFirst
  let count = 0
  const h = makeHarness({
    revalidateError: missingAction(),
    fetchImpl: async () => {
      count++
      if (count === 1) await new Promise((resolve) => { releaseFirst = resolve })
      return { ok: true, status: 200 }
    },
  })
  const first = h.save({ generateThumbnail: false })
  h.context.latestResumeRef.current = { ...h.context.latestResumeRef.current, name: 'Newer draft' }
  const second = h.save({ generateThumbnail: false })
  releaseFirst()
  assert.deepEqual(await Promise.all([first, second]), ['resume-fixture', 'resume-fixture'])
  assert.equal(JSON.parse(h.requests[1].options.body).content.name, 'Newer draft')
  assert.equal(JSON.parse(h.state.snapshot).resume.name, 'Newer draft')
  assert.deepEqual(h.events.map(({ event }) => event), ['resume_save_success', 'resume_save_success'])
})
