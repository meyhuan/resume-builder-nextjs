'use client'

import { useCallback, useState, type ReactElement } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { X, Check, Loader2 } from 'lucide-react'

export interface MobileAvatarCropperProps {
  readonly imageSrc: string
  readonly onSave: (croppedDataUrl: string) => void
  readonly onClose: () => void
}

/** Default aspect ratio for 证件照 (3:4 portrait). */
const AVATAR_ASPECT: number = 3 / 4

/**
 * Full-screen mobile crop sheet optimized for touch.
 *
 * Differences vs the PC `AvatarCropModal`:
 * - Fills the viewport (no Dialog chrome) so the cropper has breathing room.
 * - Bottom-anchored action bar with safe-area padding.
 * - Zoom slider — pinch/pan via react-easy-crop is also supported natively.
 */
export function MobileAvatarCropper(props: MobileAvatarCropperProps): ReactElement {
  const { imageSrc, onSave, onClose } = props
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState<number>(1)
  const [pixels, setPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState<boolean>(false)

  const handleComplete = useCallback((_: Area, p: Area): void => {
    setPixels(p)
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!pixels) return
    setSaving(true)
    try {
      const dataUrl: string = await cropImageToDataUrl(imageSrc, pixels)
      onSave(dataUrl)
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }, [pixels, imageSrc, onSave, onClose])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black animate-in fade-in duration-150">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 h-12 bg-black/60 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-white/80 active:bg-white/10"
          aria-label="取消"
        >
          <X size={20} />
        </button>
        <div className="text-sm font-medium text-white">裁剪证件照</div>
        <div className="w-9" />
      </div>

      {/* Cropper fills remaining space */}
      <div className="relative flex-1 bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={AVATAR_ASPECT}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleComplete}
          showGrid={true}
          minZoom={1}
          maxZoom={4}
          zoomSpeed={0.5}
          objectFit="contain"
        />
      </div>

      {/* Bottom action bar with zoom slider */}
      <div
        className="bg-black/85 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[11px] text-white/60 w-10 text-center">缩放</span>
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e): void => setZoom(Number(e.target.value))}
            className="flex-1 accent-violet-500"
            aria-label="缩放"
          />
          <span className="text-[11px] text-white/60 w-10 text-center">{zoom.toFixed(1)}x</span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-11 rounded-xl border border-white/20 text-white/90 text-sm font-medium active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !pixels}
            className="flex-1 h-11 rounded-xl bg-violet-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>{saving ? '处理中…' : '保存'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Crop an image using canvas and return a JPEG data URL.
 */
function cropImageToDataUrl(src: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image: HTMLImageElement = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = (): void => {
      const canvas: HTMLCanvasElement = document.createElement('canvas')
      canvas.width = pixelCrop.width
      canvas.height = pixelCrop.height
      const ctx: CanvasRenderingContext2D | null = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height,
      )
      resolve(canvas.toDataURL('image/jpeg', 0.9))
    }
    image.onerror = (): void => reject(new Error('Failed to load image'))
    image.src = src
  })
}
