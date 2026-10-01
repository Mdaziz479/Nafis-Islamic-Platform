import "server-only";

import { unstable_cache } from "next/cache";
import { isValidChapterId, type ApiParams } from "@quranjs/api";
import type {
  Chapter,
  LanguageResource,
  TranslationResource as ProviderTranslationResource,
  Verse,
} from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import type { QuranFoundationEnvironment } from "@/services/quran/config";

export const VERSES_PER_PAGE = 50;

const getCachedChapters = unstable_cache(
  async (environment: QuranFoundationEnvironment): Promise<Chapter[]> => {
    const result = getQuranApiClient();
    if (result.status !== "ready" || result.environment !== environment) {
      throw new Error("Quran Foundation client is unavailable.");
    }

    return result.client.content.v4.chapters.list();
  },
  ["quran-foundation-content-v4-chapters"],
  { revalidate: 86400, tags: ["quran-foundation-chapters"] },
);

const getCachedVersePage = unstable_cache(
  async (
    environment: QuranFoundationEnvironment,
    chapterId: number,
    page: number,
    translationResourceId: number | null,
    includeWords: boolean,
  ): Promise<Verse[]> => {
    const result = getQuranApiClient();
    if (result.status !== "ready" || result.environment !== environment) {
      throw new Error("Quran Foundation client is unavailable.");
    }
    if (!isValidChapterId(chapterId)) {
      throw new Error("Invalid Quran Foundation chapter ID.");
    }

    const query: ApiParams = {
      page,
      perPage: VERSES_PER_PAGE,
      fields: { textUthmani: true },
    };
    if (translationResourceId !== null) {
      query.translations = [translationResourceId];
      query.translationFields = {
        resourceName: true,
        verseId: true,
        languageId: true,
        languageName: true,
        verseKey: true,
        chapterId: true,
        verseNumber: true,
      };
    }
    if (includeWords) query.words = true;

    return result.client.content.v4.verses.byChapter(chapterId, query);
  },
  ["quran-foundation-content-v4-verse-page"],
  { revalidate: 86400, tags: ["quran-foundation-verses"] },
);

const getCachedTranslationResources = unstable_cache(
  async (
    environment: QuranFoundationEnvironment,
  ): Promise<ProviderTranslationResource[]> => {
    const result = getQuranApiClient();
    if (result.status !== "ready" || result.environment !== environment) {
      throw new Error("Quran Foundation client is unavailable.");
    }

    return result.client.content.v4.resources.translations.list();
  },
  ["quran-foundation-content-v4-translation-resources"],
  { revalidate: 86400, tags: ["quran-foundation-translation-resources"] },
);

const getCachedLanguages = unstable_cache(
  async (environment: QuranFoundationEnvironment): Promise<LanguageResource[]> => {
    const result = getQuranApiClient();
    if (result.status !== "ready" || result.environment !== environment) {
      throw new Error("Quran Foundation client is unavailable.");
    }

    return result.client.content.v4.resources.languages.list();
  },
  ["quran-foundation-content-v4-languages"],
  { revalidate: 86400, tags: ["quran-foundation-languages"] },
);

export function listProviderChapters(environment: QuranFoundationEnvironment) {
  return getCachedChapters(environment);
}

export function getProviderVersePage(
  environment: QuranFoundationEnvironment,
  chapterId: number,
  page: number,
  translationResourceId: number | null = null,
  includeWords = false,
) {
  return getCachedVersePage(
    environment,
    chapterId,
    page,
    translationResourceId,
    includeWords,
  );
}

export function listProviderTranslationResources(
  environment: QuranFoundationEnvironment,
) {
  return getCachedTranslationResources(environment);
}

export function listProviderLanguages(environment: QuranFoundationEnvironment) {
  return getCachedLanguages(environment);
}