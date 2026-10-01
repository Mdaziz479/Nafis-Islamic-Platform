import "server-only";

import type { ChapterId } from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import { configurationFailure, providerFailure } from "@/services/quran/errors";
import { listProviderChapters, VERSES_PER_PAGE } from "@/services/quran/provider-data";
import type { QuranResponse } from "@/types/quran";
import type { Tafsir, TafsirResource } from "@/types/quran";

export interface TafsirService {
  getAvailableTafsirs(): Promise<QuranResponse<TafsirResource[]>>;
  getSurahTafsirs(
    surahId: number,
    tafsirResourceId: number,
  ): Promise<QuranResponse<Tafsir[]>>;
}

const TAFSIR_SOURCE = {
  provider: "Quran Foundation Content API",
  attributionUrl: "https://quran.foundation/",
};

function normalizeProviderText(value: string) {
  let text = "";
  let insideTag = false;
  for (const character of value) {
    if (character === "<") insideTag = true;
    else if (character === ">") insideTag = false;
    else if (!insideTag) text += character;
  }
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

class QuranFoundationTafsirService implements TafsirService {
  async getAvailableTafsirs(): Promise<QuranResponse<TafsirResource[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);

    try {
      const tafsirs = await api.client.resources.findAllTafsirs();
      return {
        data: tafsirs
          .filter((tafsir) => tafsir.id && tafsir.name && tafsir.languageName)
          .map((tafsir) => ({
            id: tafsir.id!,
            name: tafsir.name!,
            authorName: tafsir.authorName ?? null,
            languageName: tafsir.languageName!,
            translatedName: tafsir.translatedName ?? null,
          })),
        status: "success",
        source: TAFSIR_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getSurahTafsirs(
    surahId: number,
    tafsirResourceId: number,
  ): Promise<QuranResponse<Tafsir[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (
      !Number.isInteger(surahId) || surahId < 1 || surahId > 114 ||
      !Number.isInteger(tafsirResourceId) || tafsirResourceId < 1
    ) {
      return {
        data: null,
        status: "unavailable",
        message: "The requested Tafsir is not available.",
        error: { code: "not-found", httpStatus: 404, retryable: false },
      };
    }

    try {
      const available = await this.getAvailableTafsirs();
      if (available.status !== "success" || !available.data) {
        return {
          data: null,
          status:
            available.status === "not-configured"
              ? "not-configured"
              : "unavailable",
          message: available.message,
          error: available.error,
        };
      }
      const resource = available.data.find(({ id }) => id === tafsirResourceId);
      if (!resource) {
        return {
          data: null,
          status: "unavailable",
          message: "The selected Tafsir is not available.",
          error: { code: "not-found", httpStatus: 404, retryable: false },
        };
      }

      const chapters = await listProviderChapters(api.environment);
      const chapter = chapters.find((item) => item.id === surahId);
      if (!chapter) {
        return {
          data: null,
          status: "unavailable",
          message: "The selected Surah is not available from this provider.",
          error: { code: "not-found", httpStatus: 404, retryable: false },
        };
      }

      const pageCount = Math.ceil(chapter.versesCount / VERSES_PER_PAGE);
      const versePages = [];
      for (let page = 1; page <= pageCount; page += 1) {
        const query = {
          page,
          perPage: VERSES_PER_PAGE,
          fields: { textUthmani: true },
          tafsirs: [tafsirResourceId],
        };
        const verses = await api.client.content.v4.verses.byChapter(String(chapter.id) as ChapterId, query);
        versePages.push(verses);
      }
      const verses = versePages.flat().sort((left, right) => left.verseNumber - right.verseNumber);

      if (
        verses.length !== chapter.versesCount ||
        verses.some((verse, index) => verse.verseNumber !== index + 1)
      ) {
        return {
          data: null,
          status: "unavailable",
          message: "The provider did not return a complete Tafsir range.",
          error: { code: "incomplete-data", httpStatus: 502, retryable: true },
        };
      }

      const data = verses.flatMap((verse) => {
        const providerTafsir = verse.tafsirs?.find(
          (item) => item.resourceId === tafsirResourceId,
        );
        if (!providerTafsir || !providerTafsir.text) return [];

        return [{
          id: providerTafsir.id ?? 0,
          resourceId: tafsirResourceId,
          text: normalizeProviderText(providerTafsir.text),
          languageName: providerTafsir.languageName ?? resource.languageName,
          languageId: providerTafsir.languageId ?? null,
          verseKey: verse.verseKey,
        }];
      });

      return {
        data,
        status: "success",
        source: TAFSIR_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }
}

const tafsirService: TafsirService = new QuranFoundationTafsirService();

export function getTafsirService(): TafsirService {
  return tafsirService;
}
