'use client';

import { useState, useMemo, type ReactElement } from 'react';
import {
  extractDataConfirmationItems,
  fillPlaceholderAt,
  removePlaceholderAt,
} from '@/lib/ai/output-guards';
import { Check, Trash2, Sparkles } from 'lucide-react';

export interface DataConfirmationChipsProps {
  readonly html: string;
  readonly onChange: (nextHtml: string) => void;
  readonly compact?: boolean;
}

/**
 * Interactive "待确认数据" (Data Confirmation) chips for single-module AI polish.
 * Detects every `[X]` placeholder in the polished HTML, displays context chips,
 * and allows the user to fill in real numbers or remove unquantifiable clauses
 * with zero extra LLM calls.
 */
export function DataConfirmationChips(
  props: DataConfirmationChipsProps,
): ReactElement | null {
  const { html, onChange, compact = false } = props;
  const items = useMemo(() => extractDataConfirmationItems(html), [html]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [inputValue, setInputValue] = useState<string>('');

  if (items.length === 0) {
    return null;
  }

  const activeIdx =
    selectedIndex !== null && selectedIndex < items.length ? selectedIndex : null;
  const activeItem = activeIdx !== null ? items[activeIdx] : null;

  const handleConfirm = (idx: number): void => {
    const val = inputValue.trim();
    if (!val) return;
    const nextHtml = fillPlaceholderAt(html, idx, val);
    onChange(nextHtml);
    setInputValue('');
    setSelectedIndex(0);
  };

  const handleRemove = (idx: number): void => {
    const nextHtml = removePlaceholderAt(html, idx);
    onChange(nextHtml);
    setInputValue('');
    setSelectedIndex(0);
  };

  return (
    <div
      data-testid="data-confirmation-chips"
      className={`mt-3 rounded-xl border border-amber-200/90 bg-amber-50/60 ${
        compact ? 'p-2.5' : 'p-3'
      } space-y-2.5 transition-all`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
          <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <span>待确认数据（{items.length} 处 [X] 需确认）</span>
        </div>
        <span className="text-[11px] text-amber-700/80">
          点击芯片填入真实数字或移除
        </span>
      </div>

      {/* Chips row */}
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, idx) => {
          const isSelected = activeIdx === idx;
          return (
            <button
              key={`${item.index}-${item.label}`}
              type="button"
              onClick={(): void => {
                setSelectedIndex(idx);
                setInputValue('');
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
                isSelected
                  ? 'border-violet-500 bg-violet-600 text-white shadow-xs'
                  : 'border-amber-300 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50/50'
              }`}
            >
              <span
                className={`font-mono text-[11px] px-1 rounded ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                [X]
              </span>
              <span className="truncate max-w-[200px]">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active inline editor for selected chip */}
      {activeItem && (
        <div className="rounded-lg bg-white border border-slate-200 p-2.5 space-y-2 shadow-2xs">
          <div className="text-[11px] text-slate-600 flex items-center justify-between">
            <span>
              当前项：<strong className="text-slate-800">{activeItem.label}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={inputValue}
              onChange={(e): void => setInputValue(e.target.value)}
              onKeyDown={(e): void => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConfirm(activeItem.index);
                }
              }}
              placeholder={activeItem.hint}
              className="flex-1 h-8 rounded-lg border border-slate-200 px-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/30"
              autoFocus
            />
            <button
              type="button"
              onClick={(): void => handleConfirm(activeItem.index)}
              disabled={!inputValue.trim()}
              className="h-8 px-3 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-40 inline-flex items-center gap-1 shrink-0 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
              填入
            </button>
            <button
              type="button"
              onClick={(): void => handleRemove(activeItem.index)}
              title="没有这项数据，转为定性表述"
              className="h-8 px-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-100 hover:text-slate-800 inline-flex items-center gap-1 shrink-0 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
              不写此数据
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
