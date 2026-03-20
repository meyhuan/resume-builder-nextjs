'use client';

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { RefreshCw } from 'lucide-react';
import genConfig from '../../../../files/gen_config.json';

export const StepAdditionalInfo = ({ stepNumber, onClickPast }: { stepNumber: number; onClickPast?: () => void }) => {
  const { additionalInfo, setAdditionalInfo, identity, workYears, currentStep } = useWizardStore();
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const isCurrent = currentStep === stepNumber;

  const recommendations = useMemo(() => {
    // The data structure is genConfig.data[0].config.material[0].element.extra
    const firstData = genConfig.data?.[0];
    const firstMaterial = firstData?.config?.material?.[0];
    const element = firstMaterial?.element as unknown as { extra?: Record<string, string[]> };
    const extra = element?.extra;
    
    if (!extra) return ['No relevant work experience yet — highlight strong learning ability'];

    if (identity === 'student') return extra.student || extra.low;
    if (identity === 'graduate') return extra.graduate || extra.low;
    
    // For professional, check work years
    if (workYears) {
      if (workYears.includes('Junior') || workYears.includes('1-3')) return extra.low;
      if (workYears.includes('Mid-level') || workYears.includes('3-5')) return extra.mid;
      if (workYears.includes('Senior') || workYears.includes('5-10')) return extra.high;
      if (workYears.includes('Expert') || workYears.includes('10+')) return extra.senior;
    }
    
    return extra.low || [];
  }, [identity, workYears]);

  const currentRecommendation = recommendations[recommendationIndex] || 'No relevant work experience yet — highlight strong learning ability';

  const handleRefresh = () => {
    if (recommendations.length > 0) {
      setRecommendationIndex((prev) => (prev + 1) % recommendations.length);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalInfo(e.target.value);
    if (!isCurrent && onClickPast) {
      onClickPast();
    }
  };

  const handleRecommendationClick = (text: string) => {
    setAdditionalInfo(text);
    if (!isCurrent && onClickPast) {
      onClickPast();
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="Anything else to add? Tell us more!" onClickPast={onClickPast}>
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={additionalInfo}
            onChange={handleTextChange}
            placeholder={currentRecommendation}
            className="w-full min-h-[150px] p-4 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all text-gray-700 placeholder:text-gray-400 text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
           <div className="flex items-center gap-4 text-xs text-gray-500 order-2 sm:order-1">
              <div className="flex items-center gap-1 flex-1">
                 <span className="text-[#8B5CF6] shrink-0">✨ Suggestion:</span>
                 <button 
                    onClick={() => handleRecommendationClick(currentRecommendation)}
                    className="hover:underline text-left line-clamp-1"
                 >
                    {currentRecommendation}
                 </button>
              </div>
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-1 hover:text-[#8B5CF6] transition-colors shrink-0 px-2 py-1 rounded-md hover:bg-[#F5F3FF]"
              >
                 <RefreshCw className="w-3.5 h-3.5" />
                 Refresh
              </button>
           </div>

           {/* 
           <div className="order-1 sm:order-2">
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto"
             >
               <Upload className="w-4 h-4" />
               {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : 'Reference files'}
             </button>
           </div>
           */}
        </div>
      </div>
    </StepCard>
  );
};
