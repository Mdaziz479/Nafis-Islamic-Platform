import { ROUTES } from "@/lib/constants/routes";
import type { QuickAccessItem } from "@/types/home";

export const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { title: "Quran", description: "Reading library", href: ROUTES.quran, mark: "Q" },
  { title: "Duas", description: "Sourced supplications", href: ROUTES.duas, mark: "D" },
  { title: "Prayer Times", description: "Local schedule", href: ROUTES.prayer, mark: "P" },
  { title: "Qibla", description: "Direction tool", href: ROUTES.qibla, mark: "Q" },
  { title: "Islamic Calendar", description: "Calendar view", href: ROUTES.calendar, mark: "31" },
  { title: "Ramadan", description: "Seasonal space", href: ROUTES.ramadan, mark: "R" },
];

