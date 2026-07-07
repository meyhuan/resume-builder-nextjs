"use client";

import React, { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ_ITEMS } from "@/lib/faq-data";

interface FAQSectionProps {
  id?: string;
}

const HOME_FAQ_ITEMS = FAQ_ITEMS.slice(0, 7);
const HOME_FAQ_COLUMNS = [
  HOME_FAQ_ITEMS.filter((_, index) => index % 2 === 0),
  HOME_FAQ_ITEMS.filter((_, index) => index % 2 === 1),
] as const;

function getFaqGlobalIndex(question: string): number {
  return HOME_FAQ_ITEMS.findIndex((item) => item.question === question);
}

export const LandingFAQ = ({ id }: FAQSectionProps) => {
  const [activeIndices, setActiveIndices] = useState<number[]>([0]);

  const toggleItem = (index: number) => {
    setActiveIndices((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  return (
    <section id={id} className="py-14 md:py-16 bg-slate-50 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
            FAQ <span className="text-slate-400 font-normal">常见问题</span>
          </h2>
          <p className="text-sm text-slate-500">
            首页保留最高频问题，其它问题可以在使用过程中随时反馈。
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          {HOME_FAQ_COLUMNS.map((columnItems, columnIndex) => (
            <div key={columnIndex} className="space-y-3">
              {columnItems.map((item) => {
                const index = getFaqGlobalIndex(item.question);
                const isActive = activeIndices.includes(index);
                return (
                  <div
                    key={item.question}
                    className={cn(
                      "group bg-white rounded-2xl border border-slate-200 transition-all duration-300 overflow-hidden cursor-pointer",
                      isActive
                        ? "shadow-lg shadow-violet-500/5 border-violet-200 ring-1 ring-violet-500/20"
                        : "hover:border-violet-300",
                    )}
                    onClick={() => toggleItem(index)}
                  >
                    <div className="flex items-start justify-between p-4 gap-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                            isActive
                              ? "bg-violet-100 text-violet-600"
                              : "bg-slate-100 text-slate-400 group-hover:text-violet-500",
                          )}
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </div>
                        <h3
                          className={cn(
                            "text-base font-bold leading-snug transition-colors pt-0.5",
                            isActive
                              ? "text-violet-900"
                              : "text-slate-700 group-hover:text-violet-700",
                          )}
                        >
                          {item.question}
                        </h3>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-5 h-5 text-slate-300 transition-transform duration-300 flex-shrink-0 mt-1",
                          isActive && "rotate-180 text-violet-500",
                        )}
                      />
                    </div>

                    <div
                      className={cn(
                        "px-4 sm:px-[52px] overflow-hidden transition-all duration-300 ease-in-out",
                        isActive
                          ? "max-h-[360px] pb-4 opacity-100"
                          : "max-h-0 opacity-0",
                      )}
                    >
                      <p className="text-sm text-slate-600 leading-7 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
