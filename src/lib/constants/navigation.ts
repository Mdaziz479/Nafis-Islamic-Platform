import { ROUTES } from "@/lib/constants/routes";
import type { NavigationItem } from "@/types/navigation";

export const PRIMARY_NAVIGATION: NavigationItem[] = [
  { label: "Quran", href: ROUTES.quran },
  { label: "Duas", href: ROUTES.duas },
  { label: "Prayer", href: ROUTES.prayer },
  { label: "Ramadan", href: ROUTES.ramadan },
];

export const MORE_NAVIGATION: NavigationItem[] = [
  { label: "Qibla", href: ROUTES.qibla },
  { label: "Islamic calendar", href: ROUTES.calendar },
  { label: "Dashboard", href: ROUTES.dashboard },
  { label: "Settings", href: ROUTES.settings },
];