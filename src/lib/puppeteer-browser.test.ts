import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ launch: vi.fn(), mkdir: vi.fn(), mkdtemp: vi.fn() }))
vi.mock('fs/promises', () => ({ default: { mkdir: mocks.mkdir, mkdtemp: mocks.mkdtemp } }))
vi.mock('puppeteer-core', () => ({ default: { launch: mocks.launch } }))
vi.mock('@sparticuz/chromium', () => ({ default: { executablePath: async () => '/chrome', args: [] } }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubEnv('PUPPETEER_IDLE_CLOSE_MS', '0')
  delete (globalThis as Record<string, unknown>).__resumePuppeteerState
  mocks.mkdtemp.mockImplementation(async (prefix: string) => `${prefix}unique`)
})
afterEach(() => {
  delete (globalThis as Record<string, unknown>).__resumePuppeteerState
  vi.unstubAllEnvs()
})

it('reuses the live browser after a module reload instead of launching into its locked profile', async () => {
  const context = {}
  const page = { setCacheEnabled: vi.fn(), isClosed: () => false, close: vi.fn(), browserContext: () => context, browser: () => ({ defaultBrowserContext: () => context }) }
  const browser = { connected: true, newPage: vi.fn().mockResolvedValue(page), on: vi.fn() }
  mocks.launch.mockResolvedValue(browser)
  const first = await import('./puppeteer-browser')
  await first.closeSharedPuppeteerPage(await first.newSharedPuppeteerPage())
  vi.resetModules()
  const reloaded = await import('./puppeteer-browser')
  await reloaded.closeSharedPuppeteerPage(await reloaded.newSharedPuppeteerPage())
  expect(mocks.launch).toHaveBeenCalledTimes(1)
  expect(browser.newPage).toHaveBeenCalledTimes(2)
  expect(mocks.launch.mock.calls[0][0].userDataDir).toBe(`${mocks.mkdtemp.mock.calls[0][0]}unique`)
  expect((globalThis as { __resumePuppeteerState?: { activePageCount: number } }).__resumePuppeteerState?.activePageCount).toBe(0)
})

it('can launch again after an initial launch fails', async () => {
  const context = {}
  const page = { setCacheEnabled: vi.fn(), isClosed: () => false, close: vi.fn(), browserContext: () => context, browser: () => ({ defaultBrowserContext: () => context }) }
  mocks.launch.mockRejectedValueOnce(new Error('launch failed')).mockResolvedValueOnce({ connected: true, newPage: async () => page, on: vi.fn() })
  const renderer = await import('./puppeteer-browser')
  await expect(renderer.newSharedPuppeteerPage()).rejects.toThrow('launch failed')
  await renderer.closeSharedPuppeteerPage(await renderer.newSharedPuppeteerPage())
  expect(mocks.launch).toHaveBeenCalledTimes(2)
})

it('closes the private capture session without closing the shared browser or another session', async () => {
  const privateContext = { newPage: vi.fn(), close: vi.fn() }
  const browser = { createBrowserContext: vi.fn().mockResolvedValue(privateContext), defaultBrowserContext: () => ({}), connected: true, on: vi.fn() }
  const page = { setCacheEnabled: vi.fn(), isClosed: () => false, browserContext: () => privateContext, browser: () => browser }
  privateContext.newPage.mockResolvedValue(page)
  mocks.launch.mockResolvedValue(browser)
  const renderer = await import('./puppeteer-browser')
  await renderer.closeSharedPuppeteerPage(await renderer.newSharedPuppeteerPage({ isolated: true }))
  expect(browser.createBrowserContext).toHaveBeenCalledTimes(1)
  expect(privateContext.close).toHaveBeenCalledTimes(1)
})
