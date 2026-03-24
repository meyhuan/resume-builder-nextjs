import { useId } from 'react';
import type { ReactElement } from 'react';

interface ConceptDocStampGreenProps {
  readonly className?: string;
}

/**
 * AI Document + small green circle stamp with checkmark.
 * Color: Emerald green — universal "approved" color.
 */
export function ConceptDocStampGreen({ className }: ConceptDocStampGreenProps): ReactElement {
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
      <circle cx="33" cy="30" r="6" fill="#059669" />
      <path d="M30.5 30L32.2 31.7L35.5 28.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
