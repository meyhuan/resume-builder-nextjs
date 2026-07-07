import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingEditorDemo } from "@/components/landing/LandingEditorDemo";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingUseCases } from "@/components/landing/LandingUseCases";
import { LandingTemplates } from "@/components/landing/LandingTemplates";
import { LandingArticles } from "@/components/landing/LandingArticles";
import { LandingWhyFree } from "@/components/landing/LandingWhyFree";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicSiteStats } from "@/lib/public-site-stats";

const SITE_URL = "https://aijianli.cn";
export const revalidate = 60 * 60;

export const metadata: Metadata = {
  alternates: {
    canonical: SITE_URL,
  },
};

export default async function Home() {
  const publicSiteStats = await getPublicSiteStats();

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd />
      <LandingHeader />
      <main className="flex-grow">
        <LandingHero stats={publicSiteStats} />
        <LandingEditorDemo id="editor-demo" />
        <LandingFeatures id="features" />
        <LandingUseCases id="use-cases" />
        <LandingTemplates id="templates" />
        <LandingArticles id="articles" />
        <LandingWhyFree id="why-free" />
        <LandingFAQ id="faq" />
      </main>
      <LandingFooter />
    </div>
  );
}
