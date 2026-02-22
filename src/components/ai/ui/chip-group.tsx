'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Plus, Check, X } from 'lucide-react';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiSelect?: boolean;
  allowCustom?: boolean;
  maxItems?: number;
}

export const ChipGroup = ({
  options,
  selected,
  onChange,
  multiSelect = false,
  allowCustom = false,
}: ChipGroupProps) => {
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<string>('');
  const [customChips, setCustomChips] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAddingCustom && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingCustom]);

  const handleToggle = (option: string): void => {
    if (multiSelect) {
      if (selected.includes(option)) {
        onChange(selected.filter((item) => item !== option));
      } else {
        onChange([...selected, option]);
      }
    } else {
      onChange([option]);
    }
  };

  const commitCustomValue = (): void => {
    const trimmed = customValue.trim();
    if (trimmed && !selected.includes(trimmed) && !options.includes(trimmed)) {
      setCustomChips((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
      if (multiSelect) {
        onChange([...selected, trimmed]);
      } else {
        onChange([trimmed]);
      }
    }
    setCustomValue('');
    setIsAddingCustom(false);
  };

  const handleCustomKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCustomValue();
    } else if (e.key === 'Escape') {
      setCustomValue('');
      setIsAddingCustom(false);
    }
  };

  const removeCustomChip = (chip: string): void => {
    setCustomChips((prev) => prev.filter((c) => c !== chip));
    onChange(selected.filter((s) => s !== chip));
  };

  const allOptions = [...options, ...customChips.filter((c) => !options.includes(c))];

  return (
    <div className="flex flex-wrap gap-3">
      {allOptions.map((option) => {
        const isSelected = selected.includes(option);
        const isCustom = customChips.includes(option);
        return (
          <motion.button
            key={option}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleToggle(option)}
            className={cn(
              'px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border',
              isSelected
                ? 'bg-[#EDE9FE] text-[#7C3AED] border-[#8B5CF6]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 text-gray-400" />}
            {option}
            {isCustom && isSelected && (
              <X
                className="w-3.5 h-3.5 ml-1 text-[#7C3AED] hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  removeCustomChip(option);
                }}
              />
            )}
          </motion.button>
        );
      })}

      {allowCustom && !isAddingCustom && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAddingCustom(true)}
          className="px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-dashed border-[#8B5CF6] text-[#7C3AED] bg-[#F5F3FF]/50 hover:bg-[#F5F3FF]"
        >
          <Plus className="w-4 h-4" />
          添加其他...
        </motion.button>
      )}

      {allowCustom && isAddingCustom && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-[#8B5CF6] bg-white">
          <input
            ref={inputRef}
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onBlur={commitCustomValue}
            onKeyDown={handleCustomKeyDown}
            placeholder="输入自定义内容"
            className="text-sm outline-none w-32 text-gray-700 placeholder:text-gray-400"
          />
        </div>
      )}
    </div>
  );
};
