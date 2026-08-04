export function isJobFitEnabledForUser(wxId: string): boolean {
  if (process.env.NODE_ENV !== 'production' && process.env.JOB_FIT_ENABLED === undefined) return true
  if (process.env.JOB_FIT_ENABLED !== 'true') return false
  const allowlist = new Set(
    (process.env.JOB_FIT_ALLOWLIST ?? '').split(',').map((value) => value.trim()).filter(Boolean),
  )
  if (allowlist.has(wxId)) return true
  const percent = Math.min(100, Math.max(0, Number(process.env.JOB_FIT_ROLLOUT_PERCENT ?? '100')))
  let hash = 0
  for (const char of wxId) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  return Math.abs(hash) % 100 < percent
}

export function isJobFitWorkerEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production' && process.env.JOB_FIT_WORKER_ENABLED === undefined) return true
  return process.env.JOB_FIT_WORKER_ENABLED === 'true'
}

export function getJobFitWorkerConcurrency(): number {
  return Math.min(8, Math.max(1, Number(process.env.JOB_FIT_WORKER_CONCURRENCY ?? '1') || 1))
}

export type JobFitEngineMode = 'legacy' | 'shadow' | 'shared'

export function getJobFitEngineMode(): JobFitEngineMode {
  const configured = process.env.JOB_FIT_ENGINE_MODE?.toLowerCase()
  if (configured === 'legacy' || configured === 'shadow' || configured === 'shared') return configured
  return process.env.NODE_ENV === 'production' ? 'legacy' : 'shared'
}
