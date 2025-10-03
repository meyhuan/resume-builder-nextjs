import { useState } from 'react'
import type { ReactElement } from 'react'
import InlineEditor from '@/editor/inline-editor'
import { useAppStore } from '@/state/store'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { CONTENT_DISPLAY_STYLES_SM, CONTENT_EDITING_STYLES_SM } from '@/editor/editor-styles'

interface EditableTextBlockProps {
  readonly blockId: string
  readonly className?: string
}

function findTextHtml(resume: ResumeData, blockId: string): string {
  for (const section of resume.sections) {
    for (const block of section.blocks) {
      if (block.id === blockId && block.type === 'text') {
        return block.html
      }
    }
  }
  return ''
}

export default function EditableTextBlock(props: EditableTextBlockProps): ReactElement {
  const resume = useAppStore((s) => s.resume)
  const setResume = useAppStore((s) => s.setResume)
  const [isEditing, setIsEditing] = useState(false)

  const html: string = findTextHtml(resume, props.blockId)

  function handleChange(nextHtml: string): void {
    setResume((draft) => {
      for (const section of draft.sections) {
        for (let i = 0; i < section.blocks.length; i++) {
          const blk: ResumeBlock = section.blocks[i]
          if (blk.id === props.blockId && blk.type === 'text') {
            section.blocks = section.blocks.map((b) =>
              b.id === props.blockId && b.type === 'text' ? { ...b, html: nextHtml } : b
            )
            return
          }
        }
      }
    })
  }

  if (isEditing) {
    return (
      <div className={CONTENT_EDITING_STYLES_SM}>
        <InlineEditor
          initialHtml={html}
          onChange={handleChange}
          onClickOutside={(): void => setIsEditing(false)}
          floatingToolbar={true}
          className="leading-relaxed outline-none"
        />
      </div>
    )
  }

  return (
    <div
      className={CONTENT_DISPLAY_STYLES_SM}
      onClick={(): void => setIsEditing(true)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
