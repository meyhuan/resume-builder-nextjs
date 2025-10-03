import type { ReactElement, ReactNode } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import type { UUID } from '@/entities/common/uuid'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import SectionHeader from '@/components/sections/section-header'
import { getSectionIcon } from '@/utils/get-section-icon'
import { DndIds } from '@/dnd/ids'
import { useAppStore } from '@/state/store'

/**
 * 统一的模板 Section 组件
 * 处理 Section 标题、拖拽、装饰线等
 */
export interface TemplateSectionProps {
  readonly sectionId: UUID
  readonly title: string
  readonly theme: ThemeTokens
  readonly blockIds: readonly string[]
  readonly children: ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
  readonly decorator?: 'line' | 'gradient-bar' | 'none'
  readonly decoratorPosition?: 'top' | 'bottom'
}

export default function TemplateSection(props: TemplateSectionProps): ReactElement {
  const {
    sectionId,
    title,
    theme,
    blockIds,
    children,
    dragHandleAttributes,
    dragHandleListeners,
    dragHandleRef,
    decorator = 'none',
    decoratorPosition = 'bottom',
  } = props

  const addBlock = useAppStore((s) => s.addBlockByType)
  const { setNodeRef } = useDroppable({ id: `${DndIds.SECTION_DROP_ID_PREFIX}${sectionId}` })
  const icon = getSectionIcon(title)

  const decoratorElement = ((): ReactElement | null => {
    if (decorator === 'line') {
      return <div className="h-0.5 mt-2" style={{ backgroundColor: theme.primaryColor }} />
    }
    if (decorator === 'gradient-bar') {
      return (
        <div
          className="w-2 h-8 rounded-full shrink-0"
          style={{ background: `linear-gradient(to bottom, ${theme.primaryColor}, ${theme.primaryColor}99)` }}
        />
      )
    }
    return null
  })()

  return (
    <section className="resume-section">
      <div className="mb-4">
        {decorator === 'gradient-bar' && decoratorPosition === 'top' ? (
          <div className="flex items-center gap-3">
            {decoratorElement}
            <div className="flex-1">
              <SectionHeader
                sectionId={sectionId}
                title={title}
                icon={icon ? <span style={{ color: theme.primaryColor }}>{icon}</span> : undefined}
                themeColor={theme.primaryColor}
                onAdd={() => addBlock(sectionId)}
                dragHandleAttributes={dragHandleAttributes}
                dragHandleListeners={dragHandleListeners}
                dragHandleRef={dragHandleRef}
              />
            </div>
          </div>
        ) : (
          <>
            <SectionHeader
              sectionId={sectionId}
              title={title}
              icon={icon ? <span style={{ color: theme.primaryColor }}>{icon}</span> : undefined}
              themeColor={theme.primaryColor}
              onAdd={() => addBlock(sectionId)}
              dragHandleAttributes={dragHandleAttributes}
              dragHandleListeners={dragHandleListeners}
              dragHandleRef={dragHandleRef}
            />
            {decorator === 'line' && decoratorPosition === 'bottom' ? decoratorElement : null}
          </>
        )}
      </div>

      <SortableContext items={blockIds} strategy={rectSortingStrategy}>
        <div ref={setNodeRef} style={{ display: 'flex', flexDirection: 'column', gap: `${16 * theme.spacingScale}px` }}>
          {children}
        </div>
      </SortableContext>
    </section>
  )
}
