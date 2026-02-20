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
}

export const StepProjects = ({ stepNumber, title, options }: StepProjectsProps) => {
  const { projects, toggleProject, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;
  const displayOptions = options || PROJECT_OPTIONS;

  const handleNext = () => {
    nextStep();
  };

  return (
    <StepCard 
      stepNumber={stepNumber} 
      title={title || "请选出您参与过哪些项目 (可多选)"}
      onSkip={handleNext}
    >
      <div className="space-y-6">
        <ChipGroup
          options={displayOptions}
          selected={projects}
          onChange={(selected) => {
            // ChipGroup handles the toggle logic internally if we just pass the new array
            // But our store has a toggleProject method. 
            // We can either map the difference or just reimplement logic here.
            // Since ChipGroup in 'multiSelect' returns the full new array, 
            // we should probably update the store to accept 'setProjects' or adapt here.
            
            // Let's use the toggleProject from store by finding which one changed.
            // Actually, for simplicity, let's assume ChipGroup's onChange is fully compatible if we had setProjects.
            // But we have toggleProject.
            // Let's iterate and sync? No that's inefficient.
            
            // Let's just fix the Store to have setProjects?
            // Or just hack it here:
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
