'use client';

import React from 'react';
import { useWizardStore, UserIdentity } from '@/state/wizard-store';
import { IDENTITY_OPTIONS } from '../constants';
import { StepCard } from '../wizard-layout';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Image from 'next/image';

const IDENTITY_ICONS: Record<string, string> = {
  student: '/icons/icon-student.png',
  graduate: '/icons/icon-graduate.png',
  professional: '/icons/icon-professional.png',
};

export const StepIdentity = ({ stepNumber = 1, onClickPast }: { stepNumber?: number; onClickPast?: () => void }) => {
  const { setIdentity, identity, nextStep, currentStep } = useWizardStore();
  const isCurrent = currentStep === stepNumber;

  const handleSelect = (id: string) => {
    setIdentity(id as UserIdentity);
    if (!isCurrent && onClickPast) {
      onClickPast();
      setTimeout(() => nextStep(), 400);
    } else if (isCurrent) {
      setTimeout(() => nextStep(), 400);
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="选择你的身份" onClickPast={onClickPast}>
      <div className="grid grid-cols-3 gap-6 mt-8">
        {IDENTITY_OPTIONS.map((option) => {
          const isSelected = identity === option.id;
          return (
            <motion.button
              key={option.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelect(option.id)}
              className={cn(
                "relative flex items-center h-20 rounded-xl border transition-all text-left cursor-pointer",
                isSelected 
                  ? "border-[#8B5CF6] bg-[#F5F3FF]" 
                  : "border-gray-200 bg-white hover:border-[#8B5CF6]/50 hover:bg-gray-50"
              )}
            >
              {/* Label Section - Left aligned */}
              <div className="flex-1 pl-8 z-10">
                <span className={cn(
                  "text-lg font-bold block mb-1",
                  isSelected ? "text-[#7C3AED]" : "text-gray-900"
                )}>
                  {option.label}
                </span>
              </div>

              {/* Image Section - Pop out effect */}
              <div className="absolute right-0 bottom-0 w-24 h-24">
                <div className="relative w-full h-full">
                  <Image 
                    src={IDENTITY_ICONS[option.id]} 
                    alt={option.label}
                    fill
                    className="object-contain object-bottom"
                    priority
                  />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </StepCard>
  );
};
