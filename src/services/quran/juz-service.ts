import "server-only";

import type { JuzNumber } from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import { configurationFailure, providerFailure } from "@/services/quran/errors";
import type { QuranResponse } from "@/types/quran";

export interface JuzSummary {
  readonly id: number;
  readonly versesCount: number;
  readonly firstVerseId: number;
  readonly lastVerseId: number;
  readonly verseMapping: Readonly<Record<number, string>>;
}

export interface JuzVerse {
  readonly id: number;
  readonly verseKey: string;
  readonly numberInSurah: number;
  readonly surahId: number;
  readonly arabicText: string | null;
}

export interface JuzService {
  listJuzs(): Promise<QuranResponse<JuzSummary[]>>;
  getJuz(juzId: number): Promise<QuranResponse<JuzVerse[]>>;
}

const SOURCE = { provider: "Quran Foundation Content API", attributionUrl: "https://quran.foundation/" };
const JUZ_PAGE_SIZE = 50;
const MAX_JUZ_PAGES = 20;

class QuranFoundationJuzService implements JuzService {
  async listJuzs(): Promise<QuranResponse<JuzSummary[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    try {
      const data = [...new Map((await api.client.content.v4.juzs.list()).map((juz) => [juz.juzNumber, juz])).values()].map((juz) => ({
        id: juz.juzNumber,
        versesCount: juz.versesCount,
        firstVerseId: juz.firstVerseId,
        lastVerseId: juz.lastVerseId,
        verseMapping: juz.verseMapping,
      }));
      return { data, status: "success", source: SOURCE };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getJuz(juzId: number): Promise<QuranResponse<JuzVerse[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (!Number.isInteger(juzId) || juzId < 1 || juzId > 30) {
      return { data: null, status: "unavailable", message: "The requested Juz is not available.", error: { code: "not-found", retryable: false } };
    }
    try {
      const verses = [];
      for (let page = 1; page <= MAX_JUZ_PAGES; page += 1) {
        const pageVerses = await api.client.content.v4.verses.byJuz(String(juzId) as JuzNumber, {
          page,
          perPage: JUZ_PAGE_SIZE,
          fields: { textUthmani: true },
        });
        verses.push(...pageVerses);
        if (pageVerses.length === 0) break;
      }
      const data = [...new Map(verses.map((verse) => [verse.verseKey, verse])).values()]
        .sort((left, right) => left.id - right.id)
        .map((verse) => ({
          id: verse.id,
          verseKey: verse.verseKey,
          numberInSurah: verse.verseNumber,
          surahId: Number(verse.verseKey.split(":")[0]),
          arabicText: verse.textUthmani ?? null,
        }));
      return { data, status: "success", source: SOURCE };
    } catch (error) {
      return providerFailure(error);
    }
  }
}

const juzService: JuzService = new QuranFoundationJuzService();

export function getJuzService() {
  return juzService;
}