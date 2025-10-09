/**
 * Clean Professional Template - 清爽专业简历模板
 * 
 * 特点：
 * - 左侧大头像 + 右侧信息横向密集布局
 * - 圆形蓝色图标标识各区块
 * - 卡片式内容，浅灰背景
 * - 信息密集，适合内容较多的简历
 */

import { useState, type ReactElement } from 'react'
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  FolderKanban, 
  FlaskConical,
  Users,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react'
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { ResumeBlock } from '@/entities/blocks/resume-block'
import { BaseInfoSection, BlockRenderer, SectionContainer } from '@/templates/components/v2'
import { CLEAN_PROFESSIONAL_STYLES } from '@/templates/styles/clean-professional-styles'
import BlockWrapper from '@/components/blocks/block-wrapper'
import SectionHeader from '@/components/sections/section-header'
import DeleteSectionDialog from '@/components/sections/delete-section-dialog'
import { useAppStore } from '@/state/store'
import DragDropProvider from '@/dnd/drag-drop-provider'
import SortableSectionWrapper from '@/components/sections/sortable-section-wrapper'

interface CleanProfessionalTemplateProps {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
}

/**
 * 清爽专业模板主组件
 */
export default function CleanProfessionalTemplate(props: CleanProfessionalTemplateProps): ReactElement {
  const { resume, theme } = props

  return (
    <div
      className="resume-container bg-white mx-auto p-8"
      style={{
        color: theme.textColor,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontSize}px`,
        lineHeight: theme.lineHeight,
        maxWidth: '210mm',
      }}
    >
      {/* 头部信息 - 使用自定义渲染 */}
      <BaseInfoSection
        name={resume.name}
        baseInfo={resume.baseInfo ?? null}
        themeColor={theme.primaryColor}
        styles={CLEAN_PROFESSIONAL_STYLES.baseInfo}
        slots={{
          // 自定义字段渲染，显示更多信息
          fields: (baseInfo) => (
            <div className="grid grid-cols-3 gap-x-6 gap-y-2.5 text-sm">
              {/* 第一行：联系方式 */}
              {baseInfo?.phone && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Phone size={14} className="text-blue-600 shrink-0" />
                  <span>{baseInfo.phone}</span>
                </div>
              )}
              {baseInfo?.email && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <Mail size={14} className="text-blue-600 shrink-0" />
                  <span className="truncate">{baseInfo.email}</span>
                </div>
              )}
              {baseInfo?.currentLocation && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <MapPin size={14} className="text-blue-600 shrink-0" />
                  <span>{baseInfo.currentLocation}</span>
                </div>
              )}

              {/* 第二行：更多信息 */}
              {baseInfo?.workStartTime && (
                <div className="flex items-center gap-1.5 text-gray-700">
                  <span className="text-gray-500 text-xs">工作年限:</span>
                  <span>{baseInfo.workStartTime}</span>
                </div>
              )}

              {/* 第三行：基本信息标签 */}
              <div className="col-span-3 flex flex-wrap gap-2 mt-2">
                {typeof baseInfo?.age === 'number' && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.age}岁
                  </span>
                )}
                {baseInfo?.gender && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.gender}
                  </span>
                )}
                {baseInfo?.height && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.height}
                  </span>
                )}
                {baseInfo?.weight && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.weight}
                  </span>
                )}
                {baseInfo?.nation && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.nation}
                  </span>
                )}
                {baseInfo?.household && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.household}
                  </span>
                )}
                {baseInfo?.politicalStatus && (
                  <span className="px-2.5 py-0.5 bg-gray-200 rounded text-xs text-gray-700">
                    {baseInfo.politicalStatus}
                  </span>
                )}
              </div>
            </div>
          ),
        }}
      />

      {/* 拖拽容器 */}
      <DragDropProvider
        resume={resume}
        theme={theme}
        onMoveSection={useAppStore((s) => s.moveSection)}
        onMoveWithinSection={useAppStore((s) => s.moveBlockInSection)}
        onMoveToSection={useAppStore((s) => s.moveBlockToSection)}
      >
        <main className="mt-6 space-y-5">
          {resume.sections.map((section) => (
            <SortableSectionWrapper key={section.id} sectionId={section.id}>
              {(sectionDragProps) => (
                <CleanProfessionalSection
                  sectionId={section.id}
                  title={section.title}
                  themeColor={theme.primaryColor}
                  blockIds={section.blocks.map((b) => b.id)}
                  dragHandleAttributes={sectionDragProps.attributes}
                  dragHandleListeners={sectionDragProps.listeners}
                  dragHandleRef={sectionDragProps.ref}
                >
                  {section.blocks.map((block, index) => (
                    <BlockRendererWrapper
                      key={block.id}
                      block={block}
                      sectionId={section.id}
                      blockIndex={index}
                      totalBlocks={section.blocks.length}
                      themeColor={theme.primaryColor}
                    />
                  ))}
                </CleanProfessionalSection>
              )}
            </SortableSectionWrapper>
          ))}
        </main>
      </DragDropProvider>
    </div>
  )
}

/**
 * Block 渲染包装器 - 添加操作按钮
 */
function BlockRendererWrapper(props: {
  readonly block: ResumeBlock
  readonly sectionId: string
  readonly blockIndex: number
  readonly totalBlocks: number
  readonly themeColor: string
}): ReactElement {
  const { block, sectionId, blockIndex, totalBlocks, themeColor } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteBlock = useAppStore((s) => s.deleteBlock)
  const moveBlockUp = useAppStore((s) => s.moveBlockUp)
  const moveBlockDown = useAppStore((s) => s.moveBlockDown)
  const [isEditing, setIsEditing] = useState(false)

  let blockTypeLabel = '内容'
  if (block.type === 'experience') blockTypeLabel = '工作经历'
  if (block.type === 'project') blockTypeLabel = '项目经历'
  if (block.type === 'education') blockTypeLabel = '教育经历'
  if (block.type === 'campus') blockTypeLabel = '校园经历'

  return (
    <BlockWrapper
      blockType={blockTypeLabel}
      onAdd={() => addBlock(sectionId)}
      onPolish={() => {}}
      onDelete={() => deleteBlock(sectionId, block.id)}
      onMoveUp={blockIndex > 0 ? () => moveBlockUp(sectionId, block.id) : undefined}
      onMoveDown={blockIndex < totalBlocks - 1 ? () => moveBlockDown(sectionId, block.id) : undefined}
      showDragHandle={false}
      disableHover={isEditing}
    >
      <BlockRenderer
        block={block}
        themeColor={themeColor}
        styles={CLEAN_PROFESSIONAL_STYLES.blockRenderer}
        onEditingChange={setIsEditing}
      />
    </BlockWrapper>
  )
}

/**
 * 带圆形图标的区块组件 - 使用 SectionHeader 复用逻辑
 */
function CleanProfessionalSection(props: {
  readonly sectionId: string
  readonly title: string
  readonly themeColor: string
  readonly blockIds: string[]
  readonly children: React.ReactNode
  readonly dragHandleAttributes?: unknown
  readonly dragHandleListeners?: unknown
  readonly dragHandleRef?: (element: HTMLElement | null) => void
}): ReactElement {
  const { sectionId, title, themeColor, children, dragHandleAttributes, dragHandleListeners, dragHandleRef } = props
  const addBlock = useAppStore((s) => s.addBlockByType)
  const deleteSection = useAppStore((s) => s.deleteSection)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  /**
   * Handle section deletion confirmation
   */
  const handleDeleteSection = (): void => {
    setShowDeleteDialog(true)
  }

  /**
   * Confirm and delete section
   */
  const confirmDelete = (): void => {
    deleteSection(sectionId)
    setShowDeleteDialog(false)
  }

  // 根据标题选择图标
  const getSectionIcon = (title: string): ReactElement => {
    if (title.includes('总结') || title.includes('自我')) return <User size={20} />
    if (title.includes('教育')) return <GraduationCap size={20} />
    if (title.includes('工作') || title.includes('实习')) return <Briefcase size={20} />
    if (title.includes('项目')) return <FolderKanban size={20} />
    if (title.includes('研究')) return <FlaskConical size={20} />
    if (title.includes('组织') || title.includes('社团')) return <Users size={20} />
    return <User size={20} />
  }

  // 创建圆形彩色图标
  const circularIcon = (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
      style={{ backgroundColor: themeColor }}
    >
      {getSectionIcon(title)}
    </div>
  )

  return (
    <SectionContainer themeColor={themeColor} styles={CLEAN_PROFESSIONAL_STYLES.sectionContainer}>
      {/* 使用 SectionHeader 组件 - 复用逻辑 */}
      <SectionHeader
        sectionId={sectionId}
        title={title}
        icon={circularIcon}
        themeColor={themeColor}
        onAdd={() => addBlock(sectionId)}
        onDelete={handleDeleteSection}
        dragHandleAttributes={dragHandleAttributes}
        dragHandleListeners={dragHandleListeners}
        dragHandleRef={dragHandleRef}
      />

      {/* 内容区域 */}
      <div className="space-y-3 pl-[52px]">
        {children}
      </div>

      {/* 删除确认对话框 - 使用可复用组件 */}
      <DeleteSectionDialog
        open={showDeleteDialog}
        sectionTitle={title}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDelete}
      />
    </SectionContainer>
  )
}
