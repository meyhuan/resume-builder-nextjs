import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingEditorDemo } from "@/components/landing/LandingEditorDemo";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingTemplates } from "@/components/landing/LandingTemplates";
import { LandingArticles } from "@/components/landing/LandingArticles";
import { LandingWhyFree } from "@/components/landing/LandingWhyFree";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { JsonLd } from "@/components/seo/JsonLd";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd />
      <LandingHeader />
      <main className="flex-grow">
        <LandingHero />
        <LandingEditorDemo id="editor-demo" />
        <LandingFeatures id="features" />
        <LandingTemplates id="templates" />
        <LandingArticles id="articles" />
        <LandingWhyFree id="why-free" />
        <LandingFAQ id="faq" />
      </main>
      <LandingFooter />
    </div>
  );
}
