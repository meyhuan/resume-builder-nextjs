import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface SlugPageProps {
  readonly params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: SlugPageProps): Promise<Metadata> {
  void params;
  notFound();
}

export default async function ArticleDetailPage({ params }: SlugPageProps): Promise<never> {
  void params;
  notFound();
}
