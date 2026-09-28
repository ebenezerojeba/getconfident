import { cn } from "@/lib/utils";

/**
 * Reveals content as it scrolls into view using CSS scroll-driven animations
 * (see `.reveal` in globals.css). Progressive enhancement: content is always
 * visible without JavaScript, in unsupported browsers and for users who prefer
 * reduced motion. Server-renderable (no client JS).
 */
export function FadeIn({
  delay = 0,
  className,
  style,
  ...props
}: React.ComponentProps<"div"> & { delay?: number }) {
  return (
    <div
      className={cn("reveal", className)}
      style={{ ...style, ["--reveal-delay" as string]: `${Math.round(delay * 100)}%` }}
      {...props}
    />
  );
}
