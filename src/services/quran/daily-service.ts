import "server-only";

import { getQuranService } from "@/services/quran/quran-service";
import { getTranslationService } from "@/services/quran/translation-service";
import { listProviderChapters } from "@/services/quran/provider-data";
import { getQuranApiClient } from "@/services/quran/client";
import type { DailyAyahData } from "@/types/home";

function dayNumber(date: Date) {
  return Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000);
}

export async function getDailyAyah(date = new Date()): Promise<DailyAyahData> {
  const api = getQuranApiClient();
  if (api.status !== "ready") return { arabic: null, translation: null, surahName: null, ayahNumber: null };

  try {
    const chapters = await listProviderChapters(api.environment);
    const totalAyahs = chapters.reduce((total, chapter) => total + chapter.versesCount, 0);
    if (!totalAyahs) return { arabic: null, translation: null, surahName: null, ayahNumber: null };

    let target = dayNumber(date) % totalAyahs;
    let chapter = chapters[0];
    for (const candidate of chapters) {
      if (target < candidate.versesCount) {
        chapter = candidate;
        break;
      }
      target -= candidate.versesCount;
    }

    const surah = await getQuranService().getSurah(chapter.id);
    const ayah = surah.data?.ayahs.find(({ numberInSurah }) => numberInSurah === target + 1);
    if (!ayah) return { arabic: null, translation: null, surahName: null, ayahNumber: null };

    const resources = await getTranslationService().getAvailableTranslations();
    const resource = resources.data?.find(({ languageName }) => languageName.toLowerCase() === "english") ?? resources.data?.[0];
    if (!resource) return { arabic: ayah.arabicText, translation: null, surahName: chapter.nameSimple, ayahNumber: ayah.numberInSurah };

    const translations = await getTranslationService().getSurahTranslations(chapter.id, resource.id);
    const translation = translations.data?.find(({ verseKey }) => verseKey === ayah.verseKey);
    return {
      arabic: ayah.arabicText,
      translation: translation?.text ?? null,
      surahName: chapter.nameSimple,
      ayahNumber: ayah.numberInSurah,
    };
  } catch {
    return { arabic: null, translation: null, surahName: null, ayahNumber: null };
  }
}