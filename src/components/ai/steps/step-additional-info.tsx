'use client';

import React, { useState, useMemo } from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { RefreshCw, Upload } from 'lucide-react';
import genConfig from '../../../../files/gen_config.json';

export const StepAdditionalInfo = ({ stepNumber, onClickPast }: { stepNumber: number; onClickPast?: () => void }) => {
  const { additionalInfo, setAdditionalInfo, uploadedFiles, setUploadedFiles, identity, workYears, currentStep } = useWizardStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const isCurrent = currentStep === stepNumber;

  const recommendations = useMemo(() => {
    // The data structure is genConfig.data[0].config.material[0].element.extra
    const firstData = genConfig.data?.[0];
    const firstMaterial = firstData?.config?.material?.[0];
    const element = firstMaterial?.element as unknown as { extra?: Record<string, string[]> };
    const extra = element?.extra;
    
    if (!extra) return ['无应聘岗位相关工作经验，突出极强的学习力'];

    if (identity === 'student') return extra.student || extra.low;
    if (identity === 'graduate') return extra.graduate || extra.low;
    
    // For professional, check work years
    if (workYears) {
      if (workYears.includes('初级') || workYears.includes('1-3年')) return extra.low;
      if (workYears.includes('中级') || workYears.includes('3-5年')) return extra.mid;
      if (workYears.includes('高级') || workYears.includes('5-10年')) return extra.high;
      if (workYears.includes('资深') || workYears.includes('10年+')) return extra.senior;
    }
    
    return extra.low || [];
  }, [identity, workYears]);

  const currentRecommendation = recommendations[recommendationIndex] || '无应聘岗位相关工作经验，突出极强的学习力';

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
      if (!isCurrent && onClickPast) {
        onClickPast();
      }
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="还有经历想补充吗？详细说说~" onClickPast={onClickPast}>
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
                 <span className="text-[#8B5CF6] shrink-0">✨ 推荐问：</span>
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
                 换一换
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
               {uploadedFiles.length > 0 ? `已选择 ${uploadedFiles.length} 个文件` : '参考文件'}
             </button>
           </div>
           */}
        </div>
      </div>
    </StepCard>
  );
};
