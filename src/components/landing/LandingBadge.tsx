import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent';
  className?: string;
}

export const LandingBadge: React.FC<BadgeProps> = ({ children, variant = 'primary', className }) => {
  const variants = {
    primary: 'bg-[#a855f7]/10 text-[#a855f7] border-[#a855f7]/20',
    accent: 'bg-[#f23a70]/10 text-[#f23a70] border-[#f23a70]/20',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-full text-xs font-semibold border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
