'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useWizardStore } from '@/state/wizard-store';
import { ChevronRight, Sparkles, User, RefreshCw, Paperclip, Check } from 'lucide-react';

export const WizardLayout = ({ children }: { children: React.ReactNode }) => {
  const { currentStep, totalSteps } = useWizardStore();

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center py-10 px-4">
      <div className="w-full max-w-3xl space-y-6">
         {/* We can add a global progress bar here if needed, but the design seems to split it per card */}
         
         <div className="space-y-6">
           {children}
         </div>

         {currentStep === totalSteps && (
           <div className="flex flex-col items-center pt-8 gap-4">
             <p className="text-gray-400 text-sm">已收到你的信息，点击生成简历</p>
             <button className="bg-[#8B5CF6] hover:bg-[#7C3AED] text-white px-8 py-3 rounded-full text-lg font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
               <Sparkles className="w-5 h-5" />
               生成简历
             </button>
           </div>
         )}
      </div>
    </div>
  );
};

export const StepCard = ({ 
  stepNumber, 
  title, 
  children, 
  isActive,
  onSkip
}: { 
  stepNumber: number; 
  title: string; 
  children: React.ReactNode;
  isActive?: boolean;
  onSkip?: () => void;
}) => {
  const { currentStep, totalSteps } = useWizardStore();
  
  // Show if it's the current step or a previous step
  
  const isPast = stepNumber < currentStep;
  const isCurrent = stepNumber === currentStep;
  
  if (stepNumber > currentStep) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">{stepNumber}/{totalSteps}</span>
            <h2 className="text-gray-800 font-bold text-lg">{title}</h2>
          </div>
          {onSkip && isCurrent && (
            <button 
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              跳过
            </button>
          )}
        </div>
        
        {children}
      </div>
    </motion.div>
  );
};

export const ChatBubble = ({ 
  content, 
  isUser = false 
}: { 
  content: string; 
  isUser?: boolean; 
}) => {
  if (!content) return null;
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "flex w-full mb-6",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn(
        "px-5 py-3 rounded-2xl max-w-[80%] text-sm font-medium",
        isUser 
          ? "bg-[#D8B4FE] text-[#4C1D95] rounded-tr-none" 
          : "bg-white border border-gray-100 shadow-sm text-gray-700 rounded-tl-none"
      )}>
        {content}
      </div>
    </motion.div>
  );
};
