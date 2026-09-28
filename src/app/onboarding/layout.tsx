import { NonceProviders } from "@/app/nonce-providers";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <NonceProviders>{children}</NonceProviders>;
}
