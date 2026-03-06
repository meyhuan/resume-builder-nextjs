/** Raw shape of each item in resume.articles.json */
export interface RawArticle {
  article_slug?: string;
  article_title: string;
  article_auther_email: string;
  article_views: number;
  article_likes: number;
  article_collections: number;
  article_html_content: string;
  article_text_content: string;
  article_tags: string[];
  article_category: string;
  article_cover: string;
  article_abstract: string;
  article_likes_users: string[];
  article_collection_users: string[];
  article_code_buy_code: boolean;
  source_url?: string;
  createDate: string;
  updateDate: string;
}

/** Cleaned article used throughout the app */
export interface Article {
  slug: string;
  title: string;
  abstract: string;
  htmlContent: string;
  textContent: string;
  tags: string[];
  category: ArticleCategoryId;
  cover: string;
  views: number;
  sourceUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** Supported category identifiers */
export type ArticleCategoryId =
  | 'all'
  | 'resume-writing'
  | 'fresh-graduate'
  | 'interview-tips'
  | 'career-guide';

/** Category display metadata */
export interface ArticleCategoryMeta {
  id: ArticleCategoryId;
  label: string;
  /** Original Chinese label used in JSON */
  rawLabel: string;
  color: string;
  bgColor: string;
}

/** Heading extracted from article HTML for TOC */
export interface TocHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Adjacent article for prev/next navigation */
export interface AdjacentArticles {
  prev: Article | null;
  next: Article | null;
}
