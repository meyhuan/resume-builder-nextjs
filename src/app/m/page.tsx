import { type ReactElement } from 'react'
import type { Metadata } from 'next'
import MobileHomeClient from './home-client'

export const metadata: Metadata = {
  title: '首页 · AI 简历',
  description: '移动端简历首页：一键生成、我的简历、风格模板',
}

/**
 * Mobile H5 home entry (/m). Mirrors the miniprogram home page layout
 * with a gradient hero, primary actions, user's resume list and a
 * template gallery.
 */
export default function MobileHomePage(): ReactElement {
  return <MobileHomeClient />
}
