'use client';

import type { ReactElement } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TRANSLATE_LANGUAGES = [
  { value: 'zh', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'ru', label: 'Русский' },
  { value: 'ar', label: 'العربية' },
] as const;

export type TranslateLanguage = (typeof TRANSLATE_LANGUAGES)[number]['value'];

export function LanguageSelect(props: {
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly disabled?: boolean;
}): ReactElement {
  return (
    <Select value={props.value} onValueChange={props.onValueChange} disabled={props.disabled}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TRANSLATE_LANGUAGES.map((language) => (
          <SelectItem key={language.value} value={language.value}>
            {language.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
