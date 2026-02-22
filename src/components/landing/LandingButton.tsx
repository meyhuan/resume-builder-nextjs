import React from 'react';
import { cn } from '@/lib/utils';

export interface LandingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const LandingButton = React.forwardRef<HTMLButtonElement, LandingButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading = false, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/50 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      primary: "bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-sm active:scale-[0.98]",
      secondary: "bg-white text-slate-800 hover:bg-slate-50 border border-slate-200 shadow-sm active:scale-[0.98]",
      outline: "border-2 border-[#8B5CF6]/20 bg-transparent hover:bg-[#8B5CF6]/5 text-[#8B5CF6] active:scale-[0.98]",
      ghost: "hover:bg-black/5 text-slate-600 hover:text-slate-900 active:scale-[0.98]",
      glass: "bg-white/60 backdrop-blur-md border border-white text-slate-700 hover:bg-white/80 hover:text-[#8B5CF6] shadow-sm active:scale-[0.98]"
    };

    const sizes = {
      sm: "h-9 px-4 text-xs rounded-lg",
      md: "h-11 px-6 text-sm rounded-xl",
      lg: "h-14 px-8 text-base rounded-2xl"
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            加载中...
          </span>
        ) : (
          <span className="flex items-center gap-2">{children}</span>
        )}
      </button>
    );
  }
);

LandingButton.displayName = 'LandingButton';
