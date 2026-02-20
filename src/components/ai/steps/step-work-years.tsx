'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { WORK_YEARS_OPTIONS } from '../constants';

export const StepWorkYears = ({ stepNumber }: { stepNumber: number }) => {
  const { setWorkYears, workYears, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  const handleSelect = (val: string) => {
    setWorkYears(val);
    if (isCurrent) {
        setTimeout(() => nextStep(), 400);
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="请选择经历的工作年限">
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
