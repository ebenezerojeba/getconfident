export const siteConfig = {
  name: "Comm Coach",
  tagline: "AI Impromptu Speaking Coach",
  description:
    "Practice impromptu speaking with random topics, a focused timer and instant AI feedback on clarity, confidence, structure and filler words.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
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
