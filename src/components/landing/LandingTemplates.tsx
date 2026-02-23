'use client';

import React, { useEffect, useState } from 'react';
import { LandingButton } from './LandingButton';
import Link from 'next/link';
import Image from 'next/image';
import { getTemplatesAction } from '@/app/admin/actions';
import { Layout, Wand2, Gem } from 'lucide-react';

interface TemplatesSectionProps {
  id?: string;
}

interface TemplateItem {
  id: string;
  name: string;
  thumbnail?: string | null;
  [key: string]: unknown;
}

export const LandingTemplates = ({ id }: TemplatesSectionProps) => {
  const [templates, setTemplates] = useState<TemplateItem[]>([]);

  useEffect(() => {
    async function fetchTemplates() {
      const res = await getTemplatesAction();
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    }
    fetchTemplates();
  }, []);

  return (
    <section id={id} className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-200/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 animate-in slide-in-from-bottom duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 backdrop-blur-md border border-white/60 rounded-full mb-6 shadow-sm">
            <Gem className="w-4 h-4 text-violet-500" />
            <span className="text-sm font-semibold text-slate-600">精选模板</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            不求多，<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-500">但求精</span>
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            每一套模板都经过反复打磨，覆盖应届生、互联网、商务等主流场景。
            <br className="hidden md:block" />
            全部免费使用，不收一分钱。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 animate-in slide-in-from-bottom duration-700 delay-200">
          {templates.length > 0 ? (
            templates.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-200/50 transition-all duration-500 hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-2">
                <div className="aspect-[3/4] relative overflow-hidden bg-slate-100">
                  {item.thumbnail ? (
                    <Image 
                      src={item.thumbnail} 
                      alt={item.name} 
                      fill 
                      className="object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300">
                      <Layout className="w-16 h-16 opacity-30" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-900/90 via-violet-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                    <Link href={`/editor?template=${item.id}`} className="w-full">
                      <LandingButton variant="primary" size="md" className="w-full rounded-xl shadow-none border-0 font-bold">
                        <Wand2 className="w-4 h-4 mr-2" />
                        免费使用此模板
                      </LandingButton>
                    </Link>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-green-500/90 backdrop-blur text-[10px] font-bold text-white rounded-lg shadow-sm">
                      FREE
                    </span>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-base font-bold text-slate-800 mb-1">{item.name}</h3>
                  <p className="text-xs text-slate-400 truncate">免费使用 · 免费导出</p>
                </div>
              </div>
            ))
          ) : (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-lg animate-pulse">
                <div className="aspect-[3/4] bg-slate-100" />
                <div className="p-5 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-50 rounded w-full" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center">
          <Link href="/editor">
            <LandingButton variant="glass" size="lg" className="rounded-full px-8 text-slate-600 hover:text-violet-600">
              查看全部模板
            </LandingButton>
          </Link>
        </div>
      </div>
    </section>
  );
};
