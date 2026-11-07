import {
  BarChart3,
  History,
  LayoutDashboard,
  LineChart,
  Mic,
  Settings,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type AppNavItem = { title: string; href: string; icon: LucideIcon };

export const appNav: AppNavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Practice", href: "/practice", icon: Mic },
  { title: "History", href: "/history", icon: History },
  { title: "Progress", href: "/progress", icon: LineChart },
  { title: "Achievements", href: "/achievements", icon: Trophy },
  { title: "Settings", href: "/settings", icon: Settings },
];

/** Shown only to admins (ADMIN_EMAILS); the page itself is also guarded server-side. */
export const adminNavItem: AppNavItem = { title: "Admin", href: "/admin", icon: BarChart3 };

export function isActiveNav(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
