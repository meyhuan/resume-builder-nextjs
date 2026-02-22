'use client';

import React, { useState, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { JOB_HOT_PICKS } from '../constants';
import { getJobTree, searchJobs } from '../data/job-tree';
import type { JobCategory } from '../data/job-tree';
import { Search, ChevronLeft, X } from 'lucide-react';

type ViewMode = 'default' | 'grid';

export const StepTargetRole = ({ stepNumber, onClickPast }: { stepNumber: number; onClickPast?: () => void }) => {
  const { setTargetRole, targetRole, nextStep, currentStep } = useWizardStore();
  const [searchValue, setSearchValue] = useState<string>(targetRole || '');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [activeCategory, setActiveCategory] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isCurrent: boolean = currentStep === stepNumber;
  const jobTree: readonly JobCategory[] = getJobTree();

  const searchResults: string[] = useMemo(() => {
    if (!searchValue.trim()) return [];
    const kw = searchValue.trim();
    const matches = searchJobs(kw);
    // Include user's custom input as the first option if it's not already in the matches
    if (!matches.some(m => m.toLowerCase() === kw.toLowerCase())) {
      return [kw, ...matches];
    }
    return matches;
  }, [searchValue]);

  const handleSelect = (role: string): void => {
    setTargetRole(role);
    setSearchValue(role);
    setShowDropdown(false);
    if (!isCurrent && onClickPast) {
      onClickPast();
      if (viewMode !== 'grid') {
        setTimeout(() => nextStep(), 400);
      }
    } else if (isCurrent && viewMode !== 'grid') {
      setTimeout(() => nextStep(), 400);
    }
  };

  const handleConfirmSearch = (): void => {
    if (searchValue.trim()) {
      handleSelect(searchValue.trim());
    }
  };

  const handleGridConfirm = (): void => {
    if (targetRole) {
      if (!isCurrent && onClickPast) {
        onClickPast();
      }
      setTimeout(() => nextStep(), 400);
    }
  };

  const activeCategoryJobs: string[] = useMemo(() => {
    const cat = jobTree.find((c) => c.name === activeCategory);
    return cat ? cat.jobs : [];
  }, [activeCategory, jobTree]);

  // Initialize first category when entering grid mode
  const openGrid = (): void => {
    if (!activeCategory && jobTree.length > 0) {
      setActiveCategory(jobTree[0].name);
    }
    setViewMode('grid');
  };

  return (
    <StepCard stepNumber={stepNumber} title="请选择你的意向岗位" onClickPast={onClickPast}>
      <div className="space-y-4 relative">
        {/* Search bar */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索岗位"
              value={searchValue}
              onFocus={() => setShowDropdown(true)}
              onChange={(e) => {
                setSearchValue(e.target.value);
                setShowDropdown(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmSearch();
              }}
              className="w-full pl-10 pr-9 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all text-sm bg-white"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  setTargetRole('');
                  setShowDropdown(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchValue.trim() && (
            <button
              type="button"
              onClick={handleConfirmSearch}
              className="shrink-0 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-5 py-3 rounded-lg text-sm font-medium transition-colors"
            >
              确认
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {showDropdown && searchValue.trim() && searchResults.length > 0 && (
          <div className="absolute top-[48px] left-0 right-[84px] border border-gray-200 rounded-lg bg-white shadow-lg max-h-52 overflow-y-auto z-20">
            {searchResults.slice(0, 20).map((job, idx) => (
              <button
                key={`${job}-${idx}`}
                type="button"
                onClick={() => handleSelect(job)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-[#F5F3FF] transition-colors text-gray-700"
              >
                {idx === 0 && job === searchValue.trim() ? (
                  <span className="text-[#7C3AED] font-medium">使用自定义: {job}</span>
                ) : (
                  <HighlightText text={job} keyword={searchValue} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Default view: hot picks + "更多岗位" */}
        {viewMode === 'default' && (
          <div className="flex flex-wrap gap-3">
            {JOB_HOT_PICKS.map((job) => (
              <button
                key={job}
                type="button"
                onClick={() => handleSelect(job)}
                className={cn(
                  'px-6 py-3 rounded-lg text-sm font-medium transition-colors border',
                  targetRole === job
                    ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#8B5CF6]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {job}
              </button>
            ))}
            <button
              type="button"
              onClick={openGrid}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-colors border border-dashed border-[#8B5CF6] text-[#7C3AED] bg-[#F5F3FF]/50 hover:bg-[#F5F3FF]"
            >
              更多岗位
            </button>
          </div>
        )}

        {/* Grid view: categorized picker */}
        {viewMode === 'grid' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={() => setViewMode('default')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8B5CF6] transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                全部岗位分类
              </button>
            </div>
            <div className="flex gap-4 min-h-[280px]">
              {/* Left sidebar */}
              <div className="w-32 shrink-0 space-y-1 overflow-y-auto max-h-[320px] pr-1">
                {jobTree.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setActiveCategory(cat.name)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                      activeCategory === cat.name
                        ? 'bg-[#F5F3FF] text-[#7C3AED] font-medium'
                        : 'text-gray-600 hover:bg-gray-50',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Right content */}
              <div className="flex-1 border-l border-gray-100 pl-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[320px] pr-2">
                  {activeCategoryJobs.map((job) => (
                    <button
                      key={job}
                      type="button"
                      onClick={() => handleSelect(job)}
                      className={cn(
                        'px-3 py-2 rounded-lg text-sm transition-colors border text-left truncate',
                        targetRole === job
                          ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#8B5CF6] font-medium'
                          : 'bg-white text-gray-600 border-gray-100 hover:border-gray-300 hover:bg-gray-50',
                      )}
                      title={job}
                    >
                      {job}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Action buttons at bottom right */}
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
              <button
                type="button"
                onClick={handleGridConfirm}
                disabled={!targetRole}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-medium transition-colors",
                  targetRole
                    ? "bg-[#8B5CF6] text-white hover:bg-[#7C3AED]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                )}
              >
                确认
              </button>
            </div>
          </div>
        )}
      </div>
    </StepCard>
  );
};

/**
 * Highlights matched keyword in text with a colored span.
 */
function HighlightText({ text, keyword }: { text: string; keyword: string }): React.ReactElement {
  if (!keyword.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-[#7C3AED] font-medium">{text.slice(idx, idx + keyword.length)}</span>
      {text.slice(idx + keyword.length)}
    </>
  );
}
