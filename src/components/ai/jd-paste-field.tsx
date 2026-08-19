'use client';

import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type ReactElement,
  type TextareaHTMLAttributes,
} from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { useParseJdImage } from '@/lib/ai/use-parse-jd-image';
import { cn } from '@/lib/utils';

const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|bmp)$/i;

function firstImageFile(files: FileList | DataTransferItemList | null): File | null {
  if (!files) return null;
  for (let index = 0; index < files.length; index += 1) {
    const item = files[index];
    if (item instanceof File) {
      if (IMAGE_MIME.test(item.type) || /\.(png|jpe?g|webp|gif)$/i.test(item.name)) {
        return item;
      }
      continue;
    }
    const dataItem = item as DataTransferItem;
    if (dataItem.kind === 'file' && IMAGE_MIME.test(dataItem.type)) {
      return dataItem.getAsFile();
    }
  }
  return null;
}

function mergeJdText(current: string, extracted: string, maxLength: number): string {
  const next = current.trim() ? `${current.trim()}\n\n${extracted}` : extracted;
  return next.slice(0, maxLength);
}

type JdPasteFieldProps = {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly maxLength: number;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly autoFocus?: boolean;
  readonly className?: string;
  readonly hint?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange' | 'maxLength'>;

export function JdPasteField({
  value,
  onChange,
  maxLength,
  placeholder = '粘贴职位描述，或直接粘贴 BOSS 直聘等截图…',
  disabled,
  autoFocus,
  className,
  hint = 'BOSS 直聘无法复制时，截图后粘贴或上传到这里',
  ...textareaProps
}: JdPasteFieldProps): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef(value);
  const [isDragging, setIsDragging] = useState(false);
  const { isParsing, error, parseImage, clearError } = useParseJdImage();
  const busy = Boolean(disabled || isParsing);
  valueRef.current = value;

  const applyImage = useCallback(async (file: File): Promise<void> => {
    const extracted = await parseImage(file);
    if (!extracted) return;
    onChange(mergeJdText(valueRef.current, extracted, maxLength));
  }, [maxLength, onChange, parseImage]);

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>): void => {
    const image = firstImageFile(event.clipboardData?.items ?? null);
    if (!image) return;
    event.preventDefault();
    void applyImage(image);
  };

  const handleDrop = (event: DragEvent<HTMLTextAreaElement>): void => {
    event.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const image = firstImageFile(event.dataTransfer?.files ?? null);
    if (image) void applyImage(image);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void applyImage(file);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <textarea
          {...textareaProps}
          value={value}
          autoFocus={autoFocus}
          disabled={busy}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={(event) => {
            clearError();
            onChange(event.target.value.slice(0, maxLength));
          }}
          onPaste={handlePaste}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!busy) setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            isDragging ? 'border-violet-300 bg-violet-50/60' : null,
            className,
          )}
        />
        {isParsing ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/80 text-sm text-slate-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-violet-600" />
            正在识别截图中的职位描述…
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-slate-500">{hint}</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-violet-700 disabled:opacity-50"
        >
          <ImagePlus className="h-3.5 w-3.5" />
          上传截图
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
