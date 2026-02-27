import type { MetadataRoute } from 'next';

const SITE_URL = 'https://aijianli.cn';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/next-api/', '/admin/', '/editor/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
