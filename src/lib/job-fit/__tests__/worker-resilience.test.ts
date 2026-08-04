import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    jobFitTask: {
      findMany: mocks.findMany,
    },
  },
}))
vi.mock('../generator', () => ({ generateJobFit: vi.fn() }))
vi.mock('../quota', () => ({ commitJobFitQuota: vi.fn(), releaseJobFitQuota: vi.fn() }))
vi.mock('../flags', () => ({
  isJobFitWorkerEnabled: () => true,
  getJobFitWorkerConcurrency: () => 1,
}))

import { wakeJobFitWorker } from '../worker'

describe('Job Fit worker resilience', () => {
  beforeEach(() => {
    mocks.findMany.mockReset()
  })

  it('absorbs transient database failures instead of creating an unhandled rejection', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mocks.findMany.mockRejectedValueOnce(new Error('database unavailable'))

    await expect(wakeJobFitWorker()).resolves.toBeUndefined()
    expect(log).toHaveBeenCalledWith(
      '[job-fit-worker] worker cycle failed; retrying automatically',
      expect.objectContaining({ name: 'Error', message: 'database unavailable' }),
    )
  })
})
