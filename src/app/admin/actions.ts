'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * Update or create a template metadata entry with a thumbnail.
 */
export async function upsertTemplateAction(data: {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
}) {
  try {
    const template = await prisma.template.upsert({
      where: { id: data.id },
      update: {
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
      },
      create: {
        id: data.id,
        name: data.name,
        description: data.description,
        thumbnail: data.thumbnail,
      },
    });

    revalidatePath('/admin/templates');
    revalidatePath('/'); // Revalidate landing page where templates are shown
    return { success: true, data: template };
  } catch (error) {
    console.error('Failed to upsert template:', error);
    return { success: false, error: 'Database update failed' };
  }
}

/**
 * Fetch all templates from the database.
 */
export async function getTemplatesAction() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { updatedAt: 'desc' },
    });
    return { success: true, data: templates };
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return { success: false, error: 'Failed to fetch templates' };
  }
}
