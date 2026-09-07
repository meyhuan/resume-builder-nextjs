import type { Metadata } from "next";
import { Suspense } from "react";
import ExtensionAuthorizeClient from "./authorize-client";

export const metadata: Metadata = {
  title: "连接浏览器插件",
  robots: { index: false, follow: false },
};

export default function ExtensionAuthorizePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">
          正在准备插件授权…
        </main>
      }
    >
      <ExtensionAuthorizeClient />
    </Suspense>
  );
}
