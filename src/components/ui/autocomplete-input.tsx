"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteInputProps
  extends Omit<React.ComponentPropsWithoutRef<"input">, "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly AutocompleteOption[];
  emptyText?: string;
}

export const AutocompleteInput = React.forwardRef<
  HTMLInputElement,
  AutocompleteInputProps
>(
  (
    {
      value,
      onValueChange,
      options,
      className,
      emptyText = "没有匹配选项，可直接使用当前输入",
      onFocus,
      onKeyDown,
      ...props
    },
    forwardedRef,
  ) => {
    const [open, setOpen] = React.useState(false);
    const [activeIndex, setActiveIndex] = React.useState(-1);
    const listboxId = React.useId();
    const normalizedQuery = value.trim().toLocaleLowerCase("zh-CN");
    const filteredOptions = React.useMemo(() => {
      if (!normalizedQuery) return options;
      return options.filter((option) =>
        `${option.label} ${option.value}`
          .toLocaleLowerCase("zh-CN")
          .includes(normalizedQuery),
      );
    }, [normalizedQuery, options]);

    React.useEffect(() => {
      setActiveIndex(-1);
    }, [normalizedQuery]);

    function selectOption(option: AutocompleteOption): void {
      onValueChange(option.value);
      setOpen(false);
      setActiveIndex(-1);
    }

    return (
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Anchor asChild>
          <div className="relative">
            <input
              {...props}
              ref={forwardedRef}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={open}
              aria-activedescendant={
                activeIndex >= 0
                  ? `${listboxId}-option-${activeIndex}`
                  : undefined
              }
              value={value}
              onChange={(event) => {
                onValueChange(event.target.value);
                setOpen(true);
              }}
              onFocus={(event) => {
                onFocus?.(event);
                setOpen(true);
              }}
              onKeyDown={(event) => {
                onKeyDown?.(event);
                if (event.defaultPrevented) return;

                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((current) =>
                    Math.min(current + 1, filteredOptions.length - 1),
                  );
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setOpen(true);
                  setActiveIndex((current) =>
                    current <= 0 ? filteredOptions.length - 1 : current - 1,
                  );
                } else if (event.key === "Enter" && open && activeIndex >= 0) {
                  event.preventDefault();
                  const option = filteredOptions[activeIndex];
                  if (option) selectOption(option);
                } else if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
              className={cn("pr-10", className)}
            />
            <button
              type="button"
              tabIndex={-1}
              aria-label={open ? "收起候选项" : "展开候选项"}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setOpen((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl text-slate-400 outline-none transition-colors hover:text-slate-700 active:bg-slate-100"
            >
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "h-4 w-4 transition-transform",
                  open && "rotate-180",
                )}
              />
            </button>
          </div>
        </PopoverPrimitive.Anchor>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="bottom"
            align="start"
            sideOffset={4}
            avoidCollisions={false}
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            className="z-50 max-h-64 w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-slate-700 shadow-lg outline-none"
          >
            <div id={listboxId} role="listbox" aria-label="候选项">
              {filteredOptions.length === 0 ? (
                <p className="px-3 py-2.5 text-sm text-slate-400">
                  {emptyText}
                </p>
              ) : (
                filteredOptions.map((option, index) => {
                  const selected = option.value === value;
                  const active = index === activeIndex;
                  return (
                    <button
                      key={option.value}
                      id={`${listboxId}-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => selectOption(option)}
                      className={cn(
                        "flex min-h-10 w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors",
                        active && "bg-violet-50 text-violet-800",
                        !active && "hover:bg-slate-50",
                      )}
                    >
                      <span>{option.label}</span>
                      {selected && (
                        <Check
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0 text-violet-600"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);

AutocompleteInput.displayName = "AutocompleteInput";
