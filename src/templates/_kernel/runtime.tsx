import { useState, useCallback } from 'react'
import type { ReactElement, ReactNode } from 'react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { Section } from '@/entities/resume/section'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'
import DragDropProvider from '@/dnd/drag-drop-provider'
import { useAppStore } from '@/state/store'
import { JobIntentionSection } from '@/templates/components/v2'
import TwoColumnDndProvider, {
  ColumnDroppable,
  CrossColumnPlaceholder,
  COLUMN_LEFT_ID,
  COLUMN_RIGHT_ID,
  isTextOnlySection as isTextOnlyForColumn,
} from '@/templates/warm/two-column-dnd-provider'
import { KernelHeader } from './headers'
import { KernelSectionView } from './kernel-section-view'
import type { KernelTemplateConfig } from './types'

export interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  readonly sidebarSectionIds?: readonly string[]
  readonly onSidebarSectionIdsChange?: (ids: readonly string[]) => void
}

export interface RuntimeProps extends TemplateProps {
  readonly config: KernelTemplateConfig
}

/**
 * Main runtime — reads a kernel config and renders the whole resume.
 */
export function TemplateRuntime(props: RuntimeProps): ReactElement {
  const { config, resume, theme } = props
  const accent = resolveAccent(config, theme)
  const isJobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)
  const bodyPadding: string = `${config.page?.paddingOverride?.vertical ?? theme.pagePaddingVertical}mm ${
    config.page?.paddingOverride?.horizontal ?? theme.pagePaddingHorizontal
  }mm`

  // Job intention renderers based on placement ---------------------------------
  const jobIntentionAtPlacement = (placement: 'header-row' | 'body-top' | 'sidebar'): ReactElement | null => {
    if (!isJobIntentionVisible) return null
    if ((config.jobIntention?.placement ?? 'body-top') !== placement) return null
    return (
      <div style={{ marginTop: `${12 * theme.spacingScale}px` }}>
        <JobIntentionSection jobIntention={resume.jobIntention ?? null} themeColor={accent} />
      </div>
    )
  }

  // Header ---------------------------------------------------------------------
  const header: ReactElement = (
    <KernelHeader
      name={resume.name}
      baseInfo={resume.baseInfo ?? null}
      themeColor={accent}
      spec={config.header}
      afterFields={jobIntentionAtPlacement('header-row')}
    />
  )

  // Layout branching ----------------------------------------------------------
  if (config.layout === 'two-column') {
    return (
      <TwoColumnShell
        {...props}
        accent={accent}
        header={header}
        bodyPadding={bodyPadding}
        jobIntentionBodyTop={jobIntentionAtPlacement('body-top')}
        jobIntentionSidebar={jobIntentionAtPlacement('sidebar')}
      />
    )
  }

  return (
    <SingleColumnShell
      {...props}
      accent={accent}
      header={header}
      bodyPadding={bodyPadding}
      jobIntentionBodyTop={jobIntentionAtPlacement('body-top')}
    />
  )
}

// ---------------------------------------------------------------------------
// Single-column shell
// ---------------------------------------------------------------------------

interface ShellProps extends RuntimeProps {
  readonly accent: string
  readonly header: ReactElement
  readonly bodyPadding: string
  readonly jobIntentionBodyTop: ReactElement | null
}

function SingleColumnShell(props: ShellProps): ReactElement {
  const { resume, theme, config, accent, header, bodyPadding, jobIntentionBodyTop } = props
  const bleed = config.page?.bleed ?? false
  const onMoveSection = useAppStore((s) => s.moveSection)
  const onMoveWithinSection = useAppStore((s) => s.moveBlockInSection)
  const onMoveToSection = useAppStore((s) => s.moveBlockToSection)

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded shadow-sm"
      data-page-padding-vertical={theme.pagePaddingVertical}
      {...(bleed ? { 'data-bleed': 'true' } : {})}
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        padding: bleed ? 0 : bodyPadding,
        backgroundColor: config.page?.backgroundColor,
      }}
    >
      {bleed ? header : <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>{header}</div>}

      <div
        style={{
          padding: bleed ? bodyPadding : undefined,
          backgroundColor: config.page?.mainBackgroundColor,
        }}
      >
        {jobIntentionBodyTop && (
          <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>{jobIntentionBodyTop}</div>
        )}

        <DragDropProvider
          resume={resume}
          theme={theme}
          onMoveSection={onMoveSection}
          onMoveWithinSection={onMoveWithinSection}
          onMoveToSection={onMoveToSection}
          renderSectionOverlay={(sectionId: string) => (
            <SectionOverlay sectionId={sectionId} {...props} />
          )}
        >
          <main className="flex flex-col relative" style={{ gap: `${24 * theme.spacingScale}px` }}>
            {resume.sections.map((section) => (
              <SortableSectionWrapper key={section.id} sectionId={section.id}>
                {(dragProps) => (
                  <KernelSectionView
                    section={section}
                    themeColor={accent}
                    spacingScale={theme.spacingScale}
                    sectionHeaderSpec={config.sectionHeader}
                    blockSpec={config.block}
                    dragHandleAttributes={dragProps.attributes}
                    dragHandleListeners={dragProps.listeners}
                    dragHandleRef={dragProps.ref}
                  />
                )}
              </SortableSectionWrapper>
            ))}
          </main>
        </DragDropProvider>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Two-column shell (reuses TwoColumnDndProvider from warm template)
// ---------------------------------------------------------------------------

interface TwoColShellProps extends ShellProps {
  readonly jobIntentionSidebar: ReactElement | null
}

function TwoColumnShell(props: TwoColShellProps): ReactElement {
  const {
    resume, theme, config, accent, header,
    jobIntentionBodyTop, jobIntentionSidebar,
    sidebarSectionIds: externalIds, onSidebarSectionIdsChange,
  } = props
  const sidebar = config.sidebar
  if (!sidebar) {
    throw new Error(`[kernel] Template "${config.id}" has layout='two-column' but no sidebar spec.`)
  }

  const defaultIds = resume.sections
    .filter((s) => shouldDefaultToSidebar(s, sidebar.defaultSectionKeywords ?? []))
    .map((s) => s.id)
  const [localIds, setLocalIds] = useState<readonly string[]>(defaultIds)
  const sidebarIds: readonly string[] = externalIds ?? localIds

  const updateSidebar = useCallback((ids: readonly string[]) => {
    setLocalIds(ids)
    onSidebarSectionIdsChange?.(ids)
  }, [onSidebarSectionIdsChange])

  const sidebarSet = new Set(sidebarIds)
  const sideSections = resume.sections.filter((s) => sidebarSet.has(s.id))
  const mainSections = resume.sections.filter((s) => !sidebarSet.has(s.id))

  const onMoveSection = useAppStore((s) => s.moveSection)
  const onMoveWithinSection = useAppStore((s) => s.moveBlockInSection)
  const onMoveToSection = useAppStore((s) => s.moveBlockToSection)

  const handleMoveSectionToColumn = useCallback((sectionId: string, toColumn: 'left' | 'right') => {
    // When sidebar is on the right, invert semantics so "moving to sidebar" is always toColumn === 'left' in warm provider.
    const sidebarColumn: 'left' | 'right' = sidebar.side === 'left' ? 'left' : 'right'
    const toSidebar = toColumn === sidebarColumn
    if (toSidebar) {
      if (!sidebarIds.includes(sectionId)) updateSidebar([...sidebarIds, sectionId])
    } else {
      updateSidebar(sidebarIds.filter((id) => id !== sectionId))
    }
  }, [sidebarIds, updateSidebar, sidebar.side])

  // Map sidebar side → warm provider's left/right lists
  const leftSections = sidebar.side === 'left' ? sideSections : mainSections
  const rightSections = sidebar.side === 'left' ? mainSections : sideSections

  const sidebarPadding = `${sidebar.padding?.vertical ?? theme.pagePaddingVertical}mm ${
    sidebar.padding?.horizontal ?? 8
  }mm`
  const mainPadding = `${config.page?.paddingOverride?.vertical ?? theme.pagePaddingVertical}mm ${
    config.page?.paddingOverride?.horizontal ?? theme.pagePaddingHorizontal
  }mm`

  const sidebarCol: ReactElement = (
    <ColumnDroppable
      id={sidebar.side === 'left' ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID}
      className="shrink-0 transition-shadow"
    >
      <div
        className="h-full flex flex-col"
        style={{
          width: '100%',
          backgroundColor: sidebar.backgroundColor ?? '#f8f9fa',
          padding: sidebarPadding,
          gap: `${20 * theme.spacingScale}px`,
        }}
      >
        {config.header.variant === 'sidebar-avatar' && header}
        {jobIntentionSidebar}
        {sideSections.map((section) => (
          <SortableSectionWrapper key={section.id} sectionId={section.id}>
            {(dragProps) => (
              <KernelSectionView
                section={section}
                themeColor={accent}
                spacingScale={theme.spacingScale}
                sectionHeaderSpec={config.sectionHeader}
                blockSpec={config.block}
                dragHandleAttributes={dragProps.attributes}
                dragHandleListeners={dragProps.listeners}
                dragHandleRef={dragProps.ref}
              />
            )}
          </SortableSectionWrapper>
        ))}
        <CrossColumnPlaceholder columnId={sidebar.side === 'left' ? COLUMN_LEFT_ID : COLUMN_RIGHT_ID} />
      </div>
    </ColumnDroppable>
  )

  const mainCol: ReactElement = (
    <ColumnDroppable
      id={sidebar.side === 'left' ? COLUMN_RIGHT_ID : COLUMN_LEFT_ID}
      className="transition-shadow flex-1"
    >
      <div
        style={{
          minHeight: '100%',
          padding: mainPadding,
          backgroundColor: config.page?.mainBackgroundColor ?? '#ffffff',
        }}
      >
        {config.header.variant !== 'sidebar-avatar' && (
          <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>{header}</div>
        )}
        {jobIntentionBodyTop && (
          <div style={{ marginBottom: `${24 * theme.spacingScale}px` }}>{jobIntentionBodyTop}</div>
        )}
        <main className="flex flex-col relative" style={{ gap: `${24 * theme.spacingScale}px` }}>
          {mainSections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(dragProps) => (
                <KernelSectionView
                  section={section}
                  themeColor={accent}
                  spacingScale={theme.spacingScale}
                  sectionHeaderSpec={config.sectionHeader}
                  blockSpec={config.block}
                  dragHandleAttributes={dragProps.attributes}
                  dragHandleListeners={dragProps.listeners}
                  dragHandleRef={dragProps.ref}
                />
              )}
            </SortableSectionWrapper>
          ))}
          <CrossColumnPlaceholder columnId={sidebar.side === 'left' ? COLUMN_RIGHT_ID : COLUMN_LEFT_ID} />
        </main>
      </div>
    </ColumnDroppable>
  )

  const sidebarWidth = `${sidebar.widthPercent}%`

  return (
    <div
      className="resume-container bg-white text-black mx-auto rounded overflow-hidden"
      data-page-padding-vertical={theme.pagePaddingVertical}
      data-bleed="true"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        backgroundColor: config.page?.backgroundColor,
      }}
    >
      <TwoColumnDndProvider
        leftSections={leftSections}
        rightSections={rightSections}
        allSections={resume.sections}
        theme={theme}
        onMoveSection={onMoveSection}
        onMoveWithinSection={onMoveWithinSection}
        onMoveToSection={onMoveToSection}
        onMoveSectionToColumn={handleMoveSectionToColumn}
        renderSectionOverlay={(sectionId: string) => (
          <SectionOverlay sectionId={sectionId} {...props} />
        )}
      >
        <div className="flex min-h-[297mm]">
          {sidebar.side === 'left' ? (
            <>
              <div style={{ width: sidebarWidth }}>{sidebarCol}</div>
              {mainCol}
            </>
          ) : (
            <>
              {mainCol}
              <div style={{ width: sidebarWidth }}>{sidebarCol}</div>
            </>
          )}
        </div>
      </TwoColumnDndProvider>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Drag overlay (shared)
// ---------------------------------------------------------------------------

function SectionOverlay(props: { readonly sectionId: string } & RuntimeProps): ReactNode {
  const { sectionId, resume, theme, config } = props
  const section = resume.sections.find((s) => s.id === sectionId)
  if (!section) return null
  return (
    <div className="bg-white shadow-2xl rounded-lg p-4">
      <KernelSectionView
        section={section}
        themeColor={resolveAccent(config, theme)}
        spacingScale={theme.spacingScale}
        sectionHeaderSpec={config.sectionHeader}
        blockSpec={config.block}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveAccent(config: KernelTemplateConfig, theme: ThemeTokens): string {
  const isDefaultDark = theme.primaryColor === '#111827'
  if (isDefaultDark && config.accents?.primary) return config.accents.primary
  return theme.primaryColor
}

function shouldDefaultToSidebar(section: Section, keywords: readonly string[]): boolean {
  if (!keywords.length) return false
  if (!isTextOnlyForColumn(section)) return false
  const t = section.title.toLowerCase()
  return keywords.some((kw) => t.includes(kw.toLowerCase()))
}
