'use client';

import React, { useState, useMemo} from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { MAJOR_HOT_PICKS } from '../constants';
import { searchMajors } from '../data/majors';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const StepMajor = ({ stepNumber, onClickPast }: { stepNumber: number; onClickPast?: () => void }) => {
  const { setMajor, major, nextStep, currentStep } = useWizardStore();
  const [searchValue, setSearchValue] = useState<string>(major || '');
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const isCurrent: boolean = currentStep === stepNumber;

  const searchResults: string[] = useMemo(() => {
    if (!searchValue.trim()) return [];
    const kw = searchValue.trim();
    const matches = searchMajors(kw);
    // Include user's custom input as the first option if it's not already in the matches
    if (!matches.some(m => m.toLowerCase() === kw.toLowerCase())) {
      return [kw, ...matches];
    }
    return matches;
  }, [searchValue]);

  const handleSelect = (value: string): void => {
    setMajor(value);
    setSearchValue(value);
    setShowDropdown(false);
    if (!isCurrent && onClickPast) {
      onClickPast();
      setTimeout(() => nextStep(), 400);
    } else if (isCurrent) {
      setTimeout(() => nextStep(), 400);
    }
  };

  const handleConfirmSearch = (): void => {
    if (searchValue.trim()) {
      handleSelect(searchValue.trim());
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="Select Your Major" onSkip={nextStep} onClickPast={onClickPast}>
      <div className="space-y-4 relative">
        {/* Search bar */}
        <div className="flex items-center gap-2 relative z-10">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search majors"
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
                  setMajor('');
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
              Confirm
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {showDropdown && searchValue.trim() && searchResults.length > 0 && (
          <div className="absolute top-[48px] left-0 right-[84px] border border-gray-200 rounded-lg bg-white shadow-lg max-h-56 overflow-y-auto z-20">
            {searchResults.slice(0, 30).map((m, idx) => (
              <button
                key={`${m}-${idx}`}
                type="button"
                onClick={() => handleSelect(m)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm hover:bg-[#F5F3FF] transition-colors text-gray-700',
                  major === m && 'bg-[#F5F3FF] text-[#7C3AED] font-medium',
                )}
              >
                {idx === 0 && m === searchValue.trim() ? (
                  <span className="text-[#7C3AED] font-medium">Use custom: {m}</span>
                ) : (
                  <HighlightText text={m} keyword={searchValue} />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Hot picks always shown in default view */}
        <div className="flex flex-wrap gap-3">
          {MAJOR_HOT_PICKS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => handleSelect(m)}
              className={cn(
                'px-6 py-3 rounded-lg text-sm font-medium transition-colors border',
                major === m
                  ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#8B5CF6]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              {m}
            </button>
          ))}
        </div>
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
