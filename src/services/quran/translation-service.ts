import "server-only";

import type {
  LanguageResource as ProviderLanguage,
  Translation as ProviderTranslation,
} from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import { configurationFailure, incompleteProviderData, providerFailure } from "@/services/quran/errors";
import {
  getProviderVersePage,
  listProviderChapters,
  listProviderLanguages,
  listProviderTranslationResources,
  VERSES_PER_PAGE,
} from "@/services/quran/provider-data";
import type {
  QuranResponse,
  Translation,
  TranslationFootnote,
  TranslationResource,
} from "@/types/quran";

export interface TranslationService {
  getAvailableTranslations(): Promise<QuranResponse<TranslationResource[]>>;
  getSurahTranslations(
    surahId: number,
    translationResourceId: number,
  ): Promise<QuranResponse<Translation[]>>;
}

function normalizeLanguageName(value: string | undefined) {
  return value?.trim().toLocaleLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

function findLanguage(
  languages: ProviderLanguage[],
  resourceLanguageName: string,
) {
  const normalizedName = normalizeLanguageName(resourceLanguageName);
  return languages.find((language) => {
    const candidates = [language.name, language.nativeName, language.isoCode];
    return candidates.some(
      (candidate) => normalizeLanguageName(candidate) === normalizedName,
    );
  });
}

function readProviderFootnotes(
  translation: ProviderTranslation,
): TranslationFootnote[] {
  const providerRecord = translation as ProviderTranslation & {
    footnotes?: unknown;
  };
  if (!Array.isArray(providerRecord.footnotes)) return [];

  return providerRecord.footnotes.flatMap((item, index) => {
    if (typeof item !== "object" || item === null || !("text" in item)) {
      return [];
    }
    const text = item.text;
    if (typeof text !== "string") return [];
    const id = "id" in item && (typeof item.id === "number" || typeof item.id === "string")
      ? item.id
      : index + 1;
    const marker = "marker" in item && typeof item.marker === "string"
      ? item.marker
      : null;
    return [{ id, marker, text }];
  });
}

function normalizeProviderText(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  let withoutTags = "";
  let insideTag = false;
  for (const character of value) {
    if (character === "<") {
      insideTag = true;
    } else if (character === ">") {
      insideTag = false;
    } else if (!insideTag) {
      withoutTags += character;
    }
  }
  return withoutTags
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

class QuranFoundationTranslationService implements TranslationService {
  async getAvailableTranslations(): Promise<QuranResponse<TranslationResource[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);

    try {
      const [providerResources, providerLanguages] = await Promise.all([
        listProviderTranslationResources(api.environment),
        listProviderLanguages(api.environment),
      ]);

      const data = providerResources.flatMap((resource) => {
        if (typeof resource.id !== "number" || !resource.languageName?.trim()) {
          return [];
        }
        const resourceName =
          resource.name ?? resource.slug ?? resource.translatedName?.name;
        if (!resourceName?.trim()) return [];

        const language = findLanguage(providerLanguages, resource.languageName);
        return [{
          id: resource.id,
          languageId: typeof language?.id === "number" ? language.id : null,
          languageName: resource.languageName,
          languageCode: language?.isoCode ?? null,
          resourceName,
          translator: resource.authorName ?? null,
        }];
      });

      return { data, status: "success", source: { provider: "Quran Foundation Content API" } };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getSurahTranslations(
    surahId: number,
    translationResourceId: number,
  ): Promise<QuranResponse<Translation[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (
      !Number.isInteger(surahId) || surahId < 1 || surahId > 114 ||
      !Number.isInteger(translationResourceId) || translationResourceId < 1
    ) {
      return {
        data: null,
        status: "unavailable",
        message: "The requested translation is not available.",
        error: { code: "invalid-translation", httpStatus: 404, retryable: false },
      };
    }

    try {
      const available = await this.getAvailableTranslations();
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
      const resource = available.data.find(({ id }) => id === translationResourceId);
      if (!resource) {
        return {
          data: null,
          status: "unavailable",
          message: "The selected translation is not available.",
          error: { code: "invalid-translation", httpStatus: 404, retryable: false },
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
        versePages.push(
          await getProviderVersePage(
            api.environment,
            chapter.id,
            page,
            translationResourceId,
          ),
        );
      }
      const verses = versePages.flat().sort((left, right) => left.verseNumber - right.verseNumber);

      if (
        verses.length !== chapter.versesCount ||
        verses.some((verse, index) => verse.verseNumber !== index + 1)
      ) {
        return incompleteProviderData(
          "The provider did not return a complete translation range.",
        );
      }

      const data = verses.flatMap((verse) => {
        const providerTranslation = verse.translations?.find(
          (item) => item.resourceId === translationResourceId,
        );
        if (!providerTranslation) return [];

        return [{
          id: `${translationResourceId}:${verse.verseKey}`,
          ayahId: verse.id,
          verseKey: verse.verseKey,
          resourceId: translationResourceId,
          languageId: providerTranslation.languageId ?? resource.languageId,
          language: providerTranslation.languageName ?? resource.languageName,
          text: normalizeProviderText(providerTranslation.text),
          source: providerTranslation.resourceName ?? resource.resourceName,
          footnotes: readProviderFootnotes(providerTranslation),
        }];
      });

      return {
        data,
        status: "success",
        source: { provider: "Quran Foundation Content API" },
        metadata: {
          requestedVerseCount: chapter.versesCount,
          translatedVerseCount: data.length,
          translationResourceId,
        },
      };
    } catch (error) {
      return providerFailure(error);
    }
  }
}

const translationService: TranslationService =
  new QuranFoundationTranslationService();

export function getTranslationService(): TranslationService {
  return translationService;
}