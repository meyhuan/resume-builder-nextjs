#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import OpenAI from 'openai'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i]
    if (!key.startsWith('--')) continue
    const next = argv[i + 1]
    args[key.slice(2)] = next && !next.startsWith('--') ? next : true
    if (next && !next.startsWith('--')) i += 1
  }
  return args
}

function fail(message) {
  console.error(`[convert-html-template] ${message}`)
  process.exit(1)
}

function usage() {
  console.log(`
Usage:
  node scripts/convert-html-template.mjs --input ./template.html --id my_template --name "模板名"

Options:
  --input   HTML file path. Single-file HTML is recommended.
  --id      Template id. Lowercase letters, numbers, "_" and "-" only.
  --name    Display name used in generated README and comments.
  --ai      Use AI to infer semantic layout and style intent, then generate code from a fixed generator.
  --no-ai   Force rule-only conversion.
  --model   AI model name. Defaults to qwen-plus.
  --base-url AI OpenAI-compatible base URL. Defaults to DashScope compatible endpoint.
  --api-key-env Environment variable used for AI key. Defaults to DASHSCOPE_API_KEY.
  --force   Overwrite an existing generated template directory.
`)
}

function normalizeTemplateId(value) {
  return String(value || '').trim().toLowerCase()
}

function toPascalCase(value) {
  const text = String(value || 'GeneratedTemplate')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
  const pascal = text
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  return pascal || 'GeneratedTemplate'
}

function extractStyleBlocks(document) {
  return Array.from(document.querySelectorAll('style'))
    .map((node) => node.textContent || '')
    .join('\n')
}

function extractInlineCss(document) {
  return Array.from(document.querySelectorAll('[style]'))
    .map((node) => node.getAttribute('style') || '')
    .join(';\n')
}

function compactText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function buildDomOutline(document) {
  const interesting = Array.from(document.body?.querySelectorAll('header,main,aside,section,article,div,h1,h2,h3,p,ul,li,img') || [])
  return interesting.slice(0, 120).map((node, index) => {
    const tag = node.tagName.toLowerCase()
    const id = node.id ? `#${node.id}` : ''
    const cls = node.className && typeof node.className === 'string'
      ? `.${node.className.trim().split(/\s+/).slice(0, 4).join('.')}`
      : ''
    const style = compactText(node.getAttribute('style') || '', 120)
    const text = tag === 'img'
      ? compactText(node.getAttribute('src') || node.getAttribute('alt') || '', 80)
      : compactText(node.textContent || '', 100)
    return `${index}. <${tag}${id}${cls}> style="${style}" text="${text}"`
  }).join('\n')
}

function countMatches(text, regex) {
  const counts = new Map()
  for (const match of text.matchAll(regex)) {
    const value = match[1].toLowerCase()
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

function topEntries(counts, limit = 8) {
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))
}

function choosePrimaryColor(colors) {
  const ignored = new Set([
    '#000', '#000000', '#111', '#111111', '#222', '#222222', '#333', '#333333',
    '#444', '#444444', '#555', '#555555', '#666', '#666666', '#777', '#777777',
    '#888', '#888888', '#999', '#999999', '#fff', '#ffffff', '#f5f5f5', '#f8f8f8',
  ])
  return colors.find((item) => !ignored.has(item.value))?.value || '#111827'
}

function pickNumber(candidates, fallback) {
  const found = candidates.find((value) => Number.isFinite(value) && value > 0)
  return found ?? fallback
}

function extractFirstNumber(text, regex) {
  const match = text.match(regex)
  return match ? Number(match[1]) : null
}

function classifyLayout(document, cssText) {
  const bodyText = document.body?.textContent || ''
  const leftRightWords = /(sidebar|aside|left|right|双栏|侧栏|left-column|right-column)/i
  const gridOrFlex = /(grid-template-columns|display\s*:\s*grid|display\s*:\s*flex)/i
  const widthRatio = /(width\s*:\s*(2[5-9]|3[0-9]|4[0-2])%)/i
  if (leftRightWords.test(cssText) || leftRightWords.test(bodyText) || (gridOrFlex.test(cssText) && widthRatio.test(cssText))) {
    return 'two-column'
  }
  const headerHints = /(header|profile|hero|banner|avatar|头像|姓名)/i
  if (headerHints.test(cssText) || headerHints.test(bodyText)) return 'top-header'
  return 'single-column'
}

function inferHeaderVariant(document, cssText) {
  if (/(banner|hero|background\s*:|background-color\s*:|linear-gradient)/i.test(cssText)) return 'banner'
  if (/(avatar|头像|photo|portrait)/i.test(cssText + (document.body?.textContent || ''))) return 'card'
  return 'minimal'
}

function inferSectionTitleVariant(cssText) {
  if (/border-left\s*:|left-bar|竖线/.test(cssText)) return 'left-bar'
  if (/border-bottom\s*:|underline|下划线/.test(cssText)) return 'underline'
  if (/border-radius\s*:|background(?:-color)?\s*:/.test(cssText)) return 'pill'
  return 'left-bar'
}

function analyzeHtml(html, inputPath) {
  const dom = new JSDOM(html)
  const { document } = dom.window
  const cssText = `${extractStyleBlocks(document)}\n${extractInlineCss(document)}`
  const colors = topEntries(countMatches(cssText, /(#(?:[0-9a-fA-F]{3}){1,2})\b/g), 12)
  const fontSizes = topEntries(countMatches(cssText, /font-size\s*:\s*([0-9.]+(?:px|pt|em|rem|mm))/gi), 8)
  const fontFamilies = topEntries(countMatches(cssText, /font-family\s*:\s*([^;{}]+)/gi), 5)
  const primaryColor = choosePrimaryColor(colors)
  const pageWidthMm = extractFirstNumber(cssText, /width\s*:\s*([0-9.]+)\s*mm/i)
  const pageHeightMm = extractFirstNumber(cssText, /(?:min-height|height)\s*:\s*([0-9.]+)\s*mm/i)
  const paddingMm = extractFirstNumber(cssText, /padding\s*:\s*([0-9.]+)\s*mm/i)
  const layout = classifyLayout(document, cssText)
  const headerVariant = inferHeaderVariant(document, cssText)
  const sectionTitleVariant = inferSectionTitleVariant(cssText)
  const sectionTitleCandidates = Array.from(document.querySelectorAll('h2,h3,.section-title,.title'))
    .map((node) => (node.textContent || '').trim())
    .filter(Boolean)
    .slice(0, 12)

  return {
    sourceFile: basename(inputPath),
    primaryColor,
    textColor: '#111827',
    pageWidthMm: pickNumber([pageWidthMm], 210),
    pageHeightMm: pickNumber([pageHeightMm], 297),
    pagePaddingVertical: pickNumber([paddingMm], 18),
    pagePaddingHorizontal: pickNumber([paddingMm], 16),
    layout,
    headerVariant,
    sectionTitleVariant,
    sidebarKeywords: ['自我', '评价', '技能', '证书', '荣誉', '语言', 'self', 'skill', 'certificate', 'honor'],
    colors,
    fontSizes,
    fontFamilies,
    sectionTitleCandidates,
    domOutline: buildDomOutline(document),
  }
}

function stripJsonFence(value) {
  return String(value || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
}

function isHexColor(value) {
  return typeof value === 'string' && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value)
}

function pickEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function validateAiSpec(value, fallback) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return {
    layout: pickEnum(value.layout, ['single-column', 'top-header', 'two-column'], fallback.layout),
    primaryColor: isHexColor(value.primaryColor) ? value.primaryColor.toLowerCase() : fallback.primaryColor,
    textColor: isHexColor(value.textColor) ? value.textColor.toLowerCase() : fallback.textColor,
    headerVariant: pickEnum(value.headerVariant, ['minimal', 'card', 'banner'], fallback.headerVariant),
    sectionTitleVariant: pickEnum(value.sectionTitleVariant, ['left-bar', 'underline', 'pill'], fallback.sectionTitleVariant),
    sidebarKeywords: Array.isArray(value.sidebarKeywords)
      ? value.sidebarKeywords.filter((item) => typeof item === 'string' && item.trim()).slice(0, 12)
      : fallback.sidebarKeywords,
    confidence: typeof value.confidence === 'number' ? Math.max(0, Math.min(1, value.confidence)) : 0,
    notes: Array.isArray(value.notes)
      ? value.notes.filter((item) => typeof item === 'string' && item.trim()).slice(0, 8)
      : [],
  }
}

function buildAiPrompt(html, analysis) {
  return [
    {
      role: 'system',
      content: [
        'You analyze ordinary HTML resume templates and output a strict JSON TemplateSpec.',
        'Do not generate code. Do not include markdown.',
        'The generated React template will be created by a fixed generator, so focus on semantic layout and visual intent.',
        'Allowed layout values: single-column, top-header, two-column.',
        'Allowed headerVariant values: minimal, card, banner.',
        'Allowed sectionTitleVariant values: left-bar, underline, pill.',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task: 'Infer resume template layout/style spec from HTML. Return JSON only.',
        requiredJsonShape: {
          layout: 'single-column | top-header | two-column',
          primaryColor: '#rrggbb',
          textColor: '#rrggbb',
          headerVariant: 'minimal | card | banner',
          sectionTitleVariant: 'left-bar | underline | pill',
          sidebarKeywords: ['skills/self-evaluation style section keywords for two-column sidebar'],
          confidence: 0.0,
          notes: ['short reason or fidelity warning'],
        },
        ruleAnalysis: {
          layout: analysis.layout,
          primaryColor: analysis.primaryColor,
          textColor: analysis.textColor,
          headerVariant: analysis.headerVariant,
          sectionTitleVariant: analysis.sectionTitleVariant,
          colors: analysis.colors,
          fontSizes: analysis.fontSizes,
          fontFamilies: analysis.fontFamilies,
          sectionTitleCandidates: analysis.sectionTitleCandidates,
        },
        domOutline: analysis.domOutline,
        htmlPreview: compactText(html, 12000),
      }),
    },
  ]
}

async function inferWithAi(html, analysis, args) {
  const apiKeyEnv = String(args['api-key-env'] || 'DASHSCOPE_API_KEY')
  const apiKey = process.env[apiKeyEnv]
  if (!apiKey) {
    throw new Error(`Missing environment variable: ${apiKeyEnv}`)
  }
  const model = String(args.model || 'qwen-plus')
  const baseURL = String(args['base-url'] || 'https://dashscope.aliyuncs.com/compatible-mode/v1')
  const client = new OpenAI({ apiKey, baseURL })
  const response = await client.chat.completions.create({
    model,
    messages: buildAiPrompt(html, analysis),
    temperature: 0.1,
    response_format: { type: 'json_object' },
  })
  const raw = stripJsonFence(response.choices[0]?.message?.content || '')
  const parsed = JSON.parse(raw)
  const spec = validateAiSpec(parsed, analysis)
  if (!spec) throw new Error('AI returned invalid TemplateSpec')
  return spec
}

function mergeAiSpec(analysis, aiSpec) {
  if (!aiSpec) return { ...analysis, aiSpec: null }
  return {
    ...analysis,
    layout: aiSpec.layout,
    primaryColor: aiSpec.primaryColor,
    textColor: aiSpec.textColor,
    headerVariant: aiSpec.headerVariant,
    sectionTitleVariant: aiSpec.sectionTitleVariant,
    sidebarKeywords: aiSpec.sidebarKeywords,
    aiSpec,
  }
}

function tsString(value) {
  return JSON.stringify(value, null, 2)
}

function createStylesSource(templateName, analysis) {
  return `export const GENERATED_TEMPLATE_STYLES = {
  name: ${JSON.stringify(templateName)},
  sourceFile: ${JSON.stringify(analysis.sourceFile)},
  layout: ${JSON.stringify(analysis.layout)},
  headerVariant: ${JSON.stringify(analysis.headerVariant)},
  sectionTitleVariant: ${JSON.stringify(analysis.sectionTitleVariant)},
  primaryColor: ${JSON.stringify(analysis.primaryColor)},
  textColor: ${JSON.stringify(analysis.textColor)},
  pageWidthMm: ${analysis.pageWidthMm},
  pageHeightMm: ${analysis.pageHeightMm},
  pagePaddingVertical: ${analysis.pagePaddingVertical},
  pagePaddingHorizontal: ${analysis.pagePaddingHorizontal},
  detectedColors: ${tsString(analysis.colors)},
  detectedFontSizes: ${tsString(analysis.fontSizes)},
  detectedFontFamilies: ${tsString(analysis.fontFamilies)},
  detectedSectionTitles: ${tsString(analysis.sectionTitleCandidates)},
  sidebarKeywords: ${tsString(analysis.sidebarKeywords)},
  aiSpec: ${tsString(analysis.aiSpec)},
} as const
`
}

function createTemplateSource(templateId, templateName, componentName, analysis) {
  const twoColumn = analysis.layout === 'two-column'
  return `"use client"

import type { ReactElement } from 'react'
import type { Section } from '@/entities/resume/section'
import {
  AvatarSlot,
  BlockList,
  DeleteSectionDialog,
  EditableText,
  FieldChip,
  ResumeFrame,
  SortableSection,
  darkenHex,
  hexToRgba,
  lightenHex,
  useEditableHeader,
  useEditableJobIntention,
  useEditableSection,
} from '@/templates/_core'
import type { TemplateProps } from '@/templates/_core'
import { GENERATED_TEMPLATE_STYLES } from './styles'

const TEMPLATE_ID = ${JSON.stringify(templateId)}

export default function ${componentName}(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const primary = theme.primaryColor || GENERATED_TEMPLATE_STYLES.primaryColor
  const header = useEditableHeader(resume.name, resume.baseInfo ?? null)
  const objective = useEditableJobIntention(resume.jobIntention ?? null)
  const showObjective = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const pagePadding = \`\${theme.pagePaddingVertical}mm \${theme.pagePaddingHorizontal}mm\`

  return (
    <ResumeFrame
      resume={resume}
      theme={theme}
      className="rounded overflow-hidden"
      style={{ backgroundColor: '#ffffff', color: theme.textColor }}
    >
      <div
        data-template-id={TEMPLATE_ID}
        style={{
          minHeight: \`\${GENERATED_TEMPLATE_STYLES.pageHeightMm}mm\`,
          padding: pagePadding,
          backgroundColor: '#ffffff',
        }}
      >
        <TemplateHeader header={header} primary={primary} />
        {showObjective && objective.jobIntention ? (
          <ObjectiveBlock objective={objective} primary={primary} />
        ) : null}
        <main
          style={{
            display: 'grid',
            gridTemplateColumns: ${twoColumn ? "'minmax(0, 0.34fr) minmax(0, 0.66fr)'" : "'minmax(0, 1fr)'"},
            gap: ${twoColumn ? '28' : '0'} * theme.spacingScale,
            marginTop: 20 * theme.spacingScale,
          }}
        >
          ${twoColumn ? `<div style={{ display: 'flex', flexDirection: 'column', gap: 18 * theme.spacingScale }}>
            {resume.sections.filter((section) => shouldPlaceInSidebar(section)).map((section) => (
              <SortableSection key={section.id} sectionId={section.id}>
                {(dragProps) => (
                  <TemplateSection
                    section={section}
                    primary={primary}
                    spacingScale={theme.spacingScale}
                    dragRef={dragProps.ref}
                    dragAttrs={dragProps.attributes}
                    dragListeners={dragProps.listeners}
                  />
                )}
              </SortableSection>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 * theme.spacingScale }}>
            {resume.sections.filter((section) => !shouldPlaceInSidebar(section)).map((section) => (
              <SortableSection key={section.id} sectionId={section.id}>
                {(dragProps) => (
                  <TemplateSection
                    section={section}
                    primary={primary}
                    spacingScale={theme.spacingScale}
                    dragRef={dragProps.ref}
                    dragAttrs={dragProps.attributes}
                    dragListeners={dragProps.listeners}
                  />
                )}
              </SortableSection>
            ))}
          </div>` : `<div style={{ display: 'flex', flexDirection: 'column', gap: 22 * theme.spacingScale }}>
            {resume.sections.map((section) => (
              <SortableSection key={section.id} sectionId={section.id}>
                {(dragProps) => (
                  <TemplateSection
                    section={section}
                    primary={primary}
                    spacingScale={theme.spacingScale}
                    dragRef={dragProps.ref}
                    dragAttrs={dragProps.attributes}
                    dragListeners={dragProps.listeners}
                  />
                )}
              </SortableSection>
            ))}
          </div>`}
        </main>
      </div>
      {header.modals}
      {objective.modals}
    </ResumeFrame>
  )
}

function TemplateHeader(props: {
  readonly header: ReturnType<typeof useEditableHeader>
  readonly primary: string
}): ReactElement {
  const { header, primary } = props
  const { name, onCommitName, fields, openEditModal, baseInfo } = header
  const title = baseInfo?.title ?? ''
  const variant = GENERATED_TEMPLATE_STYLES.headerVariant

  return (
    <header
      className="group relative cursor-pointer print:cursor-default"
      onClick={openEditModal}
      style={{
        display: 'flex',
        gap: 20,
        alignItems: 'center',
        padding: '18px 20px',
        borderRadius: 6,
        background: variant === 'banner'
          ? \`linear-gradient(135deg, \${primary} 0%, \${darkenHex(primary, 0.68)} 100%)\`
          : variant === 'card'
            ? \`linear-gradient(135deg, \${hexToRgba(primary, 0.12)} 0%, \${hexToRgba(primary, 0.04)} 100%)\`
            : '#ffffff',
        borderLeft: \`5px solid \${primary}\`,
        boxShadow: variant === 'card' ? '0 1px 0 rgba(15,23,42,0.06)' : undefined,
      }}
    >
      {baseInfo?.showAvatar !== false ? (
        <AvatarSlot
          header={header}
          render={({ image, uploadOverlay }) => (
            <div
              className="relative shrink-0 overflow-hidden bg-white"
              style={{
                width: 82,
                height: 104,
                borderRadius: 6,
                border: \`2px solid \${hexToRgba(primary, 0.25)}\`,
              }}
            >
              {image}
              {uploadOverlay}
            </div>
          )}
        />
      ) : null}

      <div style={{ flex: 1, minWidth: 0 }}>
        <EditableText
          as="h1"
          value={name}
          onCommit={onCommitName}
          style={{
            margin: 0,
            color: variant === 'banner' ? '#ffffff' : darkenHex(primary, 0.72),
            fontSize: '2.15em',
            fontWeight: 800,
            lineHeight: 1.12,
          }}
        />
        {title ? (
          <div style={{ marginTop: 5, color: variant === 'banner' ? 'rgba(255,255,255,0.85)' : '#475569', fontSize: '0.98em', fontWeight: 600 }}>
            {title}
          </div>
        ) : null}
        <div className="flex flex-wrap" style={{ gap: '5px 14px', marginTop: 10, color: variant === 'banner' ? 'rgba(255,255,255,0.86)' : '#475569', fontSize: '0.92em' }}>
          {fields.map((field) => (
            <FieldChip key={field.key} field={field} header={header} deleteColor={primary} className="inline-flex items-center gap-1">
              <span style={{ color: variant === 'banner' ? 'rgba(255,255,255,0.62)' : '#64748b' }}>{field.label}</span>
              <span style={{ color: variant === 'banner' ? '#ffffff' : '#334155', fontWeight: 500 }}>{field.value}</span>
            </FieldChip>
          ))}
        </div>
      </div>
    </header>
  )
}

function ObjectiveBlock(props: {
  readonly objective: ReturnType<typeof useEditableJobIntention>
  readonly primary: string
}): ReactElement {
  const { objective, primary } = props
  const { fields, openEditModal, deleteField, hoveredField, setHoveredField } = objective

  return (
    <section
      className="group relative cursor-pointer print:cursor-default"
      onClick={openEditModal}
      style={{
        marginTop: 18,
        padding: '12px 14px',
        borderRadius: 6,
        backgroundColor: hexToRgba(primary, 0.045),
      }}
    >
      <SectionTitle title="求职意向" primary={primary} />
      <div className="flex flex-wrap" style={{ gap: '7px 14px', marginTop: 8 }}>
        {fields.map((field) => {
          const isHover = hoveredField === field.key
          return (
            <span
              key={field.key}
              className="relative inline-flex items-center"
              style={{ paddingRight: 4 }}
              onMouseEnter={() => setHoveredField(field.key)}
              onMouseLeave={() => setHoveredField(null)}
            >
              <span style={{ color: '#64748b', marginRight: 6 }}>{field.label}</span>
              <span style={{ color: '#1f2937', fontWeight: 500 }}>{field.value}</span>
              <button
                type="button"
                className="print:hidden"
                onClick={(event) => { event.stopPropagation(); deleteField(field.key) }}
                style={{
                  position: 'absolute',
                  top: -7,
                  right: -10,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: '#ffffff',
                  color: '#dc2626',
                  fontSize: 13,
                  lineHeight: '16px',
                  opacity: isHover ? 1 : 0,
                }}
              >
                ×
              </button>
            </span>
          )
        })}
      </div>
    </section>
  )
}

function TemplateSection(props: {
  readonly section: Section
  readonly primary: string
  readonly spacingScale: number
  readonly dragRef: (element: HTMLElement | null) => void
  readonly dragAttrs: unknown
  readonly dragListeners: unknown
}): ReactElement {
  const { section, primary, spacingScale, dragRef, dragAttrs, dragListeners } = props
  const editable = useEditableSection(section)
  const {
    title,
    canEditTitle,
    onCommitTitle,
    isTextOnly,
    onAddBlock,
    onRequestDelete,
    isHovered,
    setHovered,
    isDeleteDialogOpen,
    setDeleteDialogOpen,
    confirmDelete,
  } = editable

  return (
    <section
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ marginBottom: 8 * spacingScale }}>
        <SectionTitle
          title={title}
          primary={primary}
          editableTitle={canEditTitle ? onCommitTitle : undefined}
        />
      </div>
      <div
        className="print:hidden"
        style={{
          position: 'absolute',
          top: -2,
          right: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 5px',
          borderRadius: 4,
          background: '#ffffff',
          border: \`1px solid \${hexToRgba(primary, 0.28)}\`,
          opacity: isHovered ? 1 : 0,
          pointerEvents: isHovered ? 'auto' : 'none',
          zIndex: 5,
        }}
      >
        {!isTextOnly ? <ActionButton label="+" onClick={onAddBlock} primary={primary} /> : null}
        <ActionButton label="×" onClick={onRequestDelete} primary="#dc2626" />
        <button
          ref={dragRef}
          type="button"
          {...(dragAttrs as Record<string, unknown>)}
          {...(dragListeners as Record<string, unknown>)}
          className="cursor-grab active:cursor-grabbing"
          style={{ width: 20, height: 20, color: primary, fontSize: 13 }}
          aria-label="拖动"
          title="拖动"
        >
          ⋮⋮
        </button>
      </div>
      <BlockList
        section={editable}
        themeColor={primary}
        spacingScale={spacingScale}
        rendererStyles={{
          title: { color: '#1f2937', fontWeight: '700' },
          subtitle: { color: '#334155', fontWeight: '600' },
          dateRange: { color: '#475569', fontWeight: '600' },
          content: 'text-[0.98em] text-justify',
          contentColor: '#374151',
        }}
      />
      <DeleteSectionDialog
        open={isDeleteDialogOpen}
        sectionTitle={title}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
      />
    </section>
  )
}

function SectionTitle(props: {
  readonly title: string
  readonly primary: string
  readonly editableTitle?: (value: string) => void
}): ReactElement {
  const { title, primary, editableTitle } = props
  const variant = GENERATED_TEMPLATE_STYLES.sectionTitleVariant
  if (variant === 'pill') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <EditableText
          as="h2"
          value={title}
          onCommit={editableTitle}
          style={{
            margin: 0,
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '4px 12px',
            backgroundColor: hexToRgba(primary, 0.1),
            color: darkenHex(primary, 0.68),
            fontSize: '1.08em',
            fontWeight: 800,
            lineHeight: 1.2,
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        paddingBottom: 5,
        borderBottom: variant === 'underline' ? \`1px solid \${lightenHex(primary, 0.74)}\` : undefined,
      }}
    >
      {variant === 'left-bar' ? <span style={{ width: 4, height: 18, borderRadius: 999, backgroundColor: primary }} /> : null}
      <EditableText
        as="h2"
        value={title}
        onCommit={editableTitle}
        style={{
          margin: 0,
          color: darkenHex(primary, 0.68),
          fontSize: '1.14em',
          fontWeight: 800,
          lineHeight: 1.2,
        }}
      />
    </div>
  )
}

function ActionButton(props: { readonly label: string; readonly onClick: () => void; readonly primary: string }): ReactElement {
  return (
    <button
      type="button"
      onClick={(event) => { event.stopPropagation(); props.onClick() }}
      style={{ width: 20, height: 20, color: props.primary, fontSize: 15, fontWeight: 700, lineHeight: '20px' }}
      title={props.label}
    >
      {props.label}
    </button>
  )
}

function shouldPlaceInSidebar(section: Section): boolean {
  const title = section.title.toLowerCase()
  return GENERATED_TEMPLATE_STYLES.sidebarKeywords.some((keyword) => title.includes(keyword.toLowerCase()))
}
`
}

function createReadme(templateId, templateName, analysis) {
  return `# ${templateName}

Generated from \`${analysis.sourceFile}\` by \`scripts/convert-html-template.mjs\`.

## Detected

- Template id: \`${templateId}\`
- Layout: \`${analysis.layout}\`
- Header variant: \`${analysis.headerVariant}\`
- Section title variant: \`${analysis.sectionTitleVariant}\`
- Primary color: \`${analysis.primaryColor}\`
- Page: \`${analysis.pageWidthMm}mm x ${analysis.pageHeightMm}mm\`
- Default padding: \`${analysis.pagePaddingVertical}mm / ${analysis.pagePaddingHorizontal}mm\`
- Section title samples: ${analysis.sectionTitleCandidates.length > 0 ? analysis.sectionTitleCandidates.map((v) => `\`${v}\``).join(', ') : 'none'}
- AI assisted: ${analysis.aiSpec ? `yes, confidence \`${analysis.aiSpec.confidence}\`` : 'no'}
- AI notes: ${analysis.aiSpec?.notes?.length ? analysis.aiSpec.notes.map((v) => `\`${v}\``).join(', ') : 'none'}

## Manual QA before registration

- PC editor: base info, job intention, section title and block editing work.
- Drag/drop: section and block sorting work.
- Mobile preview: primary color, text color, font, line height, spacing and page padding update live.
- Export preview: visual result matches mobile preview.
- Fidelity: compare against the provided screenshot and adjust layout details if needed.

Register this template in \`src/templates/template-loader.ts\` only after QA passes.
`
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help || args.h) {
    usage()
    return
  }

  const input = args.input ? resolve(repoRoot, String(args.input)) : ''
  const templateId = normalizeTemplateId(args.id)
  const templateName = String(args.name || templateId || '').trim()
  const force = Boolean(args.force)

  if (!input) fail('Missing --input')
  if (!existsSync(input)) fail(`Input file does not exist: ${input}`)
  if (!templateId) fail('Missing --id')
  if (!/^[a-z0-9_-]+$/.test(templateId)) fail('--id only supports lowercase letters, numbers, "_" and "-"')
  if (!templateName) fail('Missing --name')

  const outputDir = join(repoRoot, 'src', 'templates', templateId)
  if (existsSync(outputDir) && !force) {
    fail(`Output directory already exists: ${outputDir}. Use --force to overwrite generated files.`)
  }

  const html = readFileSync(input, 'utf8')
  const ruleAnalysis = analyzeHtml(html, input)
  const shouldUseAi = Boolean(args.ai) && !Boolean(args['no-ai'])
  let aiSpec = null
  if (shouldUseAi) {
    try {
      console.log('[convert-html-template] AI analysis enabled')
      aiSpec = await inferWithAi(html, ruleAnalysis, args)
      console.log(`[convert-html-template] AI analysis complete, confidence=${aiSpec.confidence}`)
    } catch (error) {
      console.warn(`[convert-html-template] AI analysis failed, falling back to rule analysis: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const analysis = mergeAiSpec(ruleAnalysis, aiSpec)
  const componentName = `${toPascalCase(templateId)}Template`

  mkdirSync(outputDir, { recursive: true })
  writeFileSync(join(outputDir, 'styles.ts'), createStylesSource(templateName, analysis), 'utf8')
  writeFileSync(join(outputDir, 'index.tsx'), createTemplateSource(templateId, templateName, componentName, analysis), 'utf8')
  writeFileSync(join(outputDir, 'README.md'), createReadme(templateId, templateName, analysis), 'utf8')

  console.log(`[convert-html-template] generated ${templateId}`)
  console.log(`[convert-html-template] output: ${outputDir}`)
  console.log('[convert-html-template] next: inspect README.md, QA the template, then register it manually.')
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error))
})
