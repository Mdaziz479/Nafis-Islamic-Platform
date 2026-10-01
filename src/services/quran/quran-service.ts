import "server-only";

import { getQuranApiClient } from "@/services/quran/client";
import { configurationFailure, incompleteProviderData, providerFailure } from "@/services/quran/errors";
import { getProviderVersePage, listProviderChapters, VERSES_PER_PAGE } from "@/services/quran/provider-data";
import type {
  AyahWordData,
  QuranResponse,
  Surah,
  SurahWithAyahs,
} from "@/types/quran";

export interface QuranService {
  listSurahs(): Promise<QuranResponse<Surah[]>>;
  getSurah(surahId: number): Promise<QuranResponse<SurahWithAyahs>>;
  getSurahWords(surahId: number): Promise<QuranResponse<AyahWordData[]>>;
}

const QURAN_SOURCE = {
  provider: "Quran Foundation Content API",
  attributionUrl: "https://quran.foundation/",
};

class QuranFoundationService implements QuranService {
  async listSurahs(): Promise<QuranResponse<Surah[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);

    try {
      const chapters = await listProviderChapters(api.environment);
      return {
        data: chapters.map((chapter) => ({
          id: chapter.id,
          nameArabic: chapter.nameArabic,
          nameEnglish: chapter.nameSimple,
          transliteration: chapter.transliteratedName,
          bismillahPre: chapter.bismillahPre,
          bismillahText: null,
          ayahCount: chapter.versesCount,
          revelationType: chapter.revelationPlace,
          metadata: { revelationOrder: chapter.revelationOrder, pages: chapter.pages },
        })),
        status: "success",
        source: QURAN_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getSurah(surahId: number): Promise<QuranResponse<SurahWithAyahs>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
      return {
        data: null,
        status: "unavailable",
        message: "The requested Surah is not available.",
        error: { code: "not-found", httpStatus: 404, retryable: false },
      };
    }

    try {
      const chapters = await listProviderChapters(api.environment);
      const chapter = chapters.find((item) => item.id === surahId);
      if (!chapter) {
        return {
          data: null,
          status: "unavailable",
          message: "This Surah is not available in the configured Quran environment.",
          error: { code: "not-found", httpStatus: 404, retryable: false },
        };
      }

      const pageCount = Math.ceil(chapter.versesCount / VERSES_PER_PAGE);
      const versePages = [];
      for (let page = 1; page <= pageCount; page += 1) {
        versePages.push(
          await getProviderVersePage(api.environment, chapter.id, page),
        );
      }
      const verses = versePages.flat().sort((left, right) => left.verseNumber - right.verseNumber);

      if (
        verses.length !== chapter.versesCount ||
        verses.some((verse, index) => verse.verseNumber !== index + 1)
      ) {
        return incompleteProviderData(
          "The provider did not return a complete Surah. Partial Quran text was not displayed.",
        );
      }

      return {
        data: {
          id: chapter.id,
          nameArabic: chapter.nameArabic,
          nameEnglish: chapter.nameSimple,
          transliteration: chapter.transliteratedName,
          bismillahPre: chapter.bismillahPre,
          bismillahText: null,
          ayahCount: chapter.versesCount,
          revelationType: chapter.revelationPlace,
          metadata: { revelationOrder: chapter.revelationOrder, pages: chapter.pages },
          ayahs: verses.map((verse) => ({
            id: verse.id,
            surahId: chapter.id,
            numberInSurah: verse.verseNumber,
            verseKey: verse.verseKey,
            arabicText: verse.textUthmani ?? null,
          })),
        },
        status: "success",
        source: QURAN_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getSurahWords(surahId: number): Promise<QuranResponse<AyahWordData[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
      return {
        data: null,
        status: "unavailable",
        message: "The requested Surah is not available.",
        error: { code: "not-found", httpStatus: 404, retryable: false },
      };
    }

    try {
      const chapters = await listProviderChapters(api.environment);
      const chapter = chapters.find((item) => item.id === surahId);
      if (!chapter) {
        return {
          data: null,
          status: "unavailable",
          message: "This Surah is not available in the configured Quran environment.",
          error: { code: "not-found", httpStatus: 404, retryable: false },
        };
      }

      const pageCount = Math.ceil(chapter.versesCount / VERSES_PER_PAGE);
      const versePages = [];
      for (let page = 1; page <= pageCount; page += 1) {
        versePages.push(
          await getProviderVersePage(api.environment, chapter.id, page, null, true),
        );
      }
      const verses = versePages.flat().sort((left, right) => left.verseNumber - right.verseNumber);

      if (
        verses.length !== chapter.versesCount ||
        verses.some((verse, index) =>
          verse.verseNumber !== index + 1 || !verse.words?.length,
        )
      ) {
        return incompleteProviderData(
          "The provider did not return complete word-level data for this Surah.",
        );
      }

      return {
        data: verses.map((verse) => ({
          surahId: chapter.id,
          ayahId: verse.id,
          verseKey: verse.verseKey,
          words: (verse.words ?? []).map((word) => ({
            id: word.id ?? `${verse.verseKey}:${word.position}`,
            verseKey: verse.verseKey,
            position: word.position,
            arabicText: word.textUthmani ?? word.text ?? null,
            transliteration: word.transliteration?.text ?? null,
            translation: {
              resourceId: word.translation.resourceId,
              languageId: word.translation.languageId ?? null,
              language: word.translation.languageName ?? "",
              text: word.translation.text,
              source: word.translation.resourceName ?? null,
            },
          })),
        })),
        status: "success",
        source: QURAN_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }
}

const quranService: QuranService = new QuranFoundationService();

export function getQuranService(): QuranService {
  return quranService;
}