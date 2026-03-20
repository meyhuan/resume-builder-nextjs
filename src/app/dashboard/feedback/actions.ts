'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

type FeedbackAdminStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED';

interface FeedbackActionResult {
  readonly success: boolean;
  readonly error?: string;
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export async function submitFeedback(data: {
  content: string;
  contact?: string;
  attachment?: string;
}): Promise<FeedbackActionResult> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('auth_uid')?.value;

    if (!data.content?.trim()) {
      return { success: false, error: 'Feedback content cannot be empty' };
    }

    if (data.attachment && !/^https?:\/\//.test(data.attachment)) {
      return { success: false, error: 'Invalid attachment URL' };
    }

    await prisma.feedback.create({
      data: {
        content: data.content,
        contact: data.contact || null,
        attachment: data.attachment || null,
        ...(userId ? {
          user: {
            connectOrCreate: {
              where: { wxId: userId },
              create: { wxId: userId }
            }
          }
        } : {})
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return { success: false, error: 'Failed to submit feedback. Please try again later.' };
  }
}

export async function deleteFeedbackForDevelopment(id: string): Promise<FeedbackActionResult> {
  if (!isDevelopmentEnvironment()) {
    return { success: false, error: 'Deleting feedback is only allowed in development mode' };
  }
  if (!id) {
    return { success: false, error: 'Invalid feedback ID' };
  }
  try {
    await prisma.feedback.delete({
      where: {
        id,
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to delete feedback in development:', error);
    return { success: false, error: 'Failed to delete feedback. Please try again later.' };
  }
}

export async function saveFeedbackAdminReplyForDevelopment(data: {
  readonly id: string;
  readonly status: FeedbackAdminStatus;
  readonly adminReply: string;
}): Promise<FeedbackActionResult> {
  if (!isDevelopmentEnvironment()) {
    return { success: false, error: 'Managing feedback is only allowed in development mode' };
  }
  if (!data.id) {
    return { success: false, error: 'Invalid feedback ID' };
  }
  try {
    const trimmedReply: string = data.adminReply.trim();
    const updateData: Record<string, string | Date | null> = {
      status: data.status,
      adminReply: trimmedReply || null,
      adminReplyAt: trimmedReply ? new Date() : null,
    };
    await prisma.feedback.update({
      where: {
        id: data.id,
      },
      data: updateData as never,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to save feedback admin reply in development:', error);
    return { success: false, error: 'Failed to save reply. Please try again later.' };
  }
}
