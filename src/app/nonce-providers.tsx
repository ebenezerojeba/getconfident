import { headers } from "next/headers";

import { Providers } from "@/components/providers";

/**
 * Providers for dynamically rendered route groups: forwards the per-request CSP
 * nonce (set in middleware) to next-themes' inline bootstrap script.
 */
export async function NonceProviders({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <Providers nonce={nonce}>{children}</Providers>;
}
