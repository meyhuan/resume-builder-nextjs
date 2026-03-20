'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { PROJECT_OPTIONS } from '../constants';

interface StepProjectsProps {
  stepNumber: number;
  title?: string;
  options?: string[];
  onClickPast?: () => void;
}

export const StepProjects = ({ stepNumber, title, options, onClickPast }: StepProjectsProps) => {
  const { projects, toggleProject, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;
  const displayOptions = options || PROJECT_OPTIONS;

  const handleNext = () => {
    if (!isCurrent && onClickPast) {
      onClickPast();
    }
    nextStep();
  };

  return (
    <StepCard 
      stepNumber={stepNumber} 
      title={title || "Select projects you've worked on (multi-select)"}
      onSkip={handleNext}
      onClickPast={onClickPast}
    >
      <div className="space-y-6">
        <ChipGroup
          options={displayOptions}
          selected={projects}
          onChange={(selected) => {
             const current = new Set(projects);
             const next = new Set(selected);
             // Find diff
             const changed = [...displayOptions].find(p => current.has(p) !== next.has(p));
             if (changed) toggleProject(changed);
             else {
                 // Might be a custom addition
                 const newCustom = selected.find(s => !displayOptions.includes(s) && !current.has(s));
                 if (newCustom) toggleProject(newCustom);
             }

             if (!isCurrent && onClickPast) {
               onClickPast();
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
                Confirm
             </button>
          </div>
        )}
      </div>
    </StepCard>
  );
};
