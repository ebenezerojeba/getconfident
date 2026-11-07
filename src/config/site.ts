export const siteConfig = {
  name: "GetConfident",
  tagline: "AI Impromptu Speaking Coach",
  slogan: "Speak Clearly. Speak Confidently.",
  description:
    "Practise impromptu speaking out loud and get instant AI coaching on clarity, confidence, structure and filler words. Ace interviews, presentations and everyday conversations.",
  /**
   * Absolute site address, used for link previews, sitemaps and emails. Falls
   * back to the production domain Vercel provides, so shared links never point
   * at localhost if NEXT_PUBLIC_APP_URL is missing.
   */
  url:
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),
  /** Shown on the privacy and terms pages for data requests and questions. */
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
} as const;

export type NavItem = {
  title: string;
  href: string;
};

export const marketingNav: NavItem[] = [
  { title: "How it works", href: "/#how-it-works" },
  { title: "Practice modes", href: "/#modes" },
  { title: "AI feedback", href: "/#feedback" },
  { title: "Progress", href: "/#progress" },
];
