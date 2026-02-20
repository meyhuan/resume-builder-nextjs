'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Check } from 'lucide-react';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  allowCustom?: boolean; // If true, shows a "Add custom" button (not implemented fully in this snippet but UI wise)
  maxItems?: number; // Optional limit
}

export const ChipGroup = ({
  options,
  selected,
  onChange,
  multiSelect = false,
  allowCustom = false
}: ChipGroupProps) => {

  const handleToggle = (option: string) => {
    if (multiSelect) {
      if (selected.includes(option)) {
        onChange(selected.filter(item => item !== option));
      } else {
        onChange([...selected, option]);
      }
    } else {
      onChange([option]);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <motion.button
            key={option}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(option)}
            className={cn(
              "px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border",
              isSelected
                ? "bg-[#EDE9FE] text-[#7C3AED] border-[#8B5CF6]"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            )}
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
            {option}
          </motion.button>
        );
      })}
      
      {allowCustom && (
         <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-dashed border-[#8B5CF6] text-[#7C3AED] bg-[#F5F3FF]/50 hover:bg-[#F5F3FF]"
          >
            <Plus className="w-4 h-4" />
            添加其他...
          </motion.button>
      )}
    </div>
  );
};
