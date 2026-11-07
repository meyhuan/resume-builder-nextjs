import { beforeEach, expect, it, vi } from 'vitest'
const m = vi.hoisted(() => ({
  quota: vi.fn(),
  save: vi.fn(),
  render: vi.fn(),
  preview: vi.fn(),
  mark: vi.fn(),
  find: vi.fn(),
  read: vi.fn(),
  upsert: vi.fn(),
  upload: vi.fn(),
}))
vi.mock('@/lib/docx-preview', () => ({
  renderDocxPreview: m.preview,
  DocxPreviewError: class extends Error {},
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => ({ value: 'owner' }) }),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: { resume: { findFirst: m.find }, exportRecord: { upsert: m.upsert } },
}))
vi.mock('@/lib/quota/quota-checker', () => ({
  peekQuotaForUser: m.quota,
  checkQuotaForUser: m.quota,
}))
vi.mock('@/lib/verify-mini-sign', () => ({ verifyMiniSign: () => null }))
vi.mock('@/lib/export-temp-store', () => ({
  EXPORT_TEMP_TTL_MS: 1000,
  saveExportTemp: m.save,
  readExportTemp: m.read,
  markConfirmed: m.mark,
}))
vi.mock('@/lib/upload-export-asset', () => ({ uploadExportAsset: m.upload }))
vi.mock('@/lib/render-via-print-page', () => ({
  ExportRenderError: class extends Error {},
  renderViaPrintPage: vi.fn(),
  getInternalBaseUrl: vi.fn(),
}))
vi.mock('@/lib/server-analytics', () => ({
  trackServerAnalyticsEvent: vi.fn(),
}))
vi.mock('@/io/export-docx', () => ({
  exportResumeToDocx: m.render,
  DOCX_CONTENT_TYPE: 'application/octet-stream',
  UnsupportedDocxTemplateError: class extends Error {},
}))
import { POST } from './route'
import { POST as confirm } from './[id]/confirm/route'
beforeEach(() => {
  ;(globalThis as typeof globalThis & { __wordPreviewCache?: Map<string, unknown> }).__wordPreviewCache?.clear()
  vi.resetAllMocks()
  m.find.mockResolvedValue({
    id: 'resume',
    userId: 'owner',
    template: 'canva-sidebar',
    content: {},
    user: {},
  })
  m.quota.mockResolvedValue({ isVip: false, allowed: true, remaining: 99 })
  m.preview.mockResolvedValue([Buffer.from('page')])
})
it('rejects exhausted shared quota before rendering', async () => {
  m.quota.mockResolvedValue({ isVip: false, allowed: false, remaining: 0 })
  const response = await POST(
    new Request('http://localhost/export', {
      method: 'POST',
      body: JSON.stringify({ resumeId: 'resume', type: 'docx', mode: 'final' }),
    }),
  )
  expect(response.status).toBe(402)
  expect(m.quota).toHaveBeenCalledWith('owner', 'pdf:export')
  expect(m.render).not.toHaveBeenCalled()
})
it('allows preview without consuming even with no shared quota', async () => {
  m.quota.mockResolvedValue({ isVip: false, allowed: false, remaining: 0 })
  m.render.mockResolvedValue(Buffer.from('preview'))
  m.save.mockResolvedValue({ token: 'preview', expiresAt: Date.now() + 60000 })
  const response = await POST(
    new Request('http://localhost/export', {
      method: 'POST',
      body: JSON.stringify({
        resumeId: 'resume',
        type: 'docx',
        mode: 'preview',
      }),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    confirmed: false,
    previewImages: ['/next-api/export-file/preview?inline=1'],
  })
  expect(m.preview).toHaveBeenCalledWith(Buffer.from('preview'), expect.any(Function))
  expect(m.quota).toHaveBeenCalledTimes(1)
  expect(m.upload).not.toHaveBeenCalled()
})

it('fails Word conversion without charging or saving a downloadable file', async () => {
  const { DocxPreviewError } = await import('@/lib/docx-preview')
  m.render.mockResolvedValue(Buffer.from('word'))
  m.preview.mockRejectedValue(new DocxPreviewError())
  const response = await POST(
    new Request('http://localhost/export', {
      method: 'POST',
      body: JSON.stringify({
        resumeId: 'resume',
        type: 'docx',
        mode: 'preview',
      }),
    }),
  )
  expect(response.status).toBe(503)
  expect(m.save).not.toHaveBeenCalled()
  expect(m.upload).not.toHaveBeenCalled()
})

it('streams Word progress, then reuses cached bytes with fresh ownership and quota checks', async () => {
  m.render.mockResolvedValue(Buffer.from('stream-word'))
  m.preview.mockImplementation(async (_buffer, progress) => { progress('converting'); progress('rendering'); return [Buffer.from('page')] })
  m.save.mockResolvedValue({token:'stream-preview',expiresAt:Date.now()+60000})
  const request = () => new Request('http://localhost/export', {method:'POST',headers:{Accept:'application/x-ndjson'},body:JSON.stringify({resumeId:'resume',type:'docx',mode:'preview'})})
  const first = await POST(request())
  expect(first.headers.get('content-type')).toContain('application/x-ndjson')
  const events = (await first.text()).trim().split('\n').map(line=>JSON.parse(line))
  expect(events.filter(e=>e.event==='progress').map(e=>e.stage)).toEqual(['preparing','generating','converting','rendering','storing'])
  expect(events.at(-1)).toMatchObject({event:'result',status:200,data:{confirmed:false}})
  const second = (await (await POST(request())).text()).trim().split('\n').map(line=>JSON.parse(line))
  expect(second.some(e=>e.stage==='cached')).toBe(true)
  expect(m.render).toHaveBeenCalledTimes(1)
  expect(m.find).toHaveBeenCalledTimes(2)
  expect(m.quota).toHaveBeenCalledTimes(2)
  expect(m.upload).not.toHaveBeenCalled()
})

it('previews Markdown text without uploading or consuming quota', async () => {
  m.save.mockResolvedValue({ token: 'markdown', expiresAt: Date.now() + 60000 })
  const response = await POST(
    new Request('http://localhost/export', {
      method: 'POST',
      body: JSON.stringify({
        resumeId: 'resume',
        type: 'markdown',
        mode: 'preview',
      }),
    }),
  )
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({
    confirmed: false,
    markdownContent: expect.any(String),
  })
  expect(m.quota).not.toHaveBeenCalled()
  expect(m.upload).not.toHaveBeenCalled()
  expect(m.upsert).not.toHaveBeenCalled()
})

it.each(['docx', 'markdown'])(
  'cookie confirmation reuses the exact %s preview bytes',
  async (type) => {
    if (type === 'markdown') m.quota.mockResolvedValue({ isVip: false, allowed: false, remaining: 0 })
    const entry = {
      type,
      wxId: 'owner',
      userId: 'owner',
      resumeId: 'resume',
      fileName: '简历',
      buffer: Buffer.from('exact-preview'),
      extension: type === 'docx' ? 'docx' : 'md',
      contentType: 'application/octet-stream',
      confirmed: false,
      expiresAt: Date.now() + 60000,
    }
    m.read.mockResolvedValue(entry)
    m.mark.mockResolvedValue({ ...entry, confirmed: true })
    m.upload.mockResolvedValue({
      key: 'key',
      url: 'https://example.invalid/file',
    })
    const response = await confirm(
      new Request('http://localhost/confirm', {
        method: 'POST',
        headers: { Origin: 'http://localhost' },
        body: '{}',
      }),
      { params: Promise.resolve({ id: 'same-file' }) },
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      id: 'same-file',
      confirmed: true,
    })
    expect(m.upload).toHaveBeenCalledWith(
      expect.objectContaining({ token: 'same-file', buffer: entry.buffer }),
    )
    expect(m.quota).toHaveBeenCalledTimes(type === 'markdown' ? 0 : 2)
    expect(m.render).not.toHaveBeenCalled()
  },
)
it.each(['pdf', 'image', 'docx'])('blocks unconfirmed %s when shared quota is exhausted', async (type) => {
  m.quota.mockResolvedValue({ isVip: false, allowed: false, remaining: 0 })
  m.read.mockResolvedValue({ type, wxId: 'owner', confirmed: false })
  const response = await confirm(
    new Request('http://localhost/confirm', {
      method: 'POST',
      body: JSON.stringify({ wxId: 'owner' }),
    }),
    { params: Promise.resolve({ id: 'token' }) },
  )
  expect(response.status).toBe(402)
  expect(m.upload).not.toHaveBeenCalled()
  expect(m.mark).not.toHaveBeenCalled()
  expect(m.quota).toHaveBeenCalledTimes(1)
})
it('does not charge an already confirmed file again', async () => {
  m.read.mockResolvedValue({
    type: 'docx',
    wxId: 'owner',
    confirmed: true,
    expiresAt: Date.now() + 60000,
  })
  const response = await confirm(
    new Request('http://localhost/confirm', {
      method: 'POST',
      body: JSON.stringify({ wxId: 'owner' }),
    }),
    { params: Promise.resolve({ id: 'token' }) },
  )
  expect(response.status).toBe(200)
  expect(m.quota).not.toHaveBeenCalled()
})
it.each([
  { origin: 'https://aijianli.cn', status: 200 },
  { origin: 'https://other.example', status: 403 },
  { origin: 'http://aijianli.cn', status: 403 },
  { origin: 'null', status: 403 },
])('checks cookie confirmation behind the HTTPS proxy: $origin', async ({ origin, status }) => {
  m.read.mockResolvedValue({ type: 'docx', wxId: 'owner', confirmed: true, expiresAt: Date.now() + 60000 })
  const response = await confirm(new Request('http://localhost:3000/confirm', {
    method: 'POST',
    headers: { Origin: origin, Host: 'aijianli.cn', 'X-Forwarded-Proto': 'https' },
    body: '{}',
  }), { params: Promise.resolve({ id: 'token' }) })
  expect(response.status).toBe(status)
  expect(m.quota).not.toHaveBeenCalled()
  if (status === 403) expect(m.read).not.toHaveBeenCalled()
})
it('rejects confirmation by a different owner', async () => {
  m.read.mockResolvedValue({ type: 'docx', wxId: 'another', confirmed: true })
  expect(
    (
      await confirm(
        new Request('http://localhost/confirm', {
          method: 'POST',
          body: JSON.stringify({ wxId: 'owner' }),
        }),
        { params: Promise.resolve({ id: 'token' }) },
      )
    ).status,
  ).toBe(403)
})

it.each(
  ['canva-minimal', 'canva-columns', 'canva-sidebar'].flatMap((templateId) =>
    [true, false].map((isVip) => ({ templateId, isVip })),
  ),
)(
  'generates and downloads $templateId with isVip=$isVip',
  async ({ templateId, isVip }) => {
    const actual =
      await vi.importActual<typeof import('@/io/export-docx')>(
        '@/io/export-docx',
      )
    const { getTemplateFixture } = await import('@/lib/template-fixtures')
    const { GET } = await import('@/app/next-api/export-file/[token]/route')
    m.render.mockImplementation(actual.exportResumeToDocx)
    m.find.mockResolvedValue({
      id: 'resume',
      title: '测试简历',
      userId: 'owner',
      template: templateId,
      content: getTemplateFixture('full'),
      user: {},
    })
    m.quota.mockResolvedValue({
      isVip,
      allowed: true,
      remaining: isVip ? 'unlimited' : 1,
    })
    m.save.mockImplementation(async (input) => {
      m.read.mockResolvedValue({ ...input, expiresAt: Date.now() + 60000 })
      return { token: 'member-file', expiresAt: Date.now() + 60000 }
    })
    m.upload.mockResolvedValue({
      key: 'test-key',
      url: 'https://example.invalid/test.docx',
    })
    const created = await POST(
      new Request('http://localhost/export', {
        method: 'POST',
        body: JSON.stringify({
          resumeId: 'resume',
          templateId,
          type: 'docx',
          mode: 'final',
        }),
      }),
    )
    expect(created.status).toBe(200)
    expect(await created.json()).toMatchObject({
      confirmed: true,
      downloadUrl: '/next-api/export-file/member-file',
      isVip,
    })
    expect(m.upsert).toHaveBeenCalledOnce()
    const downloaded = await GET(
      new Request('http://localhost/next-api/export-file/member-file'),
      { params: Promise.resolve({ token: 'member-file' }) },
    )
    expect(downloaded.status).toBe(200)
    const bytes = Buffer.from(await downloaded.arrayBuffer())
    expect(bytes.subarray(0, 4).toString('hex')).toBe('504b0304')
    expect(bytes.length).toBeGreaterThan(5000)
    expect(m.quota).toHaveBeenCalledTimes(2)
    expect(m.quota.mock.calls.every((call) => call[1] === 'pdf:export')).toBe(
      true,
    )
  },
)
