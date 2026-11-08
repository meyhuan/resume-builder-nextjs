import 'server-only';
import { revalidatePath, revalidateTag } from 'next/cache';
import { ARTICLES_CACHE_TAG } from './article-repository';

export function revalidateArticles() {
  revalidateTag(ARTICLES_CACHE_TAG);
  revalidatePath('/articles');
  // Includes negative (404) caches and previous/next links on other articles.
  revalidatePath('/articles/[slug]', 'page');
  revalidatePath('/sitemap.xml');
  revalidatePath('/');
  revalidatePath('/templates/[role]', 'page');
}
