'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, ChevronRight, Calendar, ArrowRight } from 'lucide-react';
import { LandingButton } from './LandingButton';
import {
  getAllArticles,
  getArticlesByCategory,
  ARTICLE_CATEGORIES,
  getCategoryMeta,
} from '@/lib/articles/article-data';
import type { ArticleCategoryId } from '@/lib/articles/article-types';

interface ArticlesSectionProps {
  id?: string;
}

const DISPLAY_COUNT = 6;

export const LandingArticles = ({ id }: ArticlesSectionProps): React.ReactElement => {
  const [activeCat, setActiveCat] = useState<ArticleCategoryId>('all');

  const articles = activeCat === 'all'
    ? getAllArticles().slice(0, DISPLAY_COUNT)
    : getArticlesByCategory(activeCat).slice(0, DISPLAY_COUNT);

  return (
    <section id={id} className="py-24 bg-white relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-fuchsia-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/80 backdrop-blur-sm border border-slate-100 rounded-full shadow-sm mb-5">
            <BookOpen className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-violet-600">求职攻略</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 tracking-tight">
            求职路上，
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">不走弯路</span>
          </h2>
          <p className="text-base text-slate-500 max-w-2xl mx-auto">
            覆盖简历写作、面试技巧、应届求职、职场发展全流程，助你快速拿到心仪 Offer。
          </p>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {ARTICLE_CATEGORIES.map((cat) => {
            const isActive: boolean = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCat(cat.id)}
                className={`
                  px-4 py-2 rounded-full text-sm font-medium transition-all
                  ${isActive
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}
                `}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Article Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => {
            const catMeta = getCategoryMeta(article.category);
            return (
              <Link
                key={article.slug}
                href={`/articles/${article.slug}`}
                className="group flex flex-col bg-white/70 backdrop-blur-md rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:bg-white hover:-translate-y-0.5 transition-all duration-300 overflow-hidden h-[240px]"
              >
                <div className="flex flex-col flex-1 p-5">
                  {/* Category + Date */}
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${catMeta.bgColor} ${catMeta.color}`}>
                      {catMeta.label}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3" />
                      {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-bold text-slate-800 mb-2 line-clamp-2 group-hover:text-violet-600 transition-colors leading-snug">
                    {article.title}
                  </h3>

                  {/* Abstract */}
                  <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 flex-1">
                    {article.abstract}
                  </p>

                  {/* Read more */}
                  <div className="flex items-center gap-1 mt-3 text-xs font-medium text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    阅读全文
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/articles">
            <LandingButton variant="glass" size="md" className="rounded-full px-8 inline-flex items-center gap-2">
              查看全部攻略
              <ArrowRight className="w-4 h-4" />
            </LandingButton>
          </Link>
        </div>
      </div>
    </section>
  );
};
