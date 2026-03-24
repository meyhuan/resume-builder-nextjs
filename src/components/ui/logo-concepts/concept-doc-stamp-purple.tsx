import { useId } from 'react';
import type { ReactElement } from 'react';

interface ConceptDocStampPurpleProps {
  readonly className?: string;
}

/**
 * AI Document + small purple shield stamp with checkmark.
 * Color: Deep purple — matches brand, trust + protection.
 */
export function ConceptDocStampPurple({ className }: ConceptDocStampPurpleProps): ReactElement {
  const gId: string = useId();
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id={gId} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C3AED" />
          <stop offset="1" stopColor="#E879F9" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="32" height="32" rx="10" fill={`url(#${gId})`} />
      <rect x="15" y="14" width="16" height="20" rx="3" fill="white" fillOpacity="0.92" />
      <rect x="18" y="19" width="8" height="1.5" rx="0.75" fill={`url(#${gId})`} fillOpacity="0.45" />
      <rect x="18" y="23" width="10" height="1.5" rx="0.75" fill={`url(#${gId})`} fillOpacity="0.3" />
      <rect x="18" y="27" width="6" height="1.5" rx="0.75" fill={`url(#${gId})`} fillOpacity="0.2" />
      <path d="M33 25L28 27.5V31.5C28 34 30 36 33 37C36 36 38 34 38 31.5V27.5L33 25Z" fill="#6D28D9" />
      <path d="M31 31L32.5 32.5L35.5 29.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
