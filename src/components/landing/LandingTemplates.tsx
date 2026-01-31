'use client';

import React, { useEffect, useState } from 'react';
import { LandingButton } from './LandingButton';
import Link from 'next/link';
import Image from 'next/image';
import { getTemplatesAction } from '@/app/admin/actions';
import { Layout } from 'lucide-react';

interface TemplatesSectionProps {
  id?: string;
}

export const LandingTemplates = ({ id }: TemplatesSectionProps) => {
  const [templates, setTemplates] = useState<any[]>([]);

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
    <section id={id} className="py-24 bg-white relative border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-in slide-in-from-bottom duration-700">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-full mb-4">
            免费使用
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            专业简历模板
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            所有模板完全免费，无需付费即可使用，覆盖各行业岗位
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 animate-in slide-in-from-bottom duration-700 delay-200">
          {templates.length > 0 ? (
            templates.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
                <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                  {item.thumbnail ? (
                    <Image 
                      src={item.thumbnail} 
                      alt={item.name} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-200">
                      <Layout className="w-16 h-16 opacity-20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6">
                    <Link href="/dashboard" className="w-full">
                      <LandingButton size="sm" className="w-full">立即使用</LandingButton>
                    </Link>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-bold text-gray-800 text-center">{item.name}</h3>
                </div>
              </div>
            ))
          ) : (
            // Fallback to static data if DB is empty
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm animate-pulse">
                <div className="aspect-[3/4] bg-gray-100" />
                <div className="p-4">
                  <div className="h-4 bg-gray-100 rounded w-1/2 mx-auto" />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-center">
          <Link href="/dashboard">
            <LandingButton variant="outline">查看更多模板</LandingButton>
          </Link>
        </div>
      </div>
    </section>
  );
};
