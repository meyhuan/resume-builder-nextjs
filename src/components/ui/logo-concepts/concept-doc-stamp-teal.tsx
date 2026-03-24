import { useId } from 'react';
import type { ReactElement } from 'react';

interface ConceptDocStampTealProps {
  readonly className?: string;
}

/**
 * AI Document + small teal diamond stamp with arrow.
 * Color: Teal — fresh, modern, forward motion.
 */
export function ConceptDocStampTeal({ className }: ConceptDocStampTealProps): ReactElement {
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
      <rect x="28.8" y="25.8" width="8.5" height="8.5" rx="2" fill="#0D9488" transform="rotate(45 33 30)" />
      <path d="M31 30H35" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M33.5 28L35.5 30L33.5 32" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
