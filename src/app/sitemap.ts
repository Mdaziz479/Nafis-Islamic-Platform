import type { MetadataRoute } from "next";
import { ROUTES } from "@/lib/constants/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const publicRoutes = [
    ROUTES.home,
    ROUTES.quran,
    ROUTES.juz,
    ROUTES.prayer,
    ROUTES.qibla,
    ROUTES.calendar,
    ROUTES.ramadan,
    ROUTES.duas,
  ];

  return publicRoutes.map((path) => ({
    url: `${baseUrl}${path}`,
    changeFrequency: path === ROUTES.quran ? "daily" : "weekly",
    priority: path === ROUTES.home ? 1 : 0.7,
  }));
}