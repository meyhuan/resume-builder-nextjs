import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';

export interface PublicSiteStats {
  readonly activeUserCount: number;
  readonly resumeCount: number;
}

const getCachedPublicSiteStats = unstable_cache(
  async (): Promise<PublicSiteStats> => {
    const [activeUserCount, resumeCount] = await prisma.$transaction([
      prisma.user.count({
        where: {
          resumes: {
            some: {},
          },
        },
      }),
      prisma.resume.count(),
    ]);

    return {
      activeUserCount,
      resumeCount,
    };
  },
  ['public-site-stats'],
  {
    revalidate: 60 * 60,
  },
);

export async function getPublicSiteStats(): Promise<PublicSiteStats | null> {
  try {
    return await getCachedPublicSiteStats();
  } catch (error) {
    console.error('[public-site-stats] Failed to load public site stats:', error);
    return null;
  }
}
