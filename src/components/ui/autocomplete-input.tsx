"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { POPOVER_GAP, useStablePopoverPlacement } from "@/hooks/use-stable-popover-placement";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  aliases?: readonly string[];
}

interface AutocompleteInputProps extends Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AutocompleteOption[];
  emptyText?: string;
  listLabel?: string;
  minPopupWidth?: number;
  maxResults?: number;
}

const normalize = (text: string) => text.toLocaleLowerCase("zh-CN").replace(/\s+/g, "");

/** Suggestions assist typing; only an explicit selection replaces the user's text. */
export const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ value, onValueChange, options, className, emptyText = "没有匹配建议，可保留当前输入", listLabel = "填写建议", minPopupWidth = 0, maxResults = 80,
    onFocus, onBlur, onKeyDown, onCompositionStart, onCompositionEnd, ...props }, forwardedRef) => {
    const [open, setOpen] = React.useState(false);
    const [browse, setBrowse] = React.useState(false);
    const [composing, setComposing] = React.useState(false);
    const [active, setActive] = React.useState(-1);
    const anchor = React.useRef<HTMLSpanElement>(null);
    const input = React.useRef<HTMLInputElement>(null);
    const list = React.useRef<HTMLUListElement>(null);
    const listId = React.useId();
    const query = normalize(value.trim());
    const allMatches = React.useMemo(() => {
      if (browse || !query) return options;
      return options.filter(option => [option.label, option.value, ...(option.aliases ?? [])].some(text => normalize(text).includes(query)));
    }, [browse, query, options]);
    const matches = allMatches.slice(0, maxResults);
    const visible = open && !composing;
    const activeIndex = Math.min(active, matches.length - 1);
    const placement = useStablePopoverPlacement(anchor, visible, 248, minPopupWidth);

    React.useEffect(() => {
      const option = document.getElementById(`${listId}-${activeIndex}`);
      if (!visible || !list.current || !option) return;
      const itemRect = option.getBoundingClientRect(), listRect = list.current.getBoundingClientRect();
      if (itemRect.top < listRect.top) list.current.scrollTop -= listRect.top - itemRect.top;
      if (itemRect.bottom > listRect.bottom) list.current.scrollTop += itemRect.bottom - listRect.bottom;
    }, [visible, activeIndex, listId]);

    function choose(option: AutocompleteOption) {
      onValueChange(option.value);
      input.current?.focus();
      setOpen(false);
      setActive(-1);
    }

    return <Popover.Root open={visible} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <span ref={anchor} className="relative inline-flex min-w-0 w-full">
          <Input {...props} ref={node => {
            input.current = node;
            if (typeof forwardedRef === "function") forwardedRef(node);
            else if (forwardedRef) forwardedRef.current = node;
          }} autoComplete={props.autoComplete ?? "off"}
            role="combobox" aria-autocomplete="list" aria-controls={visible ? listId : undefined} aria-expanded={visible}
            aria-activedescendant={visible && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
            value={value} className={cn("pr-9 text-foreground", className)}
            onChange={event => { onValueChange(event.target.value); setBrowse(false); setActive(-1); setOpen(true); if (list.current) list.current.scrollTop = 0; }}
            onFocus={event => { onFocus?.(event); setBrowse(false); setActive(-1); setOpen(matches.length > 0); }}
            onBlur={event => { setOpen(false); setActive(-1); onBlur?.(event); }}
            onCompositionStart={event => { setComposing(true); onCompositionStart?.(event); }}
            onCompositionEnd={event => { setComposing(false); setActive(-1); setOpen(true); onCompositionEnd?.(event); }}
            onKeyDown={event => {
              if (composing || event.nativeEvent.isComposing || event.keyCode === 229) { event.stopPropagation(); return; }
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault(); event.stopPropagation(); setOpen(true);
                setActive(current => matches.length === 0 ? -1 : event.key === "ArrowDown" ? (current + 1) % matches.length : (current <= 0 ? matches.length - 1 : current - 1));
              } else if (event.key === "Enter" && visible && activeIndex >= 0) {
                event.preventDefault(); event.stopPropagation(); choose(matches[activeIndex]);
              } else if (event.key === "Escape" && visible) {
                event.preventDefault(); event.stopPropagation(); setOpen(false); setActive(-1);
              } else {
                if (event.key === "Tab") { setOpen(false); setActive(-1); }
                onKeyDown?.(event);
              }
            }} />
          <button type="button" tabIndex={-1} disabled={props.disabled} aria-label={`${visible ? "收起" : "展开"}${listLabel}`}
            onPointerDown={event => event.preventDefault()} onClick={event => {
              event.stopPropagation();
              if (visible) { setOpen(false); setActive(-1); }
              else { input.current?.focus(); setBrowse(true); setOpen(true); setActive(-1); }
            }}
            className="absolute inset-y-0 right-0 flex w-8 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground disabled:pointer-events-none">
            <ChevronDown aria-hidden="true" className={cn("h-4 w-4", visible && "rotate-180")} />
          </button>
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <Popover.Content align="start" alignOffset={placement.alignOffset} side={placement.side} sideOffset={POPOVER_GAP} avoidCollisions={false}
          style={{ maxHeight: placement.maxHeight, minWidth: minPopupWidth ? `min(${minPopupWidth}px, calc(100vw - 24px))` : undefined }}
          className="z-50 flex w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
          onEscapeKeyDown={event => event.preventDefault()}
          onInteractOutside={event => { if (anchor.current?.contains(event.detail.originalEvent.target as Node)) event.preventDefault(); }}
          onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}>
          <ul ref={list} id={listId} role="listbox" aria-label={listLabel} className="min-h-0 max-h-60 overflow-y-auto overscroll-contain">
            {matches.map((option, index) => <li key={option.value} id={`${listId}-${index}`} role="option" aria-label={`${option.label}${option.description ? ` ${option.description}` : ''}`} aria-selected={index === activeIndex}
              onPointerMove={() => setActive(index)} onPointerDown={event => event.preventDefault()} onClick={event => { event.stopPropagation(); choose(option); }}
              className={cn("flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2.5 text-sm leading-relaxed hover:bg-muted [overflow-wrap:anywhere]", index === activeIndex && "bg-muted")}>
              <span className="min-w-0"><span>{option.label}</span>{option.description && <span className="block text-xs font-normal text-muted-foreground">{option.description}</span>}</span>
              {option.value === value && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />}
            </li>)}
          </ul>
          {matches.length === 0 && <p role="status" className="px-3 py-3 text-sm leading-relaxed text-muted-foreground">{emptyText}</p>}
          {allMatches.length > maxResults && <p className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">继续输入以缩小范围</p>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>;
  },
);
AutocompleteInput.displayName = "AutocompleteInput";
