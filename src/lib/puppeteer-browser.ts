import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import puppeteerCore from 'puppeteer-core'
import type { Browser, BrowserContext, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const DEFAULT_IDLE_CLOSE_MS = 10 * 60 * 1000
const DEFAULT_DISK_CACHE_SIZE_BYTES = 128 * 1024 * 1024

// Next development hot reloads re-evaluate modules without stopping Chrome.
// Keep the connection and its lifecycle counters together across reloads.
interface SharedBrowserState {
  browserPromise: Promise<Browser> | null
  activePageCount: number
  idleCloseTimer: ReturnType<typeof setTimeout> | null
}
const runtime = globalThis as typeof globalThis & { __resumePuppeteerState?: SharedBrowserState }
const shared = runtime.__resumePuppeteerState ??= { browserPromise: null, activePageCount: 0, idleCloseTimer: null }

function getIdleCloseMs(): number {
  const raw = Number(process.env.PUPPETEER_IDLE_CLOSE_MS)
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_IDLE_CLOSE_MS
  return raw
}

function getCacheRoot(): string {
  return process.env.PUPPETEER_CACHE_DIR ||
    process.env.PUPPETEER_USER_DATA_DIR ||
    path.join(os.tmpdir(), 'aijianli-puppeteer')
}

function getUserDataDir(): string {
  const workerId = process.env.PM2_INSTANCE_ID || process.env.NODE_APP_INSTANCE || 'local'
  return path.join(getCacheRoot(), `profile-${workerId}-${process.pid}`)
}

function getDiskCacheDir(): string {
  return path.join(getCacheRoot(), 'http-cache')
}

function clearIdleCloseTimer(): void {
  if (shared.idleCloseTimer) {
    clearTimeout(shared.idleCloseTimer)
    shared.idleCloseTimer = null
  }
}

function scheduleIdleClose(): void {
  clearIdleCloseTimer()
  const idleCloseMs = getIdleCloseMs()
  if (idleCloseMs === 0 || shared.activePageCount > 0 || !shared.browserPromise) return

  shared.idleCloseTimer = setTimeout(() => {
    void (async (): Promise<void> => {
      if (shared.activePageCount > 0 || !shared.browserPromise) return
      const browser = await shared.browserPromise.catch(() => null)
      shared.browserPromise = null
      if (browser?.connected) {
        await browser.close().catch((error: unknown) => {
          console.warn('[puppeteer-browser] idle close failed', {
            error: error instanceof Error ? error.message : String(error),
          })
        })
      }
    })()
  }, idleCloseMs)
}

async function launchSharedBrowser(): Promise<Browser> {
  // Sparticuz bundles a Linux binary; Windows must use the installed browser,
  // including when validating a production build with `next start`.
  const isLocal = process.platform === 'win32' || process.env.NODE_ENV === 'development'
  const executablePath = isLocal
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : await chromium.executablePath()
  // Isolate launches from orphaned profiles (including older hot-reloaded code).
  const profilePrefix = getUserDataDir()
  await fs.mkdir(path.dirname(profilePrefix), { recursive: true })
  const userDataDir = await fs.mkdtemp(`${profilePrefix}-`)
  const diskCacheDir = getDiskCacheDir()
  const diskCacheSize = Number(process.env.PUPPETEER_DISK_CACHE_SIZE_BYTES) || DEFAULT_DISK_CACHE_SIZE_BYTES

  await fs.mkdir(userDataDir, { recursive: true })
  await fs.mkdir(diskCacheDir, { recursive: true })

  const browser = await puppeteerCore.launch({
    args: [
      ...(isLocal ? [] : chromium.args),
      `--disk-cache-dir=${diskCacheDir}`,
      `--disk-cache-size=${diskCacheSize}`,
    ],
    executablePath,
    headless: true,
    userDataDir,
  })

  browser.on('disconnected', () => {
    shared.browserPromise = null
    clearIdleCloseTimer()
  })

  console.log('[puppeteer-browser] launched shared browser', {
    userDataDir,
    diskCacheDir,
    diskCacheSize,
  })

  return browser
}

async function getSharedBrowser(): Promise<Browser> {
  clearIdleCloseTimer()
  if (shared.browserPromise) {
    const browser = await shared.browserPromise.catch(() => null)
    if (browser?.connected) return browser
    shared.browserPromise = null
  }

  shared.browserPromise = launchSharedBrowser().catch((error: unknown) => {
    shared.browserPromise = null
    throw error
  })
  return shared.browserPromise
}

export async function newSharedPuppeteerPage(options?: { isolated?: boolean }): Promise<Page> {
  const browser = await getSharedBrowser()
  shared.activePageCount += 1
  let context: BrowserContext | undefined
  try {
    if (options?.isolated) context = await browser.createBrowserContext()
    const page = context ? await context.newPage() : await browser.newPage()
    await page.setCacheEnabled(true)
    return page
  } catch (error) {
    await context?.close().catch(() => undefined)
    shared.activePageCount = Math.max(0, shared.activePageCount - 1)
    scheduleIdleClose()
    throw error
  }
}

export async function closeSharedPuppeteerPage(page: Page | undefined): Promise<void> {
  try {
    if (page && !page.isClosed()) {
      const context = page.browserContext()
      if (context !== page.browser().defaultBrowserContext()) await context.close()
      else await page.close()
    }
  } catch (error) {
    console.warn('[puppeteer-browser] page close failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    shared.activePageCount = Math.max(0, shared.activePageCount - 1)
    scheduleIdleClose()
  }
}
