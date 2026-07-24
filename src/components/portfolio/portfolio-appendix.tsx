import type { ReactElement } from 'react'
import type { PortfolioImage, ResumePortfolio } from '@/entities/resume/portfolio'

interface PortfolioPage {
  readonly density: 1 | 2 | 4
  readonly images: readonly PortfolioImage[]
}

function densityFor(image: PortfolioImage): 1 | 2 | 4 {
  const ratio = image.height / image.width
  if (ratio >= 1.6) return 1
  if (ratio >= 1.1) return 2
  return 4
}

export function paginatePortfolio(images: readonly PortfolioImage[]): readonly PortfolioPage[] {
  const pages: PortfolioPage[] = []
  let current: PortfolioPage | null = null
  for (const image of images) {
    const density = densityFor(image)
    if (!current || current.density !== density || current.images.length >= density) {
      current = { density, images: [image] }
      pages.push(current)
      continue
    }
    current = { ...current, images: [...current.images, image] }
    pages[pages.length - 1] = current
  }
  return pages
}

export function PortfolioAppendix(props: { readonly portfolio?: ResumePortfolio }): ReactElement | null {
  const portfolio = props.portfolio
  if (!portfolio?.enabled || portfolio.images.length === 0) return null
  const pages = paginatePortfolio([...portfolio.images].sort((a, b) => a.sortOrder - b.sortOrder))

  return (
    <div className="portfolio-appendix" data-portfolio-pages={pages.length}>
      <style>{`
        .portfolio-appendix {
          --portfolio-accent: #7c3aed;
          background: #f1f5f9;
          padding-top: 24px;
        }
        .portfolio-page {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          margin: 0 auto 24px;
          padding: 14mm 15mm 12mm;
          background: #fff;
          color: #0f172a;
          break-after: page;
          page-break-after: always;
          overflow: hidden;
        }
        .portfolio-page:first-child {
          break-before: page;
          page-break-before: always;
        }
        .portfolio-page:last-child {
          break-after: auto;
          page-break-after: auto;
          margin-bottom: 0;
        }
        .portfolio-page__header {
          height: 13mm;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 7mm;
        }
        .portfolio-page__title {
          margin: 0;
          font-family: "Noto Sans SC", sans-serif;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
          letter-spacing: .04em;
        }
        .portfolio-page__index {
          font: 500 11px/1.5 Inter, sans-serif;
          color: #64748b;
        }
        .portfolio-page__grid {
          height: 244mm;
          display: grid;
          gap: 7mm;
        }
        .portfolio-page__grid[data-density="1"] { grid-template: 1fr / 1fr; }
        .portfolio-page__grid[data-density="2"] { grid-template: repeat(2, minmax(0, 1fr)) / 1fr; }
        .portfolio-page__grid[data-density="4"] { grid-template: repeat(2, minmax(0, 1fr)) / repeat(2, minmax(0, 1fr)); }
        .portfolio-item {
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 2.5mm;
          break-inside: avoid;
        }
        .portfolio-item__image-wrap {
          min-height: 0;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e2e8f0;
          border-radius: 3mm;
          overflow: hidden;
          background: #f8fafc;
        }
        .portfolio-item__image {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .portfolio-item__caption {
          margin: 0;
          color: #475569;
          font: 400 11px/1.55 "Noto Sans SC", sans-serif;
          text-align: center;
        }
        @media print {
          .portfolio-appendix { background: #fff; padding-top: 0; }
          .portfolio-page {
            page: portfolio;
            margin: 0;
            box-shadow: none !important;
          }
          @page portfolio { size: A4 portrait; margin: 0; }
        }
      `}</style>
      {pages.map((page, pageIndex) => (
        <section className="portfolio-page" key={`portfolio-page-${pageIndex + 1}`}>
          <header className="portfolio-page__header">
            <h2 className="portfolio-page__title">{portfolio.title || '作品集'}</h2>
            <span className="portfolio-page__index">{pageIndex + 1} / {pages.length}</span>
          </header>
          <div className="portfolio-page__grid" data-density={page.density}>
            {page.images.map((image, imageIndex) => (
              <figure className="portfolio-item" key={image.id}>
                <div className="portfolio-item__image-wrap">
                  <img
                    className="portfolio-item__image"
                    src={image.url}
                    alt={image.caption || `作品 ${pageIndex + 1}-${imageIndex + 1}`}
                  />
                </div>
                {image.caption ? <figcaption className="portfolio-item__caption">{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
