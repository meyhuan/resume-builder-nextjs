type TemplateCatalogItem = {
  id: string;
  name: string;
  description: string;
  preview: string;
  tags: readonly string[];
};

export const templateCatalog: readonly TemplateCatalogItem[] = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'Clean and versatile, suitable for all scenarios',
    preview: '/thumbnails/template_simple.webp',
    tags: ['General', 'Clean'],
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Dark header with gold accents, formal and sophisticated',
    preview: '/thumbnails/template_elegant.webp',
    tags: ['Formal', 'Sophisticated', 'Elegant', 'Gold'],
  },
  {
    id: 'warm',
    name: 'Two-Column',
    description: 'Two-column layout with left sidebar and right main content',
    preview: '/thumbnails/template_warm.webp',
    tags: ['General', 'Two-Column', 'Warm', 'Sidebar'],
  },
  {
    id: 'timeline',
    name: 'Timeline',
    description: 'Left dates + right content, vertical line, classic timeline style',
    preview: '/thumbnails/template_timeline.webp',
    tags: ['General', 'Timeline', 'Classic', 'Clean'],
  },
];
