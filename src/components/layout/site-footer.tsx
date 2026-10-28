import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { siteConfig } from "@/config/site";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { title: "How it works", href: "/#how-it-works" },
      { title: "Practice modes", href: "/#modes" },
      { title: "AI feedback", href: "/#feedback" },
    ],
  },
  {
    heading: "Account",
    links: [
      { title: "Sign in", href: "/sign-in" },
      { title: "Create account", href: "/sign-up" },
      { title: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { title: "Privacy policy", href: "/privacy" },
      { title: "Terms of service", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-3">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">{siteConfig.description}</p>
        </div>
        {footerLinks.map((group) => (
          <div key={group.heading} className="space-y-3">
            <h2 className="text-sm font-semibold">{group.heading}</h2>
            <ul className="space-y-2">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="container-page border-t py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} {siteConfig.name}. Built for people who want to speak with
        confidence.
      </div>
    </footer>
  );
}
