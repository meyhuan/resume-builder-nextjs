import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, ChevronRight, Calendar, Tag } from 'lucide-react';
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
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLES_JSON_LD) }}
      />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-36 pb-20 relative">
        {/* Background Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Page Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-white rounded-full shadow-sm mb-5">
              <BookOpen className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-semibold text-violet-600">求职攻略</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
              助你高效求职，斩获理想
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500"> Offer</span>
            </h1>
            <p className="text-base text-slate-500 max-w-2xl mx-auto">
              汇集简历写作、面试技巧、职场指南等实用文章，覆盖求职全流程。
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {ARTICLE_CATEGORIES.map((cat) => {
              const isActive: boolean = activeCat === cat.id;
              return (
                <Link
                  key={cat.id}
                  href={cat.id === 'all' ? '/articles' : `/articles?category=${cat.id}`}
                  className={`
                    inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                      : 'bg-white/70 backdrop-blur-sm text-slate-600 border border-white hover:bg-white hover:shadow-sm'}
                  `}
                >
                  {cat.label}
                  <span className={`text-xs ${isActive ? 'text-violet-200' : 'text-slate-400'}`}>
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
                  className="group flex flex-col bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm hover:shadow-lg hover:bg-white/90 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden"
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

                    {/* Tags + Arrow */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                      <div className="flex flex-wrap gap-1.5">
                        {article.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-md bg-slate-50 text-slate-500"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </span>
                        ))}
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
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
