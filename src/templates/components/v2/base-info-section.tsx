/**
 * V2 BaseInfoSection - Style-Driven Architecture
 * 
 * Layout matches the reference design:
 * - Left: avatar with hover overlay (在线制作 / 本地上传)
 * - Right top: name (bold) + intention inline
 * - Right bottom: info fields in flowing grid, each with hover border + delete button
 * - Edit pencil at top-right on section hover
 */

import { useState, useRef, useCallback, type ReactElement, type ChangeEvent } from 'react'
import { Pencil, XCircle } from 'lucide-react'
import { IconPhone, IconMail, IconGender, IconAge, IconLocation } from '@/components/sections/baseinfo-icons'
import type { BaseInfo } from '@/entities/user/base-info'
import BaseInfoModal from '@/components/modals/base-info-modal'
import AvatarCropModal from '@/components/modals/avatar-crop-modal'
import { useAppStore } from '@/state/store'
import type {
  BaseInfoSectionStyles,
  BaseInfoRenderProps,
  BaseInfoSlots,
} from './types'

/** Field definition for rendering info rows. */
interface FieldDef {
  readonly key: string
  readonly label: string
  readonly value: string
  readonly icon: ReactElement
}

export interface BaseInfoSectionProps {
  readonly name: string
  readonly baseInfo: BaseInfo | null
  readonly themeColor: string
  readonly styles?: BaseInfoSectionStyles
  readonly renderCustom?: (props: BaseInfoRenderProps) => ReactElement
  readonly slots?: BaseInfoSlots
}

/**
 * V2 基础信息组件 - 样式配置驱动
 */
export default function BaseInfoSection(props: BaseInfoSectionProps): ReactElement {
  const { name, baseInfo, themeColor, styles = {}, renderCustom, slots } = props
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDeleteField = useCallback((field: string): void => {
    if (!baseInfo) return
    const updated: Record<string, unknown> = { ...baseInfo }
    delete updated[field]
    updateBaseInfo(updated as BaseInfo, name)
  }, [baseInfo, name, updateBaseInfo])

  const handleLocalUpload = useCallback((): void => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => {
      setCropImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }, [])

  const handleCropSave = useCallback((croppedDataUrl: string): void => {
    updateBaseInfo({ ...baseInfo, avatarUrl: croppedDataUrl } as BaseInfo, name)
    setCropImageSrc(null)
  }, [baseInfo, name, updateBaseInfo])

  const handleCropClose = useCallback((): void => {
    setCropImageSrc(null)
  }, [])

  if (renderCustom) {
    return (
      <>
        {renderCustom({ name, baseInfo, themeColor, onEdit: () => setShowModal(true) })}
        {showModal && (
          <BaseInfoModal baseInfo={baseInfo} name={name} onClose={() => setShowModal(false)} onSave={updateBaseInfo} />
        )}
      </>
    )
  }

  const fields: FieldDef[] = buildFieldDefs(baseInfo)

  return (
    <>
      <header className="mb-5 flex items-start gap-5 relative group cursor-pointer print:cursor-default">
        {/* Edit pencil - top right on hover */}
        {slots?.editButton ? (
          slots.editButton(() => setShowModal(true))
        ) : (
          <button
            type="button"
            className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity print:hidden text-gray-400 hover:text-gray-600 z-10"
            onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
          >
            <Pencil size={18} />
          </button>
        )}

        {/* Avatar with hover overlay */}
        <div
          className="relative w-20 h-24 rounded-lg overflow-hidden shrink-0 bg-gray-100 border border-gray-200"
          onMouseEnter={() => setAvatarHovered(true)}
          onMouseLeave={() => setAvatarHovered(false)}
        >
          {baseInfo?.avatarUrl ? (
            <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <AvatarPlaceholder />
          )}
          {avatarHovered && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 print:hidden">
              <button
                type="button"
                className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors"
                onClick={(e) => { e.stopPropagation(); setShowModal(true) }}
              >
                在线制作
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs font-bold text-white border border-white/80 rounded hover:bg-white/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); handleLocalUpload() }}
              >
                本地上传
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0" onClick={() => setShowModal(true)}>
          {/* Name + intention row */}
          <div className="flex items-baseline gap-4 mb-2">
            {slots?.name ? (
              slots.name(name, themeColor)
            ) : (
              <h1
                className="font-bold leading-tight"
                style={{ color: themeColor, fontSize: '1.6em' }}
              >
                {name}
              </h1>
            )}
            {baseInfo?.title && (
              <span className="text-gray-500" style={{ fontSize: '0.9em' }}>
                意向岗位: {baseInfo.title}
              </span>
            )}
          </div>

          {/* Info fields grid */}
          {slots?.fields ? (
            slots.fields(baseInfo, themeColor)
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {fields.map((f) => (
                <InfoField
                  key={f.key}
                  field={f}
                  isHovered={hoveredField === f.key}
                  onMouseEnter={() => setHoveredField(f.key)}
                  onMouseLeave={() => setHoveredField(null)}
                  onDelete={() => handleDeleteField(f.key)}
                />
              ))}
            </div>
          )}
        </div>
      </header>

      {showModal && (
        <BaseInfoModal baseInfo={baseInfo} name={name} onClose={() => setShowModal(false)} onSave={updateBaseInfo} />
      )}

      {cropImageSrc && (
        <AvatarCropModal imageSrc={cropImageSrc} onSave={handleCropSave} onClose={handleCropClose} />
      )}
    </>
  )
}

/**
 * Avatar placeholder with silhouette.
 */
function AvatarPlaceholder(): ReactElement {
  return (
    <div className="w-full h-full flex items-center justify-center text-gray-300">
      <svg viewBox="0 0 64 80" fill="currentColor" width="48" height="60">
        <circle cx="32" cy="22" r="14" />
        <path d="M8 72c0-13.255 10.745-24 24-24s24 10.745 24 24v8H8v-8z" />
      </svg>
    </div>
  )
}

/**
 * Single info field with hover border highlight and delete button.
 */
function InfoField(props: {
  readonly field: FieldDef
  readonly isHovered: boolean
  readonly onMouseEnter: () => void
  readonly onMouseLeave: () => void
  readonly onDelete: () => void
}): ReactElement {
  const { field, isHovered, onMouseEnter, onMouseLeave, onDelete } = props
  return (
    <div
      className={`flex items-center gap-1.5 text-gray-700 rounded px-1.5 py-0.5 transition-all ${
        isHovered ? 'border border-gray-300 bg-gray-50' : 'border border-transparent'
      }`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <span className="text-gray-400 shrink-0">{field.icon}</span>
      <span className="text-gray-500">{field.label}：</span>
      <span>{field.value}</span>
      {isHovered && (
        <button
          type="button"
          className="ml-1 print:hidden text-red-400 hover:text-red-600 transition-colors shrink-0"
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          <XCircle size={14} />
        </button>
      )}
    </div>
  )
}

/**
 * Build the list of displayable fields from BaseInfo.
 */
function buildFieldDefs(baseInfo: BaseInfo | null): FieldDef[] {
  if (!baseInfo) return []
  const defs: FieldDef[] = []
  if (baseInfo.phone) {
    defs.push({ key: 'phone', label: '电话', value: baseInfo.phone, icon: <IconPhone /> })
  }
  if (baseInfo.email) {
    defs.push({ key: 'email', label: '邮箱', value: baseInfo.email, icon: <IconMail /> })
  }
  if (baseInfo.gender) {
    defs.push({ key: 'gender', label: '性别', value: baseInfo.gender, icon: <IconGender /> })
  }
  if (baseInfo.age !== undefined && baseInfo.age !== null) {
    defs.push({ key: 'age', label: '年龄', value: String(baseInfo.age), icon: <IconAge /> })
  }
  if (baseInfo.currentLocation) {
    defs.push({ key: 'currentLocation', label: '现居', value: baseInfo.currentLocation, icon: <IconLocation /> })
  }
  return defs
}
