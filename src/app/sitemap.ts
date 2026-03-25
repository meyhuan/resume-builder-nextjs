import type { MetadataRoute } from 'next';
import { templateRoleData } from '@/lib/templates/template-role-data';
import { SITE_URL } from '@/lib/site-config';

const STATIC_ROUTES: ReadonlyArray<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/ai', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/import', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/templates', changeFrequency: 'weekly', priority: 0.8 },
];

function createAbsoluteUrl(path: string): string {
  return path ? `${SITE_URL}${path}` : SITE_URL;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now: Date = new Date();
  const allTemplateRoles = templateRoleData.getAllTemplateRoles();
  const allTemplateCategories = templateRoleData.getAllTemplateRoleCategories();
  const allTemplateIndustries = templateRoleData.getAllTemplateRoleIndustries();
  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: createAbsoluteUrl(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const templatePages: MetadataRoute.Sitemap = allTemplateRoles.map((role) => ({
    url: createAbsoluteUrl(`/templates/${encodeURIComponent(role.slug)}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const templateCategoryPages: MetadataRoute.Sitemap = allTemplateCategories.map((categoryGroup) => ({
    url: createAbsoluteUrl(`/templates/category/${encodeURIComponent(categoryGroup.slug)}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.72,
  }));

  const templateIndustryPages: MetadataRoute.Sitemap = allTemplateIndustries.map((industryGroup) => ({
    url: createAbsoluteUrl(`/templates/industry/${encodeURIComponent(industryGroup.slug)}`),
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.71,
  }));

  return [...staticPages, ...templateCategoryPages, ...templateIndustryPages, ...templatePages];
}
