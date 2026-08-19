import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Calendar, Tag } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  getAllArticles,
  getArticlesByCategory,
  ARTICLE_CATEGORIES,
  getCategoryCounts,
  getCategoryMeta,
} from '@/lib/articles/article-data';
import type { ArticleCategoryId } from '@/lib/articles/article-types';

export const metadata: Metadata = {
  title: '求职攻略 - 简历写作·面试技巧·职场指南',
  description:
    '汇集简历写作技巧、应届生求职指南、面试攻略、职场发展建议等实用文章，助你高效求职，斩获理想 Offer。',
  alternates: {
    canonical: 'https://aijianli.cn/articles',
  },
  keywords: [
    '求职攻略', '简历写作', '面试技巧', '职场指南', '应届生求职',
    '简历优化', '求职面试', '职业规划', '简历模板', '求职技巧',
  ],
};

const ARTICLES_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: '求职攻略 - 智简简历',
  description: metadata.description,
  url: 'https://aijianli.cn/articles',
  isPartOf: { '@type': 'WebSite', name: '智简简历', url: 'https://aijianli.cn' },
};

interface ArticlesPageProps {
  searchParams: Promise<{ category?: string }>;
}

export default async function ArticlesPage({ searchParams }: ArticlesPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const activeCat = (params.category as ArticleCategoryId) || 'all';
  const articles = activeCat === 'all' ? getAllArticles() : getArticlesByCategory(activeCat);
  const counts = getCategoryCounts();

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLES_JSON_LD) }}
      />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">
              求职攻略
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              简历写作、面试技巧和职场指南，覆盖求职过程里常见问题。
            </p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2">
            {ARTICLE_CATEGORIES.map((cat) => {
              const isActive: boolean = activeCat === cat.id;
              return (
                <Link
                  key={cat.id}
                  href={cat.id === 'all' ? '/articles' : `/articles?category=${cat.id}`}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat.label}
                  <span className={`text-xs ${isActive ? 'text-violet-100' : 'text-slate-400'}`}>
                    {counts[cat.id]}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Articles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((article) => {
              const catMeta = getCategoryMeta(article.category);
              return (
                <Link
                  key={article.slug}
                  href={`/articles/${article.slug}`}
                  className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-slate-300"
                >
                  {/* Card body */}
                  <div className="flex flex-col flex-1 p-5">
                    {/* Category + Date */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catMeta.bgColor} ${catMeta.color}`}>
                        {catMeta.label}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-violet-600 transition-colors">
                      {article.title}
                    </h2>

                    {/* Abstract */}
                    <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 flex-1">
                      {article.abstract}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-50 pt-3">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-0.5 rounded-md bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty state */}
          {articles.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-400 text-sm">暂无相关文章</p>
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
