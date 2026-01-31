/**
 * V2 BaseInfoSection - Style-Driven Architecture
 * 
 * 完全解耦的基础信息组件，支持：
 * 1. 样式配置驱动
 * 2. 自定义渲染函数
 * 3. 插槽模式
 * 
 * 新增模板无需修改此文件
 */

import { useState, type ReactElement } from 'react'
import { Phone, Mail, User, Calendar, Pencil, XCircle, MapPin } from 'lucide-react'
import type { BaseInfo } from '@/entities/user/base-info'
import BaseInfoModal from '@/components/modals/base-info-modal'
import { useAppStore } from '@/state/store'
import type {
  BaseInfoSectionStyles,
  BaseInfoRenderProps,
  BaseInfoSlots,
} from './types'

export interface BaseInfoSectionProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  
  // 方案1: 样式配置（推荐用于大多数场景）
  readonly styles?: BaseInfoSectionStyles
  
  // 方案2: 完全自定义渲染（用于完全不同的布局）
  readonly renderCustom?: (props: BaseInfoRenderProps) => ReactElement
  
  // 方案3: 插槽模式（用于部分自定义）
  readonly slots?: BaseInfoSlots
}

/**
 * V2 基础信息组件 - 样式配置驱动
 */
export default function BaseInfoSection(props: BaseInfoSectionProps): ReactElement {
  const { name, baseInfo, themeColor, styles = {}, renderCustom, slots } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)

  function handleDeleteField(field: string): void {
    if (!baseInfo) return
    const updated = { ...baseInfo }
    if (field === 'phone') updated.phone = undefined
    if (field === 'email') updated.email = undefined
    if (field === 'gender') updated.gender = undefined
    if (field === 'age') updated.age = undefined
    if (field === 'nation') updated.nation = undefined
    if (field === 'household') updated.household = undefined
    if (field === 'currentLocation') updated.currentLocation = undefined
    if (field === 'workStartTime') updated.workStartTime = undefined
    if (field === 'politicalStatus') updated.politicalStatus = undefined
    if (field === 'height') updated.height = undefined
    if (field === 'weight') updated.weight = undefined
    updateBaseInfo(updated, name)
  }

  // 方案2: 完全自定义渲染
  if (renderCustom) {
    return (
      <>
        {renderCustom({
          name,
          baseInfo,
          themeColor,
          onEdit: () => setShowModal(true),
        })}
        {showModal && (
          <BaseInfoModal
            baseInfo={baseInfo}
            name={name}
            onClose={() => setShowModal(false)}
            onSave={updateBaseInfo}
          />
        )}
      </>
    )
  }

  // 默认渲染：使用样式配置和插槽
  const containerClassName = styles.container || 'mb-5 flex items-start gap-4 relative group cursor-pointer print:cursor-default'
  const headerClassName = styles.header || 'flex-1 min-w-0'
  
  return (
    <>
      <header 
        className={containerClassName}
        onClick={() => setShowModal(true)}
      >
        {/* 编辑按钮 */}
        {slots?.editButton ? (
          slots.editButton(() => setShowModal(true))
        ) : (
          <button
            type="button"
            className={styles.editButton || 'absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600'}
            onClick={(e) => {
              e.stopPropagation()
              setShowModal(true)
            }}
          >
            <Pencil size={18} />
          </button>
        )}

        {/* 头像 */}
        {slots?.avatar ? (
          slots.avatar(baseInfo, themeColor)
        ) : (
          <div className={styles.avatar?.containerClassName || 'w-12 h-16 rounded bg-cyan-500 overflow-hidden shrink-0'}>
            {baseInfo?.avatarUrl && (
              <img 
                src={baseInfo.avatarUrl} 
                alt="avatar" 
                className={styles.avatar?.imageClassName || 'w-full h-full object-cover'} 
              />
            )}
            {!baseInfo?.avatarUrl && styles.avatar?.showFallbackText && (
              <div className={styles.avatar?.fallbackClassName || 'w-full h-full flex items-center justify-center text-white text-2xl font-bold'}>
                {name[0]}
              </div>
            )}
          </div>
        )}

        <div className={headerClassName}>
          {/* 姓名 */}
          {slots?.name ? (
            slots.name(name, themeColor)
          ) : (
            <h1 
              className={styles.name?.className || 'font-bold mb-0.5'}
              style={{ 
                color: themeColor,
                fontSize: styles.name?.fontSize || '1.5em',
                fontWeight: styles.name?.fontWeight
              }}
            >
              {name}
            </h1>
          )}

          {/* 职位 */}
          {baseInfo?.title && (
            slots?.title ? (
              slots.title(baseInfo.title)
            ) : (
              <div 
                className={styles.title?.className || 'text-gray-600 mb-2'}
                style={{ fontSize: styles.title?.fontSize || '0.85em' }}
              >
                {baseInfo.title}
              </div>
            )
          )}

          {/* 信息字段 */}
          {slots?.fields ? (
            slots.fields(baseInfo, themeColor)
          ) : (
            <div className={getInfoLayoutClassName(styles.infoLayout)}>
              {renderInfoFields(baseInfo, styles, hoveredField, setHoveredField, handleDeleteField)}
            </div>
          )}
        </div>
      </header>

      {showModal && (
        <BaseInfoModal
          baseInfo={baseInfo}
          name={name}
          onClose={() => setShowModal(false)}
          onSave={updateBaseInfo}
        />
      )}
    </>
  )
}

/**
 * 获取布局类名
 */
function getInfoLayoutClassName(layout?: BaseInfoSectionStyles['infoLayout']): string {
  if (!layout) return 'grid grid-cols-2 gap-y-1 gap-x-6'
  
  if (layout.className) return layout.className
  
  switch (layout.type) {
    case 'horizontal':
      return `flex flex-wrap gap-${layout.gap || '4'}`
    case 'vertical':
      return `flex flex-col gap-${layout.gap || '2'}`
    case 'grid':
      return `grid grid-cols-${layout.columns || 2} gap-${layout.gap || '4'}`
    default:
      return layout.className || 'grid grid-cols-2 gap-y-1 gap-x-6'
  }
}

/**
 * 渲染信息字段
 */
function renderInfoFields(
  baseInfo: BaseInfo | null,
  styles: BaseInfoSectionStyles,
  hoveredField: string | null,
  setHoveredField: (field: string | null) => void,
  handleDeleteField: (field: string) => void
): ReactElement[] {
  const fields: ReactElement[] = []
  const fieldClassName = styles.fieldItem || 'flex items-center gap-1.5 text-gray-700 relative group/field hover:bg-gray-50 rounded px-1 py-0.5 transition-colors'
  const iconSize = styles.fieldIcon?.size || 16

  if (baseInfo?.phone) {
    fields.push(
      <div 
        key="phone"
        className={fieldClassName}
        onMouseEnter={() => setHoveredField('phone')}
        onMouseLeave={() => setHoveredField(null)}
      >
        <Phone size={iconSize} strokeWidth={1.8} />
        <span className="text-gray-500">电话：</span>
        <span>{baseInfo.phone}</span>
        {hoveredField === 'phone' && (
          <button
            type="button"
            className="ml-auto print:hidden text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField('phone')
            }}
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
    )
  }

  if (baseInfo?.email) {
    fields.push(
      <div 
        key="email"
        className={fieldClassName}
        onMouseEnter={() => setHoveredField('email')}
        onMouseLeave={() => setHoveredField(null)}
      >
        <Mail size={iconSize} strokeWidth={1.8} />
        <span className="text-gray-500">邮箱：</span>
        <span>{baseInfo.email}</span>
        {hoveredField === 'email' && (
          <button
            type="button"
            className="ml-auto print:hidden text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField('email')
            }}
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
    )
  }

  if (baseInfo?.gender) {
    fields.push(
      <div 
        key="gender"
        className={fieldClassName}
        onMouseEnter={() => setHoveredField('gender')}
        onMouseLeave={() => setHoveredField(null)}
      >
        <User size={iconSize} strokeWidth={1.8} />
        <span className="text-gray-500">性别：</span>
        <span>{baseInfo.gender}</span>
        {hoveredField === 'gender' && (
          <button
            type="button"
            className="ml-auto print:hidden text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField('gender')
            }}
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
    )
  }

  if (baseInfo?.age !== undefined && baseInfo?.age !== null) {
    fields.push(
      <div 
        key="age"
        className={fieldClassName}
        onMouseEnter={() => setHoveredField('age')}
        onMouseLeave={() => setHoveredField(null)}
      >
        <Calendar size={iconSize} strokeWidth={1.8} />
        <span className="text-gray-500">年龄：</span>
        <span>{String(baseInfo.age)}</span>
        {hoveredField === 'age' && (
          <button
            type="button"
            className="ml-auto print:hidden text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField('age')
            }}
          >
            <XCircle size={14} />
          </button>
        )}
      </div>
    )
  }

  if (baseInfo?.currentLocation) {
    fields.push(
      <div 
        key="location"
        className={fieldClassName}
        onMouseEnter={() => setHoveredField('currentLocation')}
        onMouseLeave={() => setHoveredField(null)}
      >
        <MapPin size={iconSize} strokeWidth={1.8} />
        <span className="text-gray-500">现居：</span>
        <span>{baseInfo.currentLocation}</span>
        {hoveredField === 'currentLocation' && (
          <button
            type="button"
            className="ml-auto print:hidden text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation()
              handleDeleteField('currentLocation')
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
