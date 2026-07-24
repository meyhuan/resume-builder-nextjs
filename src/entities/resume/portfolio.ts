import type { UUID } from '@/entities/common/uuid'

export const MAX_PORTFOLIO_IMAGES = 20
export const MAX_PORTFOLIO_IMAGE_BYTES = 10 * 1024 * 1024

export interface PortfolioImage {
  id: UUID
  url: string
  objectKey: string
  width: number
  height: number
  caption?: string
  sortOrder: number
}

export interface ResumePortfolio {
  enabled: boolean
  title: string
  images: PortfolioImage[]
}

export function createEmptyPortfolio(): ResumePortfolio {
  return {
    enabled: true,
    title: '作品集',
    images: [],
  }
}
