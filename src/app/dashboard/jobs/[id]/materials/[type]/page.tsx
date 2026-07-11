import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { JobMaterialEditor } from '@/components/jobs/job-material-editor'
import { JobPageShell } from '@/components/jobs/job-page-shell'
import { getCurrentUser } from '@/lib/auth/current-user'
import { getJobMaterialTypeBySlug, JOB_MATERIAL_META, parseJobMaterialContent } from '@/lib/jobs/job-material-contracts'
import { prisma } from '@/lib/prisma'

export const metadata: Metadata = { title: '编辑求职材料', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
interface MaterialEditorPageProps { readonly params: Promise<{ id: string; type: string }> }

export default async function MaterialEditorPage({ params }: MaterialEditorPageProps) {
  const { id, type: slug } = await params
  const type = getJobMaterialTypeBySlug(slug)
  if (!type) notFound()
  const user = await getCurrentUser()
  if (!user) redirect(`/login?redirect=/dashboard/jobs/${id}/materials/${slug}`)
  const job = await prisma.job.findFirst({ where: { id, userId: user.id }, include: { factSet: { select: { confirmedAt: true } }, materials: { where: { type } } } })
  if (!job) notFound()
  if (!job.factSet.confirmedAt) redirect(`/dashboard/jobs/${job.id}/facts`)
  const material = job.materials[0] ?? null
  const content = material ? parseJobMaterialContent(material.content) : null
  const meta = JOB_MATERIAL_META[type]

  return (
    <JobPageShell>
      <Link href={`/dashboard/jobs/${job.id}/materials`} className="mb-5 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-violet-600"><ArrowLeft className="h-4 w-4" />返回材料包</Link>
      <header className="mb-7"><h1 className="text-2xl font-bold text-slate-800">{meta.label}</h1><p className="mt-1 text-sm text-slate-500">{job.company ? `${job.company} · ` : ''}{job.role} · {meta.description}</p></header>
      <JobMaterialEditor jobId={job.id} type={type} label={meta.label} description={meta.description} initialMaterial={material && content ? { id: material.id, title: material.title, text: content.text, updatedAt: material.updatedAt.toISOString() } : null} />
    </JobPageShell>
  )
}

