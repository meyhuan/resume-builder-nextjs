import { useId } from 'react';
import type { ReactElement } from 'react';

interface ConceptDocStampBlueProps {
  readonly className?: string;
}

/**
 * AI Document + small blue rounded-square stamp with "P" letter.
 * Color: Indigo blue — tech-forward, modern.
 */
export function ConceptDocStampBlue({ className }: ConceptDocStampBlueProps): ReactElement {
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
      <rect x="27" y="24" width="12" height="12" rx="3.5" fill="#4F46E5" />
      <text x="33" y="33" textAnchor="middle" fill="white" fontSize="8" fontWeight="800" fontFamily="Arial, sans-serif">P</text>
    </svg>
  );
}
