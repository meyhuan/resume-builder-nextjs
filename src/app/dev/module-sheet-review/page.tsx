import MobileEditHomeClient from '@/app/m/edit/edit-home-client'
import { getTemplateFixture } from '@/lib/template-fixtures'
import { notFound } from 'next/navigation'
export default function Page() {
  if (process.env.NODE_ENV !== 'development') notFound()
  const content = structuredClone(getTemplateFixture('full'))
  content.id = 'local-module-sheet-review'
  content.baseInfo = { ...content.baseInfo, showAvatar: true }
  return <MobileEditHomeClient initial={{ id: content.id, title: '本地交互验证', content, template: 'simple' }} initialInMiniProgram />
}
