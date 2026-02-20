'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { ChipGroup } from '../ui/chip-group';
import { CERTIFICATE_OPTIONS } from '../constants';

export const StepCertificates = ({ stepNumber }: { stepNumber: number }) => {
  const { certificates, toggleCertificate, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  const handleChange = (newSelected: string[]) => {
      const added = newSelected.find(s => !certificates.includes(s));
      const removed = certificates.find(s => !newSelected.includes(s));
      
      if (added) toggleCertificate(added);
      if (removed) toggleCertificate(removed);
  };

  return (
    <StepCard 
      stepNumber={stepNumber} 
      title="请填写你获得的资格证书 (可多选)"
      onSkip={nextStep}
    >
       <div className="space-y-6">
        <ChipGroup
          options={CERTIFICATE_OPTIONS}
          selected={certificates}
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
