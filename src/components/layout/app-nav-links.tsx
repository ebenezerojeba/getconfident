"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { appNav, isActiveNav } from "@/config/app-nav";
import { cn } from "@/lib/utils";

export function AppNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="flex flex-col gap-1">
      {appNav.map(({ title, href, icon: Icon }) => {
        const active = isActiveNav(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {title}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
