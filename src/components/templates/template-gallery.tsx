'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ReactElement } from 'react'
import type { TemplateMetadata } from '@/lib/templates/template-metadata'
import { templateLabels } from '@/lib/templates/template-taxonomy'
import { TemplateBrowser } from './template-browser'

export function TemplateGallery({
  templates,
}: {
  readonly templates: readonly TemplateMetadata[]
}): ReactElement {
  return (
    <TemplateBrowser
      templates={templates}
      gridClassName="grid grid-cols-2 gap-4 md:grid-cols-4"
      renderTemplate={(template) => (
        <Link
          href={`/editor?template=${template.id}`}
          key={template.id}
          data-template-id={template.id}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-violet-400"
        >
          <div className="relative aspect-[210/297] bg-slate-100">
            <Image
              src={template.preview}
              alt={template.name}
              fill
              className="object-cover object-top"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
          <div className="p-3">
            <h2 className="text-sm font-semibold text-slate-900">
              {template.name}
            </h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              {template.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {templateLabels(template).map((label) => (
                <span
                  key={label}
                  className="rounded bg-slate-50 px-1.5 py-1 text-xs text-slate-600"
                >
                  {label}
                </span>
              ))}
            </div>
            <span className="mt-3 block text-xs font-medium text-violet-700">
              使用此模板 →
            </span>
          </div>
        </Link>
      )}
    />
  )
}
