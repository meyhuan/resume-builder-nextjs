'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import type { Prisma } from '@prisma/client';

type FeedbackAdminStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED';

interface FeedbackActionResult {
  readonly success: boolean;
  readonly error?: string;
}

interface ServerChanPayload {
  readonly title: string;
  readonly desp: string;
  readonly tags: string;
}

function isDevelopmentEnvironment(): boolean {
  return process.env.NODE_ENV === 'development';
}

async function sendServerChanMessage(payload: ServerChanPayload): Promise<void> {
  const sendKey: string | undefined = process.env.SERVERCHAN_SEND_KEY;
  if (!sendKey) return;
  try {
    const formData: URLSearchParams = new URLSearchParams();
    formData.set('title', payload.title);
    formData.set('desp', payload.desp);
    formData.set('tags', payload.tags);
    const response: Response = await fetch(`https://sctapi.ftqq.com/${sendKey}.send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
    if (!response.ok) {
      console.error('ServerChan push failed:', response.status, await response.text());
    }
  } catch (error) {
    console.error('ServerChan push error:', error);
  }
}

function buildFeedbackPushContent(data: {
  readonly content: string;
  readonly contact: string;
  readonly attachment?: string;
  readonly userId?: string;
}): string {
  const lines: string[] = [
    '收到新的用户反馈。',
    '',
    `联系方式：${data.contact}`,
    `登录用户：${data.userId || '未登录/未知'}`,
    '',
    '反馈内容：',
    data.content,
  ];
  if (data.attachment) {
    lines.push('', `图片附件：${data.attachment}`);
  }
  return lines.join('\n');
}

export async function submitFeedback(data: {
  content: string;
  contact: string;
  attachment?: string;
  diagnostics?: unknown;
  requestLogs?: unknown;
}): Promise<FeedbackActionResult> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get('auth_uid')?.value;
    const content: string = data.content.trim();
    const contact: string = data.contact.trim();

    if (!content) {
      return { success: false, error: '反馈内容不能为空' };
    }
    if (!contact) {
      return { success: false, error: '请留下联系方式，方便我回复和定位问题' };
    }

    if (data.attachment && !/^https?:\/\//.test(data.attachment)) {
      return { success: false, error: '附件地址无效' };
    }

    await prisma.feedback.create({
      data: {
        content,
        contact,
        attachment: data.attachment || null,
        diagnostics: data.diagnostics as Prisma.InputJsonValue | undefined,
        requestLogs: data.requestLogs as Prisma.InputJsonValue | undefined,
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
    await sendServerChanMessage({
      title: '收到新的用户反馈',
      desp: buildFeedbackPushContent({
        content,
        contact,
        attachment: data.attachment,
        userId,
      }),
      tags: '用户反馈|智简简历',
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    return { success: false, error: '提交反馈失败，请稍后重试' };
  }
}

export async function deleteFeedbackForDevelopment(id: string): Promise<FeedbackActionResult> {
  if (!isDevelopmentEnvironment()) {
    return { success: false, error: '仅开发模式允许删除反馈' };
  }
  if (!id) {
    return { success: false, error: '反馈 ID 无效' };
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
    return { success: false, error: '删除反馈失败，请稍后重试' };
  }
}

export async function saveFeedbackAdminReplyForDevelopment(data: {
  readonly id: string;
  readonly status: FeedbackAdminStatus;
  readonly adminReply: string;
}): Promise<FeedbackActionResult> {
  if (!isDevelopmentEnvironment()) {
    return { success: false, error: '仅开发模式允许管理反馈' };
  }
  if (!data.id) {
    return { success: false, error: '反馈 ID 无效' };
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
    return { success: false, error: '保存回复失败，请稍后重试' };
  }
}
