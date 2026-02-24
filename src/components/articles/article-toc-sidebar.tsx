'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { List } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TocHeading } from '@/lib/articles/article-types';

interface ArticleTocSidebarProps {
  readonly headings: readonly TocHeading[];
}

/**
 * Sticky table-of-contents sidebar for article detail pages.
 * Highlights the currently visible heading and scrolls smoothly on click.
 */
export function ArticleTocSidebar({ headings }: ArticleTocSidebarProps): React.ReactElement {
  const [activeId, setActiveId] = useState<string>('');

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 100;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: '-100px 0px -60% 0px', threshold: 0.1 },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  return (
    <aside className="hidden lg:block w-60 shrink-0 sticky top-36 self-start">
      <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
            <List className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-bold text-slate-800">文章大纲</span>
          </div>
          <nav className="space-y-0.5 max-h-[60vh] overflow-y-auto">
            {headings.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => handleClick(h.id)}
                className={cn(
                  'block w-full text-left text-[13px] leading-relaxed py-1.5 px-2 rounded-lg transition-all truncate',
                  h.level === 3 && 'pl-5',
                  activeId === h.id
                    ? 'text-violet-600 font-semibold bg-violet-50'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50',
                )}
              >
                {h.text}
              </button>
            ))}
          </nav>
        </div>
    </aside>
  );
}
