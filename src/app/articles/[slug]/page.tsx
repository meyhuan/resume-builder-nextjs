import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, ChevronRight, BookOpen, Calendar, Tag } from 'lucide-react';
import { LandingHeader } from '@/components/landing/LandingHeader';
import { LandingFooter } from '@/components/landing/LandingFooter';
import {
  getAllArticles,
  getArticleBySlug,
  getAdjacentArticles,
  extractHeadings,
  injectHeadingIds,
  getCategoryMeta,
} from '@/lib/articles/article-data';
import type { Article, TocHeading } from '@/lib/articles/article-types';
import { templateRoleData } from '@/lib/templates/template-role-data';
import '@/styles/article-prose.css';
import { ArticleTocSidebar } from '@/components/articles/article-toc-sidebar';

type TemplateRoleRecord = ReturnType<typeof templateRoleData.getAllTemplateRoles>[number];

function getRelatedTemplateRolesForArticle(article: Article): TemplateRoleRecord[] {
  const normalizedContent: string = `${article.title} ${article.abstract} ${article.tags.join(' ')} ${article.textContent}`.toLowerCase();
  return templateRoleData
    .getAllTemplateRoles()
    .map((role: TemplateRoleRecord) => {
      let relevanceScore: number = 0;
      if (normalizedContent.includes(role.role.toLowerCase())) {
        relevanceScore += 4;
      }
      if (normalizedContent.includes(role.category.toLowerCase())) {
        relevanceScore += 2;
      }
      if (normalizedContent.includes(role.industry.toLowerCase())) {
        relevanceScore += 1;
      }
      const keywordMatches: number = role.searchKeywords.reduce((score: number, keyword: string) => {
        return normalizedContent.includes(keyword.toLowerCase()) ? score + 1 : score;
      }, 0);
      relevanceScore += keywordMatches;
      if (article.category === role.articleCategoryId) {
        relevanceScore += 2;
      }
      return {
        role,
        relevanceScore,
      };
    })
    .filter((entry: { role: TemplateRoleRecord; relevanceScore: number }) => entry.relevanceScore > 0)
    .sort((left: { role: TemplateRoleRecord; relevanceScore: number }, right: { role: TemplateRoleRecord; relevanceScore: number }) => right.relevanceScore - left.relevanceScore)
    .slice(0, 6)
    .map((entry: { role: TemplateRoleRecord; relevanceScore: number }) => entry.role);
}

// ---------------------------------------------------------------------------
// Static params — enables SSG for all 140 articles (SEO-critical)
// ---------------------------------------------------------------------------

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata per article
// ---------------------------------------------------------------------------

interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: '文章未找到' };
  const catMeta = getCategoryMeta(article.category);
  return {
    title: `${article.title} - ${catMeta.label}`,
    description: article.abstract.slice(0, 160),
    keywords: [...article.tags, catMeta.label, '求职攻略', '智简简历'],
    openGraph: {
      title: article.title,
      description: article.abstract.slice(0, 160),
      type: 'article',
      publishedTime: article.createdAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
    },
  };
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ArticleDetailPage({ params }: SlugPageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const { prev, next } = getAdjacentArticles(slug);
  const headings: TocHeading[] = extractHeadings(article.htmlContent);
  const htmlWithIds: string = injectHeadingIds(article.htmlContent);
  const catMeta = getCategoryMeta(article.category);
  const relatedTemplateRoles: TemplateRoleRecord[] = getRelatedTemplateRolesForArticle(article);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.abstract,
    datePublished: article.createdAt,
    dateModified: article.updatedAt,
    author: { '@type': 'Organization', name: '智简简历' },
    publisher: { '@type': 'Organization', name: '智简简历', url: 'https://aijianli.cn' },
    mainEntityOfPage: `https://aijianli.cn/articles/${slug}`,
    keywords: article.tags.join(', '),
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: '首页', item: 'https://aijianli.cn' },
      { '@type': 'ListItem', position: 2, name: '求职攻略', item: 'https://aijianli.cn/articles' },
      { '@type': 'ListItem', position: 3, name: catMeta.label, item: `https://aijianli.cn/articles?category=${article.category}` },
      { '@type': 'ListItem', position: 4, name: article.title },
    ],
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] selection:bg-fuchsia-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <LandingHeader forceSolid />

      <main className="flex-grow pt-36 pb-20 relative">
        {/* Background Orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-8%] right-[-5%] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-8%] left-[-5%] w-[400px] h-[400px] bg-fuchsia-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm text-slate-400 mb-8 flex-wrap">
            <Link href="/" className="hover:text-violet-600 transition-colors">首页</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/articles" className="hover:text-violet-600 transition-colors">求职攻略</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link
              href={`/articles?category=${article.category}`}
              className="hover:text-violet-600 transition-colors"
            >
              {catMeta.label}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-600 font-medium">{article.title}</span>
          </nav>

          <div className="flex gap-8">
            {/* Main content */}
            <article className="flex-1 min-w-0">
              {/* Article header */}
              <header className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${catMeta.bgColor} ${catMeta.color}`}>
                    {catMeta.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                  {article.title}
                </h1>
                <p className="text-base text-slate-500 leading-relaxed">{article.abstract}</p>
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {article.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-500"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>
              </header>

              {/* Article body */}
              <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm p-6 md:p-10">
                <div
                  className="article-prose"
                  dangerouslySetInnerHTML={{ __html: htmlWithIds }}
                />
              </div>

              <section className="rounded-2xl bg-white/70 backdrop-blur-md border border-white shadow-sm p-6 md:p-8 mt-8">
                <div className="flex items-center gap-2 text-slate-900">
                  <BookOpen className="w-5 h-5 text-violet-500" />
                  <h2 className="text-2xl font-extrabold">相关岗位模板</h2>
                </div>
                <p className="text-sm text-slate-500 mt-3 leading-relaxed">
                  结合这篇文章的主题，下面这些岗位模板页更适合继续查看，方便你把攻略内容直接转化为可投递简历。
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  {relatedTemplateRoles.map((role: TemplateRoleRecord) => (
                    <Link
                      key={role.slug}
                      href={`/templates/${role.slug}`}
                      className="px-4 py-2 rounded-full bg-slate-50 text-slate-600 text-sm hover:bg-violet-50 hover:text-violet-600 transition-colors"
                    >
                      {role.role}简历模板
                    </Link>
                  ))}
                </div>
              </section>

              {/* Prev / Next */}
              <nav className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-10">
                <PrevNextCard article={prev} direction="prev" />
                <PrevNextCard article={next} direction="next" />
              </nav>

              {/* Back to list */}
              <div className="text-center mt-10">
                <Link
                  href="/articles"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 rounded-full transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  查看全部攻略
                </Link>
              </div>
            </article>

            {/* TOC Sidebar — desktop only */}
            {headings.length > 0 && (
              <ArticleTocSidebar headings={headings} />
            )}
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Prev / Next card sub-component
// ---------------------------------------------------------------------------

interface PrevNextCardProps {
  article: Article | null;
  direction: 'prev' | 'next';
}

function PrevNextCard({ article, direction }: PrevNextCardProps): React.ReactElement | null {
  if (!article) return <div />;
  const isPrev = direction === 'prev';
  return (
    <Link
      href={`/articles/${article.slug}`}
      className={`group flex items-center gap-3 p-4 rounded-xl bg-white/70 backdrop-blur-sm border border-white shadow-sm hover:shadow-md hover:bg-white/90 transition-all ${isPrev ? '' : 'md:flex-row-reverse md:text-right'}`}
    >
      <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-violet-50 transition-colors`}>
        {isPrev
          ? <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />
          : <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-500" />
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-slate-400 mb-0.5">{isPrev ? '上一篇' : '下一篇'}</div>
        <div className="text-sm font-semibold text-slate-700 truncate group-hover:text-violet-600 transition-colors">
          {article.title}
        </div>
      </div>
    </Link>
  );
}
