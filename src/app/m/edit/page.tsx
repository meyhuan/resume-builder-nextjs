import { type ReactElement } from 'react'
import type { Metadata } from 'next'
import MobileEditHomeClient from './edit-home-client'

export const metadata: Metadata = {
  title: '编辑简历 · AI 简历',
  description: '移动端简历编辑首页',
}

export default function MobileEditHomePage(): ReactElement {
  return <MobileEditHomeClient />
}
