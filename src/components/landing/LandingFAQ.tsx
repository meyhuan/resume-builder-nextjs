'use client';

import React, { useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQ_ITEMS } from '@/lib/faq-data';

interface FAQSectionProps {
  id?: string;
}

export const LandingFAQ = ({ id }: FAQSectionProps) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setActiveIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  return (
    <section id={id} className="py-24 bg-slate-50 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
            FAQ <span className="text-slate-400 font-normal">Frequently Asked Questions</span>
          </h2>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, index) => {
            const isActive = activeIndices.includes(index);
            return (
              <div
                key={index}
                className={cn(
                  "group bg-white rounded-2xl border border-slate-200 transition-all duration-300 overflow-hidden cursor-pointer",
                  isActive ? "shadow-lg shadow-violet-500/5 border-violet-200 ring-1 ring-violet-500/20" : "hover:border-violet-300"
                )}
                onClick={() => toggleItem(index)}
              >
                <div className="flex items-start justify-between p-6 gap-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                      isActive ? "bg-violet-100 text-violet-600" : "bg-slate-100 text-slate-400 group-hover:text-violet-500"
                    )}>
                      <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    <h3 className={cn(
                      "text-lg font-bold leading-tight transition-colors pt-0.5",
                      isActive ? "text-violet-900" : "text-slate-700 group-hover:text-violet-700"
                    )}>
                      {item.question}
                    </h3>
                  </div>
                  <ChevronDown className={cn(
                    "w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0 mt-1",
                    isActive && "rotate-180 text-violet-500"
                  )} />
                </div>
                
                <div className={cn(
                  "px-6 sm:px-[64px] overflow-hidden transition-all duration-300 ease-in-out",
                  isActive ? "max-h-[500px] pb-6 opacity-100" : "max-h-0 opacity-0"
                )}>
                  <p className="text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
