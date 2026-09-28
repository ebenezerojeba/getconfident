import { AppMobileNav } from "@/components/layout/app-mobile-nav";
import { AppNavLinks } from "@/components/layout/app-nav-links";
import { Logo } from "@/components/layout/logo";
import { UserMenu } from "@/components/layout/user-menu";
import { NonceProviders } from "@/app/nonce-providers";
import { NotificationBell } from "@/components/layout/notification-bell";
import { ThemeSync } from "@/components/theme-sync";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

// Every page in this group is user-specific: never statically cache it.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [prefs, notifications] = await Promise.all([
    db.userPreferences.findUnique({ where: { userId: user.id }, select: { theme: true } }),
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
  ]);

  return (
    <NonceProviders>
      <div className="flex min-h-dvh">
        <ThemeSync theme={prefs?.theme ?? "SYSTEM"} />
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
          <div className="flex h-16 items-center px-5">
            <Logo href="/dashboard" />
          </div>
          <nav aria-label="App" className="flex-1 overflow-y-auto px-3 py-2">
            <AppNavLinks />
          </nav>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-2 border-b surface-glass px-4 sm:px-6">
            <div className="flex items-center gap-2">
              <AppMobileNav />
              <Logo href="/dashboard" className="lg:hidden" />
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell
                notifications={notifications.map((n) => ({
                  ...n,
                  readAt: n.readAt?.toISOString() ?? null,
                  createdAt: n.createdAt.toISOString(),
                }))}
              />
              <ThemeToggle />
              <UserMenu name={user.name} email={user.email} />
            </div>
          </header>
          <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </NonceProviders>
  );
}
