/**
 * V2 JobIntentionSection - Style-Driven Architecture
 * 
 * Fully decoupled job intention component supporting:
 * 1. Style configuration driven
 * 2. Custom render functions
 * 3. Slot pattern
 * 
 * Adding new templates requires no changes to this file.
 */

import { useState, type ReactElement } from 'react'
import { Pencil, XCircle } from 'lucide-react'
import { IconTarget } from '@/components/sections/section-icons'
import type { JobIntention } from '@/entities/user/job-intention'
import JobIntentionModal from '@/components/modals/job-intention-modal'
import { useAppStore } from '@/state/store'
import type {
  JobIntentionSectionStyles,
  JobIntentionRenderProps,
  JobIntentionSlots,
} from './types'

export interface JobIntentionSectionProps {
  readonly jobIntention: JobIntention | null
  readonly themeColor: string
  
  // Option 1: Style configuration (recommended for most cases)
  readonly styles?: JobIntentionSectionStyles
  
  // Option 2: Fully custom render (for completely different layouts)
  readonly renderCustom?: (props: JobIntentionRenderProps) => ReactElement
  
  // Option 3: Slot pattern (for partial customization)
  readonly slots?: JobIntentionSlots
}

/**
 * V2 Job Intention Component - Style configuration driven.
 */
export default function JobIntentionSection(props: JobIntentionSectionProps): ReactElement | null {
  const { jobIntention, themeColor, styles = {}, renderCustom, slots } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const updateJobIntention = useAppStore((s) => s.updateJobIntention)

  if (!jobIntention) return null

  function handleDeleteField(field: string): void {
    if (!jobIntention) return
    const updated = { ...jobIntention }
    if (field === 'position') updated.position = undefined
    if (field === 'city') updated.city = undefined
    if (field === 'salary') updated.salary = undefined
    if (field === 'type') updated.type = undefined
    if (field === 'industry') updated.industry = undefined
    if (field === 'currentStatus') updated.currentStatus = undefined
    updateJobIntention(updated)
  }

  // Option 2: Fully custom render
  if (renderCustom) {
    return (
      <>
        {renderCustom({
          jobIntention,
          themeColor,
          onEdit: () => setShowModal(true),
          onDeleteField: handleDeleteField,
        })}
        {showModal && (
          <JobIntentionModal
            jobIntention={jobIntention}
            onClose={() => setShowModal(false)}
            onSave={updateJobIntention}
          />
        )}
      </>
    )
  }

  // Default render: use style config and slots
  const containerClassName = styles.container || 'mb-5 relative group cursor-pointer print:cursor-default'
  const headerClassName = styles.header || 'flex items-center gap-2 mb-3 relative py-1 rounded border border-transparent'
  
  // Render header
  const renderHeader = () => {
    // If a special layout is configured, e.g. ribbon (banner style with background)
    if (styles.layout === 'ribbon') {
      return (
        <div 
          className={`flex items-center w-full relative transition-all duration-200 ${styles.headerClassName || 'mb-4 mt-2'}`}
          style={{ fontSize: styles.title?.fontSize, fontWeight: styles.title?.fontWeight }}
        >
          <div className="flex items-center relative h-[32px] drop-shadow-sm">
            {/* Icon part */}
            <div className="h-full flex items-center justify-center w-[40px] z-20 rounded-l-sm" style={{ backgroundColor: themeColor }}>
              <span style={{ color: '#fff' }}>
                <IconTarget size={styles.icon?.size || '1.2em'} className={styles.icon?.className} />
              </span>
            </div>

            {/* Title part */}
            <div className="bg-[#f8f8f8] h-full flex items-center pl-3 pr-2 z-10 relative border-y border-[#ddd]">
              {slots?.header ? (
                slots.header('Job Preference', '#333')
              ) : (
                <h2 className={`font-bold tracking-widest ${styles.title?.className || ''}`} style={{ color: '#333' }}>
                  Job Preference
                </h2>
              )}
              
              {/* Arrow right */}
              <div className="absolute top-[-1px] -right-[16px] w-0 h-0 border-y-[16px] border-y-transparent border-l-[16px] border-l-[#f8f8f8] z-20"></div>
              <div className="absolute top-[-1px] -right-[17px] w-0 h-0 border-y-[16px] border-y-transparent border-l-[17px] border-l-[#ddd] z-10"></div>
            </div>
          </div>
          
          {/* Horizontal Line */}
          <div className="flex-1 h-[6px] bg-[#f0f0f0] ml-6 rounded-r"></div>

          {/* Edit button */}
          {slots?.editButton ? (
            slots.editButton(() => setShowModal(true))
          ) : (
            <button
              type="button"
              className={styles.editButton || 'absolute right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600'}
              onClick={(e) => {
                e.stopPropagation()
                setShowModal(true)
              }}
            >
              <Pencil size={18} />
            </button>
          )}
        </div>
      );
    }

    // Default layout
    return (
      <div 
        className={headerClassName}
        style={{
          fontSize: styles.title?.fontSize,
          fontWeight: styles.title?.fontWeight,
          ...(styles.headerBorderBottom ? { borderBottom: `2px solid ${themeColor}` } : {}),
        }}
      >
        {/* Icon */}
        <span style={{ color: styles.icon?.color || themeColor }}>
          <IconTarget 
            size={styles.icon?.size} 
            className={styles.icon?.className} 
          />
        </span>
        
        {/* Title */}
        {slots?.header ? (
          slots.header('Job Preference', themeColor)
        ) : (
          <h2 
            className={styles.title?.className || 'font-bold'}
            style={{ color: styles.title?.color || themeColor }}
          >
            Job Preference
          </h2>
        )}
        
        {/* Edit button */}
        {slots?.editButton ? (
          slots.editButton(() => setShowModal(true))
        ) : (
          <button
            type="button"
            className={styles.editButton || 'ml-auto opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600'}
            onClick={(e) => {
              e.stopPropagation()
              setShowModal(true)
            }}
          >
            <Pencil size={18} />
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <section 
        className={containerClassName}
        onClick={() => setShowModal(true)}
      >
        {renderHeader()}

        {/* Fields list */}
        <div className={getFieldsLayoutClassName(styles.fieldsLayout)}>
          {renderJobFields(
            jobIntention,
            styles,
            themeColor,
            hoveredField,
            setHoveredField,
            handleDeleteField,
            slots
          )}
        </div>
      </section>

      {showModal && (
        <JobIntentionModal
          jobIntention={jobIntention}
          onClose={() => setShowModal(false)}
          onSave={updateJobIntention}
        />
      )}
    </>
  )
}

/**
 * Get fields layout class name.
 */
function getFieldsLayoutClassName(layout?: JobIntentionSectionStyles['fieldsLayout']): string {
  if (!layout) return 'grid grid-cols-2 gap-y-2 gap-x-6 text-[0.875em]'
  
  if (layout.className) return layout.className
  
  switch (layout.type) {
    case 'horizontal':
      return `flex flex-wrap gap-${layout.gap || '4'}`
    case 'vertical':
      return `flex flex-col gap-${layout.gap || '2'}`
    case 'grid':
      return `grid grid-cols-${layout.columns || 2} gap-${layout.gap || '4'}`
    default:
      return layout.className || 'grid grid-cols-2 gap-y-2 gap-x-6 text-[0.875em]'
  }
}

/**
 * Render job intention fields.
 */
function renderJobFields(
  jobIntention: JobIntention,
  styles: JobIntentionSectionStyles,
  themeColor: string,
  hoveredField: string | null,
  setHoveredField: (field: string | null) => void,
  handleDeleteField: (field: string) => void,
  slots?: JobIntentionSlots
): ReactElement[] {
  const fields: ReactElement[] = []
  const fieldClassName = styles.fieldItem || 'flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors'
  const labelClassName = styles.fieldLabel || 'text-gray-600'
  const valueClassName = styles.fieldValue || 'text-gray-900'
  const fieldFontSize = styles.fieldsLayout?.className?.match(/text-\[([^\]]+)\]/)?.[1] || (styles.fieldsLayout?.className?.includes('text-sm') ? '0.875em' : undefined)

  const fieldDefinitions: Array<{
    key: string
    label: string
    value?: string
  }> = [
    { key: 'position', label: 'Position', value: jobIntention.position },
    { key: 'city', label: 'City', value: jobIntention.city },
    { key: 'salary', label: 'Salary', value: jobIntention.salary },
    { key: 'type', label: 'Job Type', value: jobIntention.type },
    { key: 'industry', label: 'Industry', value: jobIntention.industry },
    { key: 'currentStatus', label: 'Status', value: jobIntention.currentStatus },
  ]
  if (jobIntention.customFields) {
    for (const cf of jobIntention.customFields) {
      if (cf.label && cf.value) {
        fieldDefinitions.push({ key: `custom_${cf.label}`, label: cf.label, value: cf.value })
      }
    }
  }

  for (const field of fieldDefinitions) {
    if (!field.value) continue

    fields.push(
      <div
        key={field.key}
        className={`${fieldClassName} relative`}
        onMouseEnter={() => setHoveredField(field.key)}
        onMouseLeave={() => setHoveredField(null)}
      >
        {/* Use slot or default render */}
        {slots?.field ? (
          slots.field(field.label, field.value, themeColor)
        ) : (
          <div style={{ fontSize: fieldFontSize }}>
            <span className={labelClassName}>{field.label}: </span>
            <span 
              className={valueClassName}
            >
              {field.value}
            </span>
          </div>
        )}
        
        {/* Delete button - absolute positioned to prevent layout shift */}
        {hoveredField === field.key && (
          <button
            type="button"
            className="absolute right-1 top-1/2 -translate-y-1/2 print:hidden text-red-500 hover:text-red-700 opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField(field.key)
            }}
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
    )
  }

  return fields
}
