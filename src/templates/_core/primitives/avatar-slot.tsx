import type { ReactElement, ReactNode, CSSProperties } from 'react'
import { User } from 'lucide-react'
import type { BaseInfo } from '@/entities/user/base-info'
import type { EditableHeader } from '../hooks/use-editable-header'

/**
 * Unstyled avatar slot.
 *
 * Templates either:
 *  - pass `render={({ image }) => ...}` to take full visual control, or
 *  - pass `className` / `style` / `placeholderSize` for the default styling.
 *
 * Hover shows a "本地上传" overlay that calls the header's `openAvatarUpload`.
 * Respects `baseInfo.showAvatar === false` by rendering nothing.
 */
export interface AvatarRenderArgs {
  readonly image: ReactElement
  readonly hovered: boolean
  readonly uploadOverlay: ReactElement | null
}

export interface AvatarSlotProps {
  readonly header: EditableHeader
  readonly className?: string
  readonly style?: CSSProperties
  /** Placeholder icon size if no custom render. */
  readonly placeholderSize?: number
  readonly placeholderColor?: string
  readonly placeholderBg?: string
  /** Advanced: take full control of layout. */
  readonly render?: (args: AvatarRenderArgs) => ReactNode
}

export function AvatarSlot(props: AvatarSlotProps): ReactElement | null {
  const {
    header, className, style,
    placeholderSize = 64, placeholderColor, placeholderBg = '#f1f5f9',
    render,
  } = props
  const { baseInfo, avatarHovered, setAvatarHovered, openAvatarUpload, fileInput } = header
  const hidden: boolean = (baseInfo as BaseInfo | null)?.showAvatar === false
  if (hidden) return null

  const hasImage: boolean = Boolean(baseInfo?.avatarUrl)
  const image: ReactElement = hasImage
    ? <img src={baseInfo?.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
    : (
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ backgroundColor: placeholderBg }}
      >
        <User
          size={placeholderSize}
          strokeWidth={0}
          className={placeholderColor ? '' : 'fill-slate-300'}
          color={placeholderColor}
          style={{ transform: 'translateY(4%)' }}
        />
      </div>
    )

  const uploadOverlay: ReactElement | null = avatarHovered ? (
    <div className="absolute inset-0 bg-black/55 flex items-center justify-center print:hidden z-10">
      <button
        type="button"
        className="px-3 py-1 text-xs font-semibold text-white border border-white/80 rounded hover:bg-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); openAvatarUpload() }}
      >
        本地上传
      </button>
    </div>
  ) : null

  const hoverHandlers = {
    onMouseEnter: () => setAvatarHovered(true),
    onMouseLeave: () => setAvatarHovered(false),
    onClick: (e: React.MouseEvent): void => e.stopPropagation(),
  }

  if (render) {
    return (
      <div {...hoverHandlers} className="relative">
        {render({ image, hovered: avatarHovered, uploadOverlay })}
        {fileInput}
      </div>
    )
  }

  return (
    <div
      className={`relative overflow-hidden ${className ?? ''}`}
      style={style}
      {...hoverHandlers}
    >
      {image}
      {uploadOverlay}
      {fileInput}
    </div>
  )
}
