'use client';

import React, { useState } from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { MAJOR_OPTIONS } from '../constants';
import { Search } from 'lucide-react';

export const StepMajor = ({ stepNumber }: { stepNumber: number }) => {
  const { setMajor, major, nextStep, currentStep } = useWizardStore();
  const [searchValue, setSearchValue] = useState('');
  const isCurrent = currentStep === stepNumber;

  const handleSelect = (value: string) => {
    setMajor(value);
    if (isCurrent) {
        setTimeout(() => nextStep(), 400);
    }
  };

  const filteredOptions = MAJOR_OPTIONS.filter(opt => 
    opt.includes(searchValue)
  );

  return (
    <StepCard stepNumber={stepNumber} title="选择你所学的专业">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="搜索专业"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all"
             onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue) {
                    handleSelect(searchValue);
                }
            }}
          />
        </div>

        <ChipGroup
          options={filteredOptions}
          selected={major ? [major] : []}
          onChange={(selected) => selected[0] && handleSelect(selected[0])}
        />
      </div>
    </StepCard>
  );
};
