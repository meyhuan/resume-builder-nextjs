'use server';

import { prisma } from '@/lib/prisma';
import type { PublicFeedbackItem } from '@/entities/feedback/public-feedback-item';

/**
 * Load public feedback items for the feedback square.
 */
export async function listPublicFeedback(): Promise<readonly PublicFeedbackItem[]> {
  const feedbackList = await prisma.feedback.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
    select: {
      id: true,
      content: true,
      createdAt: true,
      attachment: true,
    },
  });
  return feedbackList.map((item) => ({
    id: item.id,
    content: item.content,
    status: 'RECEIVED',
    displayName: '微信用户',
    createdAt: item.createdAt.toISOString(),
    likeCount: 0,
    attachment: item.attachment,
    adminReply: null,
    adminReplyAt: null,
  }));
}
