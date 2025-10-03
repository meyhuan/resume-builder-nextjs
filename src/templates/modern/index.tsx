import type { ReactElement, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import EditableTextBlock from '@/editor/editable-text-block'
import { useAppStore } from '@/state/store'
import DragDropProvider from '@/dnd/drag-drop-provider'
import SortableSection from '@/dnd/sortable-section'
import SortableBlock from '@/dnd/sortable-block'
import { DndIds } from '@/dnd/ids'

/**
 * ModernTemplate: A slightly different visual styling using the shared DnD layer.
 */
interface ModernTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

export default function ModernTemplate(props: ModernTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="bg-white text-gray-900 mx-auto p-8 rounded shadow-sm"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight.toString(),
      }}
    >
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: theme.primaryColor }}>
          {resume.name}
        </h1>
        {resume.contactHtml ? (
          <div className="mt-2 text-sm text-gray-600" dangerouslySetInnerHTML={{ __html: resume.contactHtml }} />
        ) : null}
      </header>

      <DragDropProvider
        resume={resume}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
      >
        <main className="relative">
          <div className="grid grid-cols-12 gap-6">
            {resume.sections.map((section) => {
              const spanClass: string = section.columns === 2 ? 'col-span-12' : 'col-span-12 md:col-span-6'
              return (
                <div key={section.id} className={spanClass}>
                  <SortableSection sectionId={section.id}>
                    <ModernSectionView
                      sectionId={section.id}
                      title={section.title}
                      columns={section.columns}
                      themeColor={theme.primaryColor}
                      blockIds={section.blocks.map((b) => b.id)}
                    >
                      {section.blocks.map((block) => (
                        <SortableBlock
                          key={block.id}
                          id={block.id}
                          onDelete={(): void => useAppStore.getState().deleteBlock(section.id, block.id)}
                          className="rounded-lg border border-gray-200 bg-white shadow-sm p-4 pt-3 hover:border-gray-300 border-t-4"
                          style={{ borderTopColor: theme.primaryColor }}
                        >
                          {block.type === 'text' ? (
                            <EditableTextBlock blockId={block.id} />
                          ) : (
                            <div className="text-gray-500 text-sm">Unsupported block type: {block.type}</div>
                          )}
                        </SortableBlock>
                      ))}
                    </ModernSectionView>
                  </SortableSection>
                </div>
              )
            })}
          </div>
        </main>
      </DragDropProvider>
    </div>
  )
}

interface ModernSectionViewProps {
  readonly sectionId: string
  readonly title: string
  readonly columns: number
  readonly themeColor: string
  readonly blockIds: string[]
  readonly children: ReactNode
}

function ModernSectionView(props: ModernSectionViewProps): ReactElement {
  const { sectionId, title, columns, themeColor, blockIds, children } = props
  const addBlock = useAppStore((s) => s.addTextBlock)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  return (
    <section className="relative pl-4 border-l-4" style={{ borderColor: themeColor }}>
      <div className="-ml-4 mb-3 px-4 py-2 flex items-center gap-2 text-white rounded" style={{ backgroundColor: themeColor }}>
        <h2 className="text-base font-semibold uppercase tracking-wide">
          {title}
        </h2>
        <button
          type="button"
          className="ml-auto text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity print:hidden"
          onClick={(): void => addBlock(sectionId)}
        >
          + Add block
        </button>
      </div>
      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        {columns === 2 ? (
          <div ref={setNodeRef} className="grid grid-cols-2 gap-4">{children}</div>
        ) : (
          <div ref={setNodeRef} className="flex flex-col gap-4">{children}</div>
        )}
      </SortableContext>
    </section>
  )
}
