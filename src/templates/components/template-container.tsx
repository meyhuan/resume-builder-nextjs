import type { ReactElement, ReactNode, CSSProperties } from 'react'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'

/**
 * 统一的模板容器组件
 * 自动处理字号、行间距、间距等主题设置
 */
export interface TemplateContainerProps {
  readonly theme: ThemeTokens
  readonly children: ReactNode
  readonly className?: string
  readonly style?: CSSProperties
}

export default function TemplateContainer(props: TemplateContainerProps): ReactElement {
  const { theme, children, className = '', style = {} } = props

  return (
    <div
      className={`resume-container bg-white text-black mx-auto p-8 rounded shadow-sm ${className}`}
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
