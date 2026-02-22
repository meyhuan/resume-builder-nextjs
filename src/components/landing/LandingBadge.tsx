import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'glass';
  className?: string;
}

export const LandingBadge: React.FC<BadgeProps> = ({ children, variant = 'primary', className }) => {
  const variants = {
    primary: 'bg-[#8B5CF6]/10 text-[#8B5CF6] border-transparent shadow-none',
    accent: 'bg-rose-500/10 text-rose-500 border-transparent shadow-none',
    glass: 'bg-white/60 backdrop-blur-md border border-white text-slate-700 shadow-sm',
  };

  return (
    <span className={cn(
      'px-3 py-1 rounded-lg text-xs font-semibold border',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};
