'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function submitFeedback(data: {
  content: string;
  contact?: string;
  attachment?: string;
}) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('auth_uid')?.value;

    if (!data.content?.trim()) {
      return { success: false, error: '反馈内容不能为空' };
    }

    if (data.attachment && !/^https?:\/\//.test(data.attachment)) {
      return { success: false, error: '附件地址无效' };
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
    return { success: false, error: '提交反馈失败，请稍后重试' };
  }
}
