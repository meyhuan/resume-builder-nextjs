"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import screenshots from "@/features/extension-guide/screenshots.json";

export function GuideScreenshot({
  id,
  title,
  description,
}: {
  id: keyof typeof screenshots;
  title: string;
  description: string;
}) {
  const shot = screenshots[id];
  const [failed, setFailed] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);

  function picture(enlarged = false) {
    return (
      <div
        className="relative shrink-0"
        style={{ width: enlarged ? shot.width : "100%" }}
      >
        <Image
          src={shot.src}
          alt={title}
          width={shot.width}
          height={shot.height}
          unoptimized
          onError={() => setFailed(true)}
          className="block h-auto w-full"
        />
        {shot.hotspots.map((spot, index) => (
          <span
            key={spot.label}
            aria-hidden="true"
            className="pointer-events-none absolute rounded border-2 border-primary"
            style={{
              left: `${spot.x}%`,
              top: `${spot.y}%`,
              width: `${spot.width}%`,
              height: `${spot.height}%`,
            }}
          >
            <span className="absolute -left-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm ring-2 ring-white">
              {index + 1}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <figure className="mt-5 max-w-5xl overflow-hidden rounded-xl border border-border bg-background">
      <Dialog>
        <div className="flex flex-wrap items-center justify-between gap-x-4 border-b border-border px-4 py-2">
          <span className="text-sm font-semibold">{title}</span>
          <DialogTrigger asChild>
            <button
              type="button"
              disabled={failed}
              onClick={(event) => {
                opener.current = event.currentTarget;
              }}
              aria-label={`放大查看：${title}`}
              className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg px-2 text-sm text-primary hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
              放大查看
            </button>
          </DialogTrigger>
        </div>
        {failed ? (
          <p role="status" className="p-5 text-sm text-muted-foreground">
            示意截图暂时无法加载，可以继续按下方文字操作，或刷新页面重试。
          </p>
        ) : (
          <DialogTrigger asChild>
            <button
              type="button"
              aria-label={`打开截图：${title}`}
              onClick={(event) => {
                opener.current = event.currentTarget;
              }}
              className="block w-full cursor-zoom-in bg-slate-50 p-3 text-left hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <div
                className={
                  id === "plugin-fill" ? "mx-auto max-w-[460px]" : "w-full"
                }
              >
                {picture()}
              </div>
            </button>
          </DialogTrigger>
        )}
        <DialogContent
          hideCloseButton
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
          className="max-h-[90dvh] max-w-6xl gap-3 overflow-hidden p-4 sm:p-6"
        >
          <DialogTitle className="pr-12 text-left leading-7">
            {title}
          </DialogTitle>
          <DialogDescription className="text-left leading-6">
            原尺寸截图；窄屏可在图内横向滑动。按 Esc 或点击关闭返回步骤。
          </DialogDescription>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="关闭截图"
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </DialogClose>
          <div
            className="max-h-[65dvh] overflow-auto rounded-lg border border-border bg-slate-50 p-3"
            tabIndex={0}
            role="region"
            aria-label={`${title}原图`}
          >
            {picture(true)}
          </div>
        </DialogContent>
      </Dialog>
      <figcaption className="border-t border-border px-4 py-4">
        <ol className="flex flex-wrap gap-x-6 gap-y-3 text-sm leading-6">
          {shot.hotspots.map((spot, index) => (
            <li key={spot.label} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
              >
                {index + 1}
              </span>
              {spot.label}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </figcaption>
    </figure>
  );
}
