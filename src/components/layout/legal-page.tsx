import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

/** Shared shell for the privacy policy and terms pages. */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="container-page max-w-3xl py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {updated}</p>
        <div className="mt-10 space-y-8 text-[15px] leading-7 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

/** Contact line: the configured email, or account settings as a fallback. */
export function ContactLine() {
  return siteConfig.contactEmail ? (
    <a
      href={`mailto:${siteConfig.contactEmail}`}
      className="font-medium text-primary underline underline-offset-4"
    >
      {siteConfig.contactEmail}
    </a>
  ) : (
    <span>the contact details on our website</span>
  );
}
