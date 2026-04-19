import type { ReactElement } from 'react'
import type { BaseInfo } from '@/entities/user/base-info'
import { resolveAvatarRadius } from './shared'
import type { AvatarShape } from './types'
import type { HeaderState } from './use-header-state'

interface KernelAvatarProps {
  readonly baseInfo: BaseInfo | null
  readonly shape?: AvatarShape
  readonly width: number
  readonly height: number
  readonly border?: string
  readonly backgroundColor?: string
  readonly headerState: HeaderState
  readonly className?: string
  readonly style?: React.CSSProperties
}

/**
 * Avatar with hover-to-upload overlay. Handles placeholder silhouette.
 */
export function KernelAvatar(props: KernelAvatarProps): ReactElement | null {
  const { baseInfo, shape, width, height, border, backgroundColor, headerState, className, style } = props
  if (baseInfo?.showAvatar === false) return null
  const radius = resolveAvatarRadius(shape)
  return (
    <div
      className={`relative overflow-hidden shrink-0 flex items-center justify-center ${className || ''}`}
      style={{
        width,
        height,
        borderRadius: radius,
        border,
        backgroundColor: backgroundColor || '#f3f4f6',
        ...style,
      }}
      onMouseEnter={() => headerState.setAvatarHovered(true)}
      onMouseLeave={() => headerState.setAvatarHovered(false)}
      onClick={(e) => e.stopPropagation()}
    >
      {baseInfo?.avatarUrl ? (
        <img src={baseInfo.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="flex items-center justify-center text-gray-300">
          <svg viewBox="0 0 64 80" fill="currentColor" width={Math.min(width * 0.7, 90)} height={Math.min(height * 0.7, 90)}>
            <circle cx="32" cy="22" r="14" />
            <path d="M8 72c0-13.255 10.745-24 24-24s24 10.745 24 24v8H8v-8z" />
          </svg>
        </div>
      )}
      {headerState.avatarHovered && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5 print:hidden">
          <button
            type="button"
            className="px-3 py-1 text-xs font-bold text-white border border-white/80 rounded hover:bg-white/20 transition-colors"
            onClick={(e) => { e.stopPropagation(); headerState.openAvatarUpload() }}
          >
            本地上传
          </button>
        </div>
      )}
      {headerState.fileInput}
    </div>
  )
}
