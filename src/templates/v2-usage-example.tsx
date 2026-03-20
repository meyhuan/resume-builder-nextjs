/**
 * V2 Component Usage Examples
 * 
 * Demonstrates how to create templates using the V2 style-config-driven architecture
 */

import type { ReactElement } from 'react'
import type { ResumeData, ThemeTokens } from '@/entities'
import {
  BaseInfoSection,
  JobIntentionSection,
  BlockRenderer,
} from '@/templates/components/v2'
import { SIMPLE_TEMPLATE_STYLES } from '@/templates/simple/styles'

interface TemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

// ============================================
// Example 1: Using style config (most common)
// ============================================
export function ExampleWithStyles(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const isJobIntentionVisible: boolean = resume.jobIntentionVisible ?? Boolean(resume.jobIntention)

  return (
    <div className="resume-container">
      {/* Base info - using config */}
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={SIMPLE_TEMPLATE_STYLES.baseInfo}
      />

      {/* Job intention - using config */}
      {isJobIntentionVisible ? (
        <JobIntentionSection
          jobIntention={resume.jobIntention ?? null}
          themeColor={theme.primaryColor}
          styles={SIMPLE_TEMPLATE_STYLES.jobIntention}
        />
      ) : null}

      {/* Block rendering - using config */}
      {resume.sections.map((section) =>
        section.blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            themeColor={theme.primaryColor}
            styles={SIMPLE_TEMPLATE_STYLES.blockRenderer}
          />
        ))
      )}
    </div>
  )
}

// ============================================
// Example 2: Custom style config
// ============================================
export function ExampleWithCustomStyles(props: TemplateProps): ReactElement {
  const { resume, theme } = props

  // Custom style config
  const customStyles = {
    baseInfo: {
      container: 'bg-gradient-to-r from-purple-500 to-pink-500 p-10 rounded-3xl',
      avatar: {
        containerClassName: 'w-32 h-32 rounded-full border-4 border-white shadow-2xl',
        showFallbackText: true,
      },
      name: {
        className: 'text-5xl font-black text-white drop-shadow-lg',
      },
      infoLayout: {
        type: 'horizontal' as const,
        gap: '8',
      },
      fieldItem: 'bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white',
    },
  }

  return (
    <div className="resume-container">
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={customStyles.baseInfo}
      />
    </div>
  )
}

// ============================================
// Example 3: Fully custom rendering
// ============================================
export function ExampleWithCustomRender(props: TemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div className="resume-container">
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        renderCustom={(renderProps) => (
          <header className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
            <div className="text-center">
              {/* 3D Avatar */}
              <div className="w-48 h-48 mx-auto rounded-full border-8 border-white/30 shadow-2xl transform hover:scale-110 transition-transform mb-8">
                {renderProps.baseInfo?.avatarUrl && (
                  <img
                    src={renderProps.baseInfo.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                )}
              </div>

              {/* Animated text */}
              <h1 className="text-7xl font-black text-white tracking-wider mb-4">
                {renderProps.name}
              </h1>

              {renderProps.baseInfo?.title && (
                <div className="text-2xl text-white/80 animate-pulse">
                  {renderProps.baseInfo.title}
                </div>
              )}

              {/* Edit button */}
              <button
                onClick={renderProps.onEdit}
                className="mt-8 px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors"
              >
                Edit Info
              </button>
            </div>
          </header>
        )}
      />
    </div>
  )
}

// ============================================
// Example 4: Slot pattern (partial customization)
// ============================================
export function ExampleWithSlots(props: TemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div className="resume-container">
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={SIMPLE_TEMPLATE_STYLES.baseInfo}
        slots={{
          // Custom avatar only
          avatar: (baseInfo, themeColor) => (
            <div className="relative">
              <div
                className="w-32 h-32 rounded-full border-4 animate-spin-slow"
                style={{ borderColor: themeColor }}
              >
                {baseInfo?.avatarUrl && (
                  <img
                    src={baseInfo.avatarUrl}
                    alt="avatar"
                    className="rounded-full w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 bg-green-500 w-8 h-8 rounded-full border-4 border-white" />
            </div>
          ),

          // Custom name only
          name: (name, themeColor) => (
            <h1
              className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-r"
              style={{
                backgroundImage: `linear-gradient(to right, ${themeColor}, #ff00ff)`,
              }}
            >
              {name}
            </h1>
          ),
        }}
      />
    </div>
  )
}

// ============================================
// Example 5: Runtime dynamic styles
// ============================================
export function ExampleWithDynamicStyles(props: TemplateProps): ReactElement {
  const { resume, theme } = props
  const isDarkMode = theme.textColor === '#ffffff'

  const dynamicStyles = {
    baseInfo: {
      ...SIMPLE_TEMPLATE_STYLES.baseInfo,
      container: isDarkMode
        ? 'bg-gray-900 text-white p-8 rounded-lg'
        : 'bg-white text-black p-8 rounded-lg',
      fieldItem: isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'hover:bg-gray-50',
    },
  }

  return (
    <div className="resume-container">
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={dynamicStyles.baseInfo}
      />
    </div>
  )
}
