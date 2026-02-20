'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { CAMPUS_ACTIVITY_OPTIONS } from '../constants';

interface StepCampusActivitiesProps {
  stepNumber: number;
}

export const StepCampusActivities = ({ stepNumber }: StepCampusActivitiesProps) => {
  const { campusActivities, toggleCampusActivity, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  const handleNext = () => {
    nextStep();
  };

  return (
    <StepCard 
      stepNumber={stepNumber} 
      title="请问你曾参与过哪些校园活动 (可多选)"
      onSkip={handleNext}
    >
      <div className="space-y-6">
        <ChipGroup
          options={CAMPUS_ACTIVITY_OPTIONS}
          selected={campusActivities}
          onChange={(selected) => {
             const current = new Set(campusActivities);
             const next = new Set(selected);
             // Find diff
             const changed = [...CAMPUS_ACTIVITY_OPTIONS].find(p => current.has(p) !== next.has(p));
             if (changed) toggleCampusActivity(changed);
             else {
                 // Custom addition
                 const newCustom = selected.find(s => !CAMPUS_ACTIVITY_OPTIONS.includes(s) && !current.has(s));
                 if (newCustom) toggleCampusActivity(newCustom);
             }
          }}
          multiSelect={true}
          allowCustom={true}
        />
        
        {isCurrent && (
          <div className="flex justify-end">
             <button 
                onClick={handleNext}
                className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
             >
                确认
             </button>
          </div>
        )}
      </div>
    </StepCard>
  );
};
