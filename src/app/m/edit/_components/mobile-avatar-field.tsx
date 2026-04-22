'use client'

import { useRef, useState, type ChangeEvent, type ReactElement } from 'react'
import { Camera, Trash2, User2 } from 'lucide-react'
import { toast } from 'sonner'
import { MobileAvatarCropper } from './mobile-avatar-cropper'

export interface MobileAvatarFieldProps {
  readonly value: string | undefined
  readonly onChange: (next: string | undefined) => void
}

/** Max file size (5MB) before rejection. */
const MAX_BYTES: number = 5 * 1024 * 1024

/**
 * Mobile 证件照 avatar picker with preview + crop.
 *
 * Flow: tap card → native file picker (supports camera) → crop sheet → save.
 * Stores the cropped image as a JPEG data URL in `baseInfo.avatarUrl`.
 */
export function MobileAvatarField(props: MobileAvatarFieldProps): ReactElement {
  const { value, onChange } = props
  const fileRef = useRef<HTMLInputElement>(null)
  const [rawImage, setRawImage] = useState<string | null>(null)

  const openPicker = (): void => {
    fileRef.current?.click()
  }

  const handleFile = (e: ChangeEvent<HTMLInputElement>): void => {
    const file: File | undefined = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件')
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error('图片不能超过 5MB')
      return
    }
    const reader: FileReader = new FileReader()
    reader.onload = () => {
      const result: string = typeof reader.result === 'string' ? reader.result : ''
      if (result) setRawImage(result)
    }
    reader.onerror = () => {
      toast.error('图片读取失败')
    }
    reader.readAsDataURL(file)
  }

  const handleSaveCrop = (dataUrl: string): void => {
    onChange(dataUrl)
    setRawImage(null)
    toast.success('证件照已更新')
  }

  const handleRemove = (): void => {
    onChange(undefined)
  }

  return (
    <div>
      <div className="flex items-center gap-1 mb-1.5 px-1">
        <span className="text-sm font-medium text-slate-700">证件照</span>
        <span className="text-[11px] text-slate-400 ml-1">（3:4 比例）</span>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={openPicker}
          className="relative h-28 w-21 shrink-0 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center active:scale-[0.98] transition-transform"
          style={{ width: 84, height: 112 }}
          aria-label="上传证件照"
        >
          {value ? (
            <img src={value} alt="证件照" className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-slate-400">
              <User2 size={22} />
              <span className="text-[10px]">点击上传</span>
            </div>
          )}
        </button>
        <div className="flex-1 flex flex-col gap-2">
          <button
            type="button"
            onClick={openPicker}
            className="h-10 px-3 rounded-lg bg-violet-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
          >
            <Camera size={15} />
            <span>{value ? '更换照片' : '上传照片'}</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={handleRemove}
              className="h-10 px-3 rounded-lg border border-slate-200 text-slate-500 text-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
            >
              <Trash2 size={14} />
              <span>移除</span>
            </button>
          )}
          <div className="text-[11px] text-slate-400 leading-relaxed">
            建议白底、五官清晰，单张小于 5MB
          </div>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
      {rawImage && (
        <MobileAvatarCropper
          imageSrc={rawImage}
          onSave={handleSaveCrop}
          onClose={(): void => setRawImage(null)}
        />
      )}
    </div>
  )
}
