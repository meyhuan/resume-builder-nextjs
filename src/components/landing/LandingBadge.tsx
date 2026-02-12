import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'accent' | 'glass';
  className?: string;
}

export const LandingBadge: React.FC<BadgeProps> = ({ children, variant = 'primary', className }) => {
  const variants = {
    primary: 'bg-violet-500/10 text-violet-600 border-violet-500/20 backdrop-blur-sm',
    accent: 'bg-fuchsia-500/10 text-fuchsia-600 border-fuchsia-500/20 backdrop-blur-sm',
    glass: 'bg-white/30 text-white border-white/30 backdrop-blur-md shadow-sm',
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
