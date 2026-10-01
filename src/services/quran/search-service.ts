import "server-only";

import { SearchMode } from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import { configurationFailure, providerFailure } from "@/services/quran/errors";
import { listProviderChapters } from "@/services/quran/provider-data";
import type { QuranResponseStatus } from "@/types/quran";

export interface QuranSearchResult {
  readonly verseKey: string;
  readonly surahId: number;
  readonly ayahNumber: number;
  readonly surahName: string;
  readonly matchText: string;
  readonly arabicText: string | null;
  readonly isArabic: boolean;
}

export interface QuranSearchPage {
  readonly status: QuranResponseStatus;
  readonly data: QuranSearchResult[] | null;
  readonly message?: string;
  readonly pagination: {
    readonly currentPage: number;
    readonly nextPage: number | null;
    readonly totalPages: number;
    readonly totalRecords: number;
  } | null;
}

export async function searchQuran(
  query: string,
  options: { readonly page?: number; readonly translationId?: number },
): Promise<QuranSearchPage> {
  const normalizedQuery = query.trim();
  const page = options.page ?? 1;
  if (!normalizedQuery || normalizedQuery.length > 120 || !Number.isInteger(page) || page < 1 || page > 1000) {
    return {
      status: "unavailable",
      data: null,
      message: "Enter a search term up to 120 characters long.",
      pagination: null,
    };
  }

  const api = getQuranApiClient();
  if (api.status !== "ready") {
    const failure = configurationFailure<QuranSearchResult[]>(api);
    return { status: failure.status, data: null, message: failure.message, pagination: null };
  }

  try {
    const [result, chapters] = await Promise.all([
      api.client.search.search(normalizedQuery, {
        mode: SearchMode.Quick,
        page,
        size: 20,
        getText: "1",
        highlight: "1",
        ...(options.translationId ? { filterTranslations: [String(options.translationId)] } : {}),
      }),
      listProviderChapters(api.environment),
    ]);
    const chaptersById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
    const data = (result.result?.verses ?? []).flatMap((item) => {
      if (item.resultType !== "ayah" || typeof item.key !== "string" || typeof item.name !== "string") return [];
      const keyParts = /^(\d{1,3}):(\d{1,3})$/.exec(item.key);
      if (!keyParts) return [];
      const surahId = Number(keyParts[1]);
      const ayahNumber = Number(keyParts[2]);
      const chapter = chaptersById.get(surahId);
      if (!chapter || ayahNumber < 1 || ayahNumber > chapter.versesCount) return [];
      return [{
        verseKey: item.key,
        surahId,
        ayahNumber,
        surahName: chapter.nameSimple,
        matchText: item.name,
        arabicText: item.arabic ?? null,
        isArabic: item.isArabic ?? false,
      }];
    });

    return {
      status: "success",
      data,
      pagination: {
        currentPage: result.pagination.currentPage,
        nextPage: result.pagination.nextPage,
        totalPages: result.pagination.totalPages,
        totalRecords: result.pagination.totalRecords,
      },
    };
  } catch (error) {
    const failure = providerFailure<QuranSearchResult[]>(error);
    return { status: failure.status, data: null, message: failure.message, pagination: null };
  }
}