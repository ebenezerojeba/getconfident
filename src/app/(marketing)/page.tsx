import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";
import { Hero } from "@/features/marketing/hero";
import {
  FeedbackSection,
  FinalCta,
  HowItWorks,
  PracticeModes,
  ProgressSection,
  ValueProposition,
} from "@/features/marketing/sections";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} · ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
  // Link-preview tags and image are inherited from the root layout.
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    description: siteConfig.description,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    url: siteConfig.url,
  };
  return (
    <>
      <SiteHeader />
      <main id="main">
        <Hero />
        <ValueProposition />
        <HowItWorks />
        <PracticeModes />
        <FeedbackSection />
        <ProgressSection />
        <FinalCta />
      </main>
      <SiteFooter />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </>
  );
}
