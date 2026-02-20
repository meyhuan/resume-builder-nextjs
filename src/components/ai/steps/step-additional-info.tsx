'use client';

import React from 'react';
import { useWizardStore } from '@/state/wizard-store';
import { StepCard } from '../wizard-layout';
import { RefreshCw, Upload } from 'lucide-react';

export const StepAdditionalInfo = ({ stepNumber }: { stepNumber: number }) => {
  const { additionalInfo, setAdditionalInfo, uploadedFiles, setUploadedFiles } = useWizardStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  return (
    <StepCard stepNumber={stepNumber} title="还有经历想补充吗？详细说说~">
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            placeholder="无应聘岗位相关工作经验，突出极强的学习力"
            className="w-full min-h-[150px] p-4 rounded-xl border border-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/20 focus:border-[#8B5CF6] transition-all text-gray-700 placeholder:text-gray-400"
          />
        </div>

        <div className="flex items-center justify-between">
           <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              multiple 
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
           >
             <Upload className="w-4 h-4" />
             {uploadedFiles.length > 0 ? `已选择 ${uploadedFiles.length} 个文件` : '参考文件'}
           </button>
           
           <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                 <span className="text-[#8B5CF6]">✨ 推荐问：</span>
                 <button 
                    onClick={() => setAdditionalInfo("无应聘岗位相关工作经验，突出极强的学习力")}
                    className="hover:underline text-left"
                 >
                    无应聘岗位相关工作经验，突出极强的学习力
                 </button>
              </div>
              <button className="flex items-center gap-1 hover:text-gray-700">
                 <RefreshCw className="w-3 h-3" />
                 换一换
              </button>
           </div>
        </div>
      </div>
    </StepCard>
  );
};
