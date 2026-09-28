import { Providers } from "@/components/providers";

/**
 * Static marketing pages. They are prerendered, so there is no per-request
 * nonce; their CSP allows inline scripts (see src/middleware.ts).
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
