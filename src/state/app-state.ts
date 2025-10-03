/**
 * AppState defines the global editor state held in the store.
 */
import type { ResumeData } from '@/entities/resume/resume-data'
import type { ThemeTokens } from '@/entities/theme/theme-tokens'
import type { BaseInfo } from '@/entities/user/base-info'
import type { JobIntention } from '@/entities/user/job-intention'
import type { Draft } from 'immer'
import type { UUID } from '@/entities/common/uuid'
import type { ExternalResume } from '@/io/external-resume-types'

export interface AppState {
  readonly resume: ResumeData
  readonly theme: ThemeTokens
  setResume: (updater: (draft: Draft<ResumeData>) => void) => void
  setTheme: (updater: (draft: Draft<ThemeTokens>) => void) => void
  /** Move a block inside a section by swapping positions based on ids. */
  moveBlockInSection: (sectionId: UUID, activeId: UUID, overId: UUID) => void
  /** Move a block from one section to another at a specific index. */
  moveBlockToSection: (fromSectionId: UUID, blockId: UUID, toSectionId: UUID, toIndex: number) => void
  /** Append a new text block to a section. */
  addTextBlock: (sectionId: UUID) => void
  /** Add a block to a section based on section title. */
  addBlockByType: (sectionId: UUID) => void
  /** Delete a block from a section. */
  deleteBlock: (sectionId: UUID, blockId: UUID) => void
  /** Move a block up within its section. */
  moveBlockUp: (sectionId: UUID, blockId: UUID) => void
  /** Move a block down within its section. */
  moveBlockDown: (sectionId: UUID, blockId: UUID) => void
  /** Reorder sections by moving active section before the over section. */
  moveSection: (activeSectionId: UUID, overSectionId: UUID) => void
  /** Import external resume JSON and replace current resume. */
  importExternalResume: (external: ExternalResume) => void
  /** Update base info and name. */
  updateBaseInfo: (baseInfo: BaseInfo, name: string) => void
  /** Update job intention. */
  updateJobIntention: (jobIntention: JobIntention) => void
}
