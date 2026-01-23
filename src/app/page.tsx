import { LandingHeader } from "@/components/landing/LandingHeader";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingTemplates } from "@/components/landing/LandingTemplates";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingFAQ } from "@/components/landing/LandingFAQ";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-grow">
        <LandingHero />
        <LandingTemplates id="templates" />
        <LandingFeatures id="features" />
        <LandingFAQ id="faq" />
      </main>
      <LandingFooter />
    </div>
  );
}
