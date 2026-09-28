import { NonceProviders } from "@/app/nonce-providers";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <NonceProviders>
      <div className="flex min-h-dvh flex-col bg-hero-glow">
        <header className="container-page flex h-16 items-center justify-between">
          <Logo />
          <ThemeToggle />
        </header>
        <main
          id="main"
          className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center"
        >
          <div className="w-full max-w-md">{children}</div>
        </main>
      </div>
    </NonceProviders>
  );
}
