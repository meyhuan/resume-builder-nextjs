import type { Metadata } from "next";
import { Inter, Noto_Sans_SC } from "next/font/google";
import "@/styles/tailwind.css";
import "@/styles/print.css";
import "@/styles/base.css";
import "@/styles/theme-override.css";

const inter = Inter({ subsets: ["latin"] });
const notoSansSC = Noto_Sans_SC({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Resume Builder",
  description: "Professional Resume Builder",
};

import { Toaster } from 'sonner';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${notoSansSC.className} antialiased`}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
