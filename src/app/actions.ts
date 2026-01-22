'use server'

import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export async function createResume() {
  // Demo user ID
  const userId = 'demo-user-id'
  
  const resume = await prisma.resume.create({
    data: {
      title: 'Untitled Resume',
      content: {}, 
      template: 'simple',
      user: {
        connectOrCreate: {
          where: { clerkId: userId },
          create: { clerkId: userId, email: 'demo@example.com' }
        }
      }
    }
  })
  
  redirect(`/editor/${resume.id}`)
}

export async function deleteResume(id: string) {
  await prisma.resume.delete({ where: { id } })
}
