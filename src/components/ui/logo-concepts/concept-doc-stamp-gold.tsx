import { useId } from 'react';
import type { ReactElement } from 'react';

interface ConceptDocStampGoldProps {
  readonly className?: string;
}

/**
 * AI Document + small gold circle stamp with a star.
 * Color: Amber/gold — premium quality seal.
 */
export function ConceptDocStampGold({ className }: ConceptDocStampGoldProps): ReactElement {
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
      <circle cx="33" cy="30" r="6" fill="#D97706" />
      <path d="M33 26.5L34 28.6L36.3 28.9L34.6 30.5L35 32.8L33 31.7L31 32.8L31.4 30.5L29.7 28.9L32 28.6Z" fill="white" />
    </svg>
  );
}
