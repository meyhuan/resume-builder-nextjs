import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { defaultResume } from '@/state/store';

/**
 * Server page that creates a new blank resume and redirects to the editor.
 * If the user is not authenticated, redirects to login first.
 */
export default async function NewEditorPage(): Promise<never> {
  const cookieStore = await cookies();
  const userId: string | undefined = cookieStore.get('auth_uid')?.value;

  if (!userId) {
    redirect('/login?redirect=/editor/new');
  }

  const resume = await prisma.resume.create({
    data: {
      title: '未命名简历',
      content: JSON.parse(JSON.stringify(defaultResume)),
      template: 'simple',
      user: {
        connect: { wxId: userId },
      },
    },
  });

  redirect(`/editor/${resume.id}`);
}
