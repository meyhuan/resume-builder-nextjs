'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { WORK_YEARS_OPTIONS } from '../constants';

export const StepWorkYears = ({ stepNumber, onClickPast }: { stepNumber: number; onClickPast?: () => void }) => {
  const { setWorkYears, workYears, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  const handleSelect = (val: string) => {
    setWorkYears(val);
    if (!isCurrent && onClickPast) {
      onClickPast();
      setTimeout(() => nextStep(), 400);
    } else if (isCurrent) {
      setTimeout(() => nextStep(), 400);
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="Select Your Experience Level" onClickPast={onClickPast}>
       <div className="space-y-6">
        <ChipGroup
          options={WORK_YEARS_OPTIONS}
          selected={workYears ? [workYears] : []}
          onChange={(selected) => selected[0] && handleSelect(selected[0])}
        />
      </div>
    </StepCard>
  );
};
