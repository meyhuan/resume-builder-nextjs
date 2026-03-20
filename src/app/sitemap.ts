import type { MetadataRoute } from 'next';
import { getAllArticles } from '@/lib/articles/article-data';
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
  { path: '/articles', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/import', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/templates', changeFrequency: 'weekly', priority: 0.8 },
];

function createAbsoluteUrl(path: string): string {
  return path ? `${SITE_URL}${path}` : SITE_URL;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now: Date = new Date();
  const allArticles = getAllArticles();
  const allTemplateRoles = templateRoleData.getAllTemplateRoles();
  const allTemplateCategories = templateRoleData.getAllTemplateRoleCategories();
  const allTemplateIndustries = templateRoleData.getAllTemplateRoleIndustries();
  const latestArticleDate: Date = allArticles.reduce(
    (latest: Date, article) => {
      const articleDate: Date = new Date(article.updatedAt || article.createdAt);
      return articleDate.getTime() > latest.getTime() ? articleDate : latest;
    },
    now,
  );
  const staticPages: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: createAbsoluteUrl(route.path),
    lastModified: route.path === '/articles' ? latestArticleDate : now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const articlePages: MetadataRoute.Sitemap = allArticles.map((article) => ({
    url: createAbsoluteUrl(`/articles/${encodeURIComponent(article.slug)}`),
    lastModified: new Date(article.updatedAt || article.createdAt),
    changeFrequency: 'monthly',
    priority: 0.7,
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

  return [...staticPages, ...articlePages, ...templateCategoryPages, ...templateIndustryPages, ...templatePages];
}
