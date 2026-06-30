import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import puppeteerCore from 'puppeteer-core'
import type { Browser, Page } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'

const DEFAULT_IDLE_CLOSE_MS = 10 * 60 * 1000
const DEFAULT_DISK_CACHE_SIZE_BYTES = 128 * 1024 * 1024

let browserPromise: Promise<Browser> | null = null
let activePageCount = 0
let idleCloseTimer: ReturnType<typeof setTimeout> | null = null

function getIdleCloseMs(): number {
  const raw = Number(process.env.PUPPETEER_IDLE_CLOSE_MS)
  if (!Number.isFinite(raw) || raw < 0) return DEFAULT_IDLE_CLOSE_MS
  return raw
}

function getCacheRoot(): string {
  return process.env.PUPPETEER_USER_DATA_DIR ||
    process.env.PUPPETEER_CACHE_DIR ||
    path.join(os.tmpdir(), 'aijianli-puppeteer')
}

function getUserDataDir(): string {
  return path.join(getCacheRoot(), 'profile')
}

function getDiskCacheDir(): string {
  return path.join(getCacheRoot(), 'http-cache')
}

function clearIdleCloseTimer(): void {
  if (idleCloseTimer) {
    clearTimeout(idleCloseTimer)
    idleCloseTimer = null
  }
}

function scheduleIdleClose(): void {
  clearIdleCloseTimer()
  const idleCloseMs = getIdleCloseMs()
  if (idleCloseMs === 0 || activePageCount > 0 || !browserPromise) return

  idleCloseTimer = setTimeout(() => {
    void (async (): Promise<void> => {
      if (activePageCount > 0 || !browserPromise) return
      const browser = await browserPromise.catch(() => null)
      browserPromise = null
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
  const isLocal = process.env.NODE_ENV === 'development'
  const executablePath = isLocal
    ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    : await chromium.executablePath()
  const userDataDir = getUserDataDir()
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
    browserPromise = null
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
  if (browserPromise) {
    const browser = await browserPromise.catch(() => null)
    if (browser?.connected) return browser
    browserPromise = null
  }

  browserPromise = launchSharedBrowser().catch((error: unknown) => {
    browserPromise = null
    throw error
  })
  return browserPromise
}

export async function newSharedPuppeteerPage(): Promise<Page> {
  const browser = await getSharedBrowser()
  activePageCount += 1
  try {
    const page = await browser.newPage()
    await page.setCacheEnabled(true)
    return page
  } catch (error) {
    activePageCount = Math.max(0, activePageCount - 1)
    scheduleIdleClose()
    throw error
  }
}

export async function closeSharedPuppeteerPage(page: Page | undefined): Promise<void> {
  try {
    if (page && !page.isClosed()) await page.close()
  } catch (error) {
    console.warn('[puppeteer-browser] page close failed', {
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    activePageCount = Math.max(0, activePageCount - 1)
    scheduleIdleClose()
  }
}
