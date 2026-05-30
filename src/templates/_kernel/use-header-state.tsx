import { useState, useRef, useCallback } from 'react'
import type { ReactElement, ChangeEvent } from 'react'
import type { BaseInfo } from '@/entities/user/base-info'
import BaseInfoModal from '@/components/modals/base-info-modal'
import AvatarCropModal from '@/components/modals/avatar-crop-modal'
import { useAppStore } from '@/state/store'

export interface HeaderState {
  /** Open the base-info edit modal. */
  readonly openEditModal: () => void
  /** Trigger local file chooser for avatar upload. */
  readonly openAvatarUpload: () => void
  /** Delete a single BaseInfo field. */
  readonly deleteField: (field: string) => void
  /** File input that must be rendered somewhere in the tree (hidden). */
  readonly fileInput: ReactElement
  /** Modal(s) that must be rendered at the component root. */
  readonly modals: ReactElement | null
  /** Which field is currently hovered (for delete button). */
  readonly hoveredField: string | null
  readonly setHoveredField: (key: string | null) => void
  /** Whether the avatar is hovered (for overlay). */
  readonly avatarHovered: boolean
  readonly setAvatarHovered: (v: boolean) => void
}

/**
 * Shared lifecycle for any header variant: edit modal, avatar crop modal,
 * upload input, field delete, hover state.
 */
export function useHeaderState(baseInfo: BaseInfo | null, name: string): HeaderState {
  const [showModal, setShowModal] = useState(false)
  const [hoveredField, setHoveredField] = useState<string | null>(null)
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const updateBaseInfo = useAppStore((s) => s.updateBaseInfo)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const deleteField = useCallback((field: string): void => {
    if (!baseInfo) return
    const updated: Record<string, unknown> = { ...baseInfo }
    if (field.startsWith('custom_')) {
      const label = field.slice('custom_'.length)
      updated.customFields = baseInfo.customFields?.filter((customField) => customField.label !== label)
      if (Array.isArray(updated.customFields) && updated.customFields.length === 0) {
        delete updated.customFields
      }
    } else {
      delete updated[field]
    }
    updateBaseInfo(updated as BaseInfo, name)
  }, [baseInfo, name, updateBaseInfo])

  const openAvatarUpload = useCallback((): void => {
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

  const fileInput: ReactElement = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onClick={(e) => e.stopPropagation()}
      onChange={handleFileChange}
    />
  )

  const modals: ReactElement | null = (
    <>
      {showModal && (
        <BaseInfoModal
          baseInfo={baseInfo}
          name={name}
          onClose={() => setShowModal(false)}
          onSave={updateBaseInfo}
        />
      )}
      {cropImageSrc && (
        <AvatarCropModal
          imageSrc={cropImageSrc}
          onSave={handleCropSave}
          onClose={() => setCropImageSrc(null)}
        />
      )}
    </>
  )

  return {
    openEditModal: () => setShowModal(true),
    openAvatarUpload,
    deleteField,
    fileInput,
    modals,
    hoveredField,
    setHoveredField,
    avatarHovered,
    setAvatarHovered,
  }
}
