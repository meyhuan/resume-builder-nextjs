import { NextResponse } from 'next/server'
import { getAllTemplates } from '@/templates/template-loader'

/**
 * GET /next-api/templates
 *
 * Public endpoint - returns the full template registry for the WeChat mini-program.
 * No auth required since template metadata is not user-specific.
 */
export async function GET() {
  const templates = getAllTemplates().map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    preview: t.preview ?? null,
    tags: t.tags ?? [],
  }))
  return NextResponse.json(templates)
}
