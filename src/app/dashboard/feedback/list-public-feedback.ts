'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';
import type { PublicFeedbackItem } from '@/entities/feedback/public-feedback-item';

interface FeedbackRecord {
  readonly id: string;
  readonly content: string;
  readonly createdAt: Date;
  readonly attachment: string | null;
  readonly status?: 'RECEIVED' | 'PROCESSING' | 'COMPLETED';
  readonly likeCount?: number;
  readonly adminReply?: string | null;
  readonly adminReplyAt?: Date | null;
}

/**
 * Load public feedback items for the feedback square.
 */
export async function listPublicFeedback(): Promise<readonly PublicFeedbackItem[]> {
  noStore();
  const feedbackList: readonly FeedbackRecord[] = await prisma.feedback.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  }) as unknown as readonly FeedbackRecord[];
  return feedbackList.map((item) => ({
    id: item.id,
    content: item.content,
    status: item.status ?? 'RECEIVED',
    displayName: '微信用户',
    createdAt: item.createdAt.toISOString(),
    likeCount: item.likeCount ?? 0,
    attachment: item.attachment,
    adminReply: item.adminReply ?? null,
    adminReplyAt: item.adminReplyAt ? item.adminReplyAt.toISOString() : null,
  }));
}
