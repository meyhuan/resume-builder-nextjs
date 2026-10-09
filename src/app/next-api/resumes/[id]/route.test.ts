import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from './route'

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    resume: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn((name: string) => {
      if (name === 'auth_uid') return { value: 'test-user-id' }
      return undefined
    }),
  })),
}))

vi.mock('@/lib/persist-resume-assets', () => ({
  persistResumeAssets: vi.fn(async ({ content, thumbnail }: { content?: Record<string, unknown>; thumbnail?: string | null }) => ({
    content: content || {},
    thumbnail: thumbnail || null,
  })),
}))

vi.mock('@/entities/resume/normalize-resume-content', () => ({
  normalizeResumeContent: vi.fn((content: Record<string, unknown>) => content),
}))

vi.mock('@/lib/upload-oss-asset', () => ({
  deleteOssAsset: vi.fn(),
}))

describe('PUT /next-api/resumes/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle thumbnail-only update without content', async () => {
    const { prisma } = await import('@/lib/prisma')
    
    // Mock existing resume
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      id: 'test-id',
      userId: 'test-user-id',
      content: { sections: [], name: 'Test' },
      title: 'Test Resume',
      template: 'simple',
      thumbnail: null,
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    vi.mocked(prisma.resume.update).mockResolvedValue({
      id: 'test-id',
      userId: 'test-user-id',
      content: { sections: [], name: 'Test' },
      title: 'Test Resume',
      template: 'simple',
      thumbnail: 'data:image/png;base64,thumbnail-data',
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new Request('http://localhost/next-api/resumes/test-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ thumbnail: 'data:image/png;base64,thumbnail-data' }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) })
    
    expect(response.status).toBe(200)
    expect(prisma.resume.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'test-id' }),
        data: expect.objectContaining({
          thumbnail: 'data:image/png;base64,thumbnail-data',
        }),
      })
    )
  })

  it('should handle content update', async () => {
    const { prisma } = await import('@/lib/prisma')
    
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      id: 'test-id',
      userId: 'test-user-id',
      content: { sections: [], name: 'Test' },
      title: 'Test Resume',
      template: 'simple',
      thumbnail: null,
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    
    vi.mocked(prisma.resume.update).mockResolvedValue({
      id: 'test-id',
      userId: 'test-user-id',
      content: { sections: [], name: 'Updated' },
      title: 'Updated Resume',
      template: 'simple',
      thumbnail: null,
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new Request('http://localhost/next-api/resumes/test-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { sections: [], name: 'Updated' },
        template: 'simple',
      }),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) })
    
    expect(response.status).toBe(200)
  })

  it('should return 400 when no fields to update', async () => {
    const { prisma } = await import('@/lib/prisma')
    
    vi.mocked(prisma.resume.findFirst).mockResolvedValue({
      id: 'test-id',
      userId: 'test-user-id',
      content: { sections: [], name: 'Test' },
      title: 'Test Resume',
      template: 'simple',
      thumbnail: null,
      meta: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = new Request('http://localhost/next-api/resumes/test-id', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })

    const response = await PUT(request, { params: Promise.resolve({ id: 'test-id' }) })
    
    expect(response.status).toBe(400)
  })
})
