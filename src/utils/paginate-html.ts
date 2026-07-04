/**
 * Constants for A4 page dimensions in pixels at 96 DPI
 */
// const A4_HEIGHT_PX = 1123; // ~297mm at 96 DPI
// const PAGE_MARGIN_PX = 38; // ~10mm margin
// const USABLE_HEIGHT_PX = A4_HEIGHT_PX - PAGE_MARGIN_PX * 2;
// const HEADER_SAFETY_MARGIN_PX = 100; // Don't allow headers in last 100px of page

/**
 * Element height estimation for server-side processing
 */
// interface ElementMeasurement {
//   selector: string;
//   estimatedHeight: number;
// }

/**
 * Estimated heights for common resume elements (in pixels)
 */
// const ELEMENT_HEIGHTS: Record<string, number> = {
//   'h1': 48,
//   'h2': 36,
//   'h3': 28,
//   'p': 24,
//   'li': 22,
//   'section-header': 50,
//   'experience-item': 120,
//   'education-item': 100,
//   'project-item': 100,
//   'skill-group': 60,
// };

/**
 * Injects page-break-before style to elements that would otherwise
 * create orphan headers at the bottom of a page.
 * 
 * This is a simple string-based approach that works server-side.
 * It adds inline styles to force page breaks when needed.
 * 
 * @param html - The HTML string to process
 * @returns Processed HTML with page break hints
 */
export function paginateHtml(html: string): string {
  // Add CSS class definitions for pagination control
  const paginationStyles = `
    <style>
      .pdf-page-break { 
        break-before: page; 
        page-break-before: always; 
      }
      .pdf-keep-together { 
        break-inside: avoid; 
        page-break-inside: avoid; 
      }
      .pdf-keep-with-next { 
        break-after: avoid; 
        page-break-after: avoid; 
      }
    </style>
  `;

  // Insert pagination styles into head if exists, otherwise before body content
  let processedHtml = html;
  
  if (processedHtml.includes('</head>')) {
    processedHtml = processedHtml.replace('</head>', `${paginationStyles}</head>`);
  } else if (processedHtml.includes('<body')) {
    processedHtml = processedHtml.replace('<body', `${paginationStyles}<body`);
  } else {
    processedHtml = paginationStyles + processedHtml;
  }

  // Add keep-together class to individual items
  const itemPatterns = [
    /(<div[^>]*class="[^"]*experience-item[^"]*")/gi,
    /(<div[^>]*class="[^"]*education-item[^"]*")/gi,
    /(<div[^>]*class="[^"]*project-item[^"]*")/gi,
    /(<div[^>]*class="[^"]*resume-item[^"]*")/gi,
  ];

  for (const pattern of itemPatterns) {
    processedHtml = processedHtml.replace(pattern, (match) => {
      if (match.includes('pdf-keep-together')) return match;
      return match.replace(/class="/, 'class="pdf-keep-together ');
    });
  }

  // Add keep-with-next class to section headers
  const headerPatterns = [
    /(<(?:h2|h3)[^>]*class="[^"]*section)/gi,
    /(<div[^>]*class="[^"]*section-title[^"]*")/gi,
    /(<div[^>]*class="[^"]*resume-section-header[^"]*")/gi,
  ];

  for (const pattern of headerPatterns) {
    processedHtml = processedHtml.replace(pattern, (match) => {
      if (match.includes('pdf-keep-with-next')) return match;
      return match.replace(/class="/, 'class="pdf-keep-with-next ');
    });
  }

  // Handle h2/h3 without existing classes
  processedHtml = processedHtml.replace(
    /<(h2|h3)([^>]*)>/gi,
    (match, tag, attrs) => {
      if (attrs.includes('class=')) {
        if (attrs.includes('pdf-keep-with-next')) return match;
        return `<${tag}${attrs.replace(/class="/, 'class="pdf-keep-with-next ')}>`;
      }
      return `<${tag} class="pdf-keep-with-next"${attrs}>`;
    }
  );

  return processedHtml;
}

/**
 * Smart pagination that measures actual block heights in the browser and
 * applies per-block break rules:
 *   - Short blocks (< 1/3 of usable page height) keep together
 *     (break-inside: avoid) — splitting a 3-line entry across pages looks
 *     broken, and pushing it down only costs a small gap.
 *   - Tall blocks (multi-paragraph experiences) are left splittable so a
 *     whole block is never pushed to the next page leaving a large blank.
 * Skips one-page and bleed layouts, which manage overflow themselves.
 *
 * @returns JavaScript code to execute in the browser
 */
export function getClientPaginationScript(): string {
  return `
    (function() {
      if (document.querySelector('[data-one-page="true"], [data-bleed="true"]')) return;

      const PAGE_HEIGHT = 1123; // A4 at 96 DPI
      const MM_TO_PX = 3.7795; // 1mm ≈ 3.7795px at 96 DPI
      const container = document.querySelector('.resume-container');
      const paddingV = parseFloat(container?.getAttribute('data-page-padding-vertical') || '0');
      const marginPx = paddingV * MM_TO_PX;
      // USABLE_HEIGHT is consistent for all pages and templates because
      // native @page margins handle the visual spacing natively.
      const USABLE_HEIGHT = PAGE_HEIGHT - (2 * marginPx);
      // Blocks up to 1/3 of a page keep together; taller ones may split.
      const SHORT_BLOCK_MAX = USABLE_HEIGHT / 3;

      const blocks = document.querySelectorAll(
        '[data-resume-block], .resume-item, .experience-item, .education-item, .project-item'
      );
      blocks.forEach((el) => {
        const height = el.getBoundingClientRect().height;
        if (height > 0 && height <= SHORT_BLOCK_MAX) {
          el.style.breakInside = 'avoid';
          el.style.pageBreakInside = 'avoid';
        } else {
          el.style.breakInside = 'auto';
          el.style.pageBreakInside = 'auto';
        }
      });
    })();
  `;
}

export default paginateHtml;
