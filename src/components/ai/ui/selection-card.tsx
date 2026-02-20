'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Image from 'next/image';

interface SelectionCardProps {
  label: string;
  imageSrc?: string;
  selected?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SelectionCard = ({
  label,
  imageSrc,
  selected,
  onClick,
  className
}: SelectionCardProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all w-full text-left",
        selected 
          ? "border-[#8B5CF6] bg-[#F5F3FF]" 
          : "border-transparent bg-white hover:bg-gray-50",
        className
      )}
    >
      {imageSrc && (
        <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 shrink-0">
          <Image 
            src={imageSrc} 
            alt={label}
            fill
            className="object-cover"
          />
        </div>
      )}
      
      <span className={cn(
        "font-semibold text-lg",
        selected ? "text-[#7C3AED]" : "text-gray-700"
      )}>
        {label}
      </span>

      {selected && (
        <div className="absolute top-0 right-0 p-2">
             <div className="bg-[#8B5CF6] rounded-bl-xl rounded-tr-lg p-1">
                <Check className="w-4 h-4 text-white" />
             </div>
        </div>
      )}
    </motion.button>
  );
};
