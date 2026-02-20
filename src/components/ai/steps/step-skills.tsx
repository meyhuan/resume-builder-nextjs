'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { SKILL_OPTIONS } from '../constants';

export const StepSkills = ({ stepNumber }: { stepNumber: number }) => {
  const { softSkills, toggleSoftSkill, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  // Helper to handle multi-select with ChipGroup's full array return vs Store's toggle
  const handleChange = (newSelected: string[]) => {
      // Find the item that was added or removed
      // We can just iterate SKILL_OPTIONS to see what changed, or just use the difference
      // Simple way:
      const added = newSelected.find(s => !softSkills.includes(s));
      const removed = softSkills.find(s => !newSelected.includes(s));
      
      if (added) toggleSoftSkill(added);
      if (removed) toggleSoftSkill(removed);
  };

  return (
    <StepCard 
      stepNumber={stepNumber} 
      title="请选择下方符合你的软技能 (可多选)"
      onSkip={nextStep}
    >
       <div className="space-y-6">
        <ChipGroup
          options={SKILL_OPTIONS}
          selected={softSkills}
          onChange={handleChange}
          multiSelect={true}
          allowCustom={true}
        />
        
        {isCurrent && (
          <div className="flex justify-end">
             <button 
                onClick={nextStep}
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
