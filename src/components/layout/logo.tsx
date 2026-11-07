import Link from "next/link";

import {
  MARK_BODY,
  MARK_HEAD,
  MARK_RING,
  MARK_SHAFT,
  MARK_VIEWBOX,
} from "@/components/layout/brand-mark";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * The GetConfident mark. Colours come from --logo-ink / --logo-accent, which
 * flip between the on-light (navy + violet) and on-dark (white + light violet)
 * versions with the theme. Override them with a class for one-off surfaces.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={cn("size-8 shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d={MARK_RING.d}
        fill="none"
        stroke="var(--logo-ink)"
        strokeWidth={MARK_RING.strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={MARK_BODY}
        fill="var(--logo-ink)"
        stroke="var(--logo-ink)"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path
        d={MARK_SHAFT.d}
        stroke="var(--logo-accent)"
        strokeWidth={MARK_SHAFT.strokeWidth}
        strokeLinecap="round"
      />
      <path
        d={MARK_HEAD}
        fill="var(--logo-accent)"
        stroke="var(--logo-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "Get" in Medium 500, "Confident" in ExtraBold 800, tracking −3.5%. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-xl leading-none tracking-[-0.035em]", className)}>
      <span className="font-medium text-[var(--logo-accent)]">Get</span>
      <span className="font-extrabold text-[var(--logo-ink)]">Confident</span>
    </span>
  );
}

/**
 * Horizontal lockup. Below 340px wide the wordmark drops away and the mark
 * stands alone, per the brand guidelines.
 */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label={`${siteConfig.name} home`}
      className={cn(
        "inline-flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <LogoMark />
      <Wordmark className="hidden min-[340px]:inline" />
    </Link>
  );
}
