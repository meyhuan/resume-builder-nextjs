"use client";

import Link from "next/link";
import { Puzzle } from "lucide-react";
import { track } from "@/lib/analytics";

export function ExtensionGuideLink({
  source,
  label = "安装与使用插件",
}: {
  source: "application_profile" | "applications" | "authorization_empty";
  label?: string;
}) {
  return (
    <Link
      href="/extension"
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        try {
          track("extension_guide_open", { entry: source });
        } catch {
          /* Navigation must work without analytics storage. */
        }
      }}
      className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-border bg-background px-4 text-sm font-medium text-primary hover:bg-muted active:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Puzzle className="h-4 w-4" aria-hidden="true" />
      {label}
      <span className="sr-only">（新窗口）</span>
    </Link>
  );
}
