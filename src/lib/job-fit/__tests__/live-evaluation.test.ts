import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ResumeData } from '@/entities/resume/resume-data'

vi.mock('server-only', () => ({}))

import { generateSharedJobFit } from '../shared-generator'

function loadProjectEnvForManualEvaluation(): void {
  if (process.env.RUN_LIVE_JOB_FIT_EVAL !== 'true') return
  const lines = readFileSync(resolve(process.cwd(), '.env'), 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key] !== undefined) continue
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '')
  }
  // This test is an explicit manual evaluation of the configured model, never
  // a default test-suite dependency. Do not silently exercise the fake adapter.
  process.env.JOB_FIT_FAKE_AI = 'false'
}

loadProjectEnvForManualEvaluation()

const PUBLIC_RESUME_URL = process.env.JOB_FIT_EVAL_RESUME_URL
  ?? 'https://gist.githubusercontent.com/romain-berthe/d09aeeb5eb7ccfbf56183144e7d9c3cc/raw/resume.json'
const OFFICIAL_JD_URL =
  'https://jobs.lever.co/kpler/c7103421-ccbe-43b4-b23d-752e8c8a3a9c'

interface PublicResume {
  readonly basics?: { readonly summary?: string }
  readonly skills?: readonly { readonly name?: string; readonly keywords?: readonly string[] }[]
  readonly work?: readonly {
    readonly name?: string
    readonly company?: string
    readonly position?: string
    readonly startDate?: string
    readonly endDate?: string
    readonly summary?: string
    readonly highlights?: readonly string[]
  }[]
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function toHtml(lines: readonly string[]): string {
  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
}

function toResume(source: PublicResume): ResumeData {
  const sections = [
    {
      id: 'summary',
      title: 'Professional summary',
      columns: 1,
      blocks: [{ id: 'summary-text', type: 'text' as const, html: `<p>${escapeHtml(source.basics?.summary ?? '')}</p>` }],
    },
    {
      id: 'skills',
      title: 'Skills',
      columns: 1,
      blocks: [{
        id: 'skills-text',
        type: 'text' as const,
        html: `<p>${escapeHtml((source.skills ?? []).flatMap((skill) => [skill.name ?? '', ...(skill.keywords ?? [])]).filter(Boolean).join(' · '))}</p>`,
      }],
    },
    {
      id: 'experience',
      title: 'Experience',
      columns: 1,
      blocks: (source.work ?? []).slice(0, 4).map((work, index) => ({
        id: `experience-${index}`,
        type: 'experience' as const,
        company: work.name ?? work.company ?? 'Public company',
        position: work.position ?? 'Product Manager',
        startDate: work.startDate ?? '',
        endDate: work.endDate ?? '',
        contentHtml: toHtml([
          ...(work.summary ? [work.summary] : []),
          ...(work.highlights ?? []),
        ]),
      })),
    },
  ]
  return {
    id: 'public-product-manager-sample',
    name: '公开样例候选人',
    jobIntention: { position: 'Product Manager' },
    sections,
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

async function loadOfficialJobDescription(): Promise<string> {
  const response = await fetch(OFFICIAL_JD_URL, {
    headers: { 'user-agent': 'Mozilla/5.0 JobFitEvaluation/1.0' },
  })
  if (!response.ok) throw new Error(`JD request failed: ${response.status}`)
  const text = htmlToText(await response.text())
  const start = text.indexOf('Responsibilities')
  const end = text.indexOf('We are a dynamic company')
  if (start < 0 || end <= start) throw new Error('Unable to locate official JD sections')
  return text.slice(start, end).slice(0, 9_000)
}

describe.runIf(process.env.RUN_LIVE_JOB_FIT_EVAL === 'true')('Job Fit live evaluation', () => {
  it('uses a public resume and an official live JD without persisting either', async () => {
    expect(process.env.DASHSCOPE_API_KEY).toBeTruthy()
    const [resumeResponse, jobDescription] = await Promise.all([
      fetch(PUBLIC_RESUME_URL, { headers: { 'user-agent': 'Mozilla/5.0 JobFitEvaluation/1.0' } }),
      loadOfficialJobDescription(),
    ])
    expect(resumeResponse.ok).toBe(true)
    const resume = toResume((await resumeResponse.json()) as PublicResume)
    const result = await generateSharedJobFit({
      resume,
      jobTitle: 'Product Manager, Risk & Compliance',
      companyName: 'Kpler',
      jobDescription,
      focusAreas: ['keywords', 'achievements', 'concise'],
      optimizationMode: 'PROFESSIONAL',
    })

    // Keep console output aggregate-only: the source is public, but this test never logs PII or full resume text.
    console.info('[job-fit-live-eval]', {
      model: result.modelName,
      score: result.scoring,
      changes: result.changes.map((change) => ({
        category: change.category,
        requirementId: change.requirementId,
        reason: change.reason,
        originalText: change.originalText.slice(0, 500),
        optimizedText: change.optimizedText.slice(0, 500),
      })),
      factGuardRejectCount: result.factGuardRejectCount,
      suggestions: result.summary.suggestions,
    })

    expect(result.optimizedResume).toBeDefined()
    expect(result.summary.requirements.length).toBeGreaterThan(0)
  }, 120_000)
})
