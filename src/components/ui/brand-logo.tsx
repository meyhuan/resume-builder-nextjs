import React from 'react';
import type { ReactElement } from 'react';
import { ConceptDocStampGreen } from '@/components/ui/logo-concepts/concept-doc-stamp-green';

interface BrandLogoProps {
  readonly className?: string;
}

export function BrandLogo({ className }: BrandLogoProps): ReactElement {
  return <ConceptDocStampGreen className={className} />;
}
