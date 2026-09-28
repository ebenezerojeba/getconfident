import {
  BadgeDollarSign,
  Ban,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Flame,
  Medal,
  Presentation,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

/** Icons referenced by name from configuration (practice modes, achievements). */
const ICONS: Record<string, LucideIcon> = {
  BadgeDollarSign,
  Ban,
  BookOpen,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  Flame,
  Medal,
  Presentation,
  Rocket,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Zap,
};

export function NamedIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}
