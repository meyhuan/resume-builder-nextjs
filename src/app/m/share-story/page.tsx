import type { Metadata } from 'next'
import { resolveStoryPlatform } from '@/lib/xhs-note/story-assets'
import { getCurrentUser } from '@/lib/current-user'
import { prisma } from '@/lib/prisma'
import FixedStoryClient from './fixed-story-client'

export const metadata: Metadata = {
  title: '分享我的简历故事',
  robots: { index: false, follow: false },
}

export default async function ShareStoryPage({ searchParams }: {
  searchParams: Promise<{ source?: string; platform?: string }>
}) {
  const params = await searchParams
  let detectedJob = ''
  let detectedStage = ''

  try {
    const user = await getCurrentUser()
    if (user) {
      const resume = await prisma.resume.findFirst({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: { title: true, content: true },
      })
      if (resume) {
        const content = resume.content as Record<string, unknown> | null
        const jobIntention = content?.jobIntention as Record<string, unknown> | null
        const baseInfo = content?.baseInfo as Record<string, unknown> | null

        const rawJob = String(jobIntention?.position || baseInfo?.title || resume.title || '').trim()
        const ignoredTitles = ['我的简历', '未命名简历', '新建简历', '简历草稿', '无标题简历']
        if (rawJob && !ignoredTitles.includes(rawJob)) {
          detectedJob = rawJob.slice(0, 30)
        }

        const recruitmentType = String(jobIntention?.recruitmentType || jobIntention?.type || '')
        if (recruitmentType.includes('校招') || recruitmentType.includes('实习')) {
          detectedStage = '应届生/实习'
        }
      }
    }
  } catch {
    // Non-critical fallback for unauthenticated / network issues
  }

  return (
    <FixedStoryClient
      source={params.source === 'mini' ? 'mini' : 'web'}
      initialPlatform={resolveStoryPlatform(params.source, params.platform)}
      detectedJob={detectedJob}
      detectedStage={detectedStage}
    />
  )
}
