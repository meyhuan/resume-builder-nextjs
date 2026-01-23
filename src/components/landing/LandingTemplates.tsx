'use client';

import React from 'react';
import { LandingButton } from './LandingButton';
import Link from 'next/link';
import Image from 'next/image';

interface TemplatesSectionProps {
  id?: string;
}

const placeholderTemplates = [
  { id: 1, cover: '/index-resume-1.png', title: '现代简约模板' },
  { id: 2, cover: '/index-resume-2.png', title: '专业通用模板' },
  { id: 3, cover: '/index-resume-3.png', title: '创新设计模板' },
  { id: 4, cover: '/index-resume-1.png', title: '传统商务模板' },
  { id: 5, cover: '/index-resume-2.png', title: '极简主义模板' },
  { id: 6, cover: '/index-resume-3.png', title: '学术研究模板' },
  { id: 7, cover: '/index-resume-1.png', title: '互联网求职模板' },
  { id: 8, cover: '/index-resume-2.png', title: '管理岗专家模板' },
];

export const LandingTemplates = ({ id }: TemplatesSectionProps) => {
  return (
    <section id={id} className="py-24 bg-white relative border-y border-gray-100 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16 animate-in slide-in-from-bottom duration-700">
          <span className="inline-block px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-full mb-4">
            免费使用
          </span>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            200+ 免费专业简历模板
          </h2>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            所有模板完全免费，无需付费即可使用，覆盖各行业岗位
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12 animate-in slide-in-from-bottom duration-700 delay-200">
          {placeholderTemplates.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-2">
              <div className="aspect-[3/4] relative overflow-hidden bg-gray-50">
                <Image 
                  src={item.cover} 
                  alt={item.title} 
                  fill 
                  className="object-cover transition-transform duration-500 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-6">
                  <Link href="/dashboard" className="w-full">
                    <LandingButton size="sm" className="w-full">立即使用</LandingButton>
                  </Link>
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-sm font-bold text-gray-800 text-center">{item.title}</h3>
              </div>
            </div>
          ))}
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
