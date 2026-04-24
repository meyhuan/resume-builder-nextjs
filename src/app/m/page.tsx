import { type ReactElement } from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import MobileHomeClient from './home-client'

export const metadata: Metadata = {
  title: '首页 · AI 简历',
  description: '移动端简历首页：一键生成、我的简历、风格模板',
}

/**
 * Mobile H5 home entry (/m). Reads the auth cookie server-side so the SSR
 * HTML already reflects the user's login state — this lets the client skip
 * the "logged-out → logged-in" re-render that caused the "My Resumes"
 * section to pop in and shift layout on first paint.
 */
export default async function MobileHomePage(): Promise<ReactElement> {
  const store = await cookies()
  const initialIsLoggedIn: boolean = Boolean(store.get('auth_uid')?.value)
  return <MobileHomeClient initialIsLoggedIn={initialIsLoggedIn} />
}
