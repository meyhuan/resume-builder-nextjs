import { useState, useCallback, type ReactElement } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

/**
 * Props for the avatar crop modal.
 */
export interface AvatarCropModalProps {
  /** Data URL of the image to crop. */
  readonly imageSrc: string
  /** Called with the cropped image data URL on save. */
  readonly onSave: (croppedDataUrl: string) => void
  /** Called when the modal is closed without saving. */
  readonly onClose: () => void
}

/** Default aspect ratio for avatar (3:4 portrait). */
const AVATAR_ASPECT = 3 / 4

/**
 * Modal dialog that displays an image cropper for avatar selection.
 * Matches the reference design: title "上传头像", crop area, 取消/保存 buttons.
 */
export default function AvatarCropModal(props: AvatarCropModalProps): ReactElement {
  const { imageSrc, onSave, onClose } = props
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  const handleCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area): void => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  const handleSave = useCallback(async (): Promise<void> => {
    if (!croppedAreaPixels) return
    setSaving(true)
    try {
      const croppedUrl: string = await getCroppedImage(imageSrc, croppedAreaPixels)
      onSave(croppedUrl)
    } catch {
      onClose()
    } finally {
      setSaving(false)
    }
  }, [croppedAreaPixels, imageSrc, onSave, onClose])

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-base font-semibold">上传头像</DialogTitle>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </DialogHeader>

        {/* Crop area */}
        <div className="relative w-full bg-black" style={{ height: 400 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={AVATAR_ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            showGrid={true}
          />
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '处理中...' : '保存'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Crop an image using canvas and return a data URL.
 */
function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
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
      resolve(canvas.toDataURL('image/jpeg', 0.92))
    }
    image.onerror = (): void => reject(new Error('Failed to load image'))
    image.src = imageSrc
  })
}
