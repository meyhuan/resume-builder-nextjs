import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const LandingButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const variants = {
      primary: 'bg-gradient-to-r from-[#a855f7] to-[#f23a70] text-white shadow-[0_10px_15px_rgba(168,85,247,0.25)] hover:brightness-105 hover:scale-105 hover:shadow-[0_15px_25px_rgba(168,85,247,0.35)]',
      secondary: 'bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white shadow-[0_10px_15px_rgba(34,197,94,0.25)] hover:brightness-105 hover:scale-105 hover:shadow-[0_15px_25px_rgba(34,197,94,0.35)]',
      outline: 'border-2 border-[#a855f7] text-[#a855f7] bg-transparent hover:bg-[#a855f7]/10',
      ghost: 'text-[#9333ea] bg-transparent hover:bg-[#a855f7]/10',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
          variants[variant],
          sizes[size],
          loading && 'pointer-events-none',
          className
        )}
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
