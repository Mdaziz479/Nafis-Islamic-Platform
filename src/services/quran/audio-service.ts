import "server-only";

import { unstable_cache } from "next/cache";
import type { ChapterId } from "@quranjs/api";
import { getQuranApiClient } from "@/services/quran/client";
import type { QuranFoundationEnvironment } from "@/services/quran/config";
import { configurationFailure, providerFailure } from "@/services/quran/errors";
import type {
  ChapterRecitation,
  QuranResponse,
  Reciter,
  VerseRecitation,
} from "@/types/quran";

export interface AudioService {
  getAvailableReciters(): Promise<QuranResponse<Reciter[]>>;
  getVerseRecitations(
    chapterId: number,
    reciterId: string,
  ): Promise<QuranResponse<VerseRecitation[]>>;
  getChapterRecitation(
    chapterId: number,
    reciterId: string,
  ): Promise<QuranResponse<ChapterRecitation>>;
}

const AUDIO_SOURCE = {
  provider: "Quran Foundation Content API",
  attributionUrl: "https://quran.foundation/",
};

const AUDIO_PAGE_SIZE = 50;
const MAX_AUDIO_PAGES = 10;

const getCachedAudioPage = unstable_cache(
  async (
    environment: QuranFoundationEnvironment,
    chapterId: number,
    reciterId: string,
    page: number,
  ) => {
    const result = getQuranApiClient();
    if (result.status !== "ready" || result.environment !== environment) {
      throw new Error("Quran Foundation client is unavailable.");
    }
    return result.client.audio.findVerseRecitationsByChapter(
      chapterId as ChapterId,
      reciterId,
      { page, perPage: AUDIO_PAGE_SIZE },
    );
  },
  ["quran-foundation-audio-page"],
  { revalidate: 86400, tags: ["quran-foundation-audio"] },
);

function normalizeAudioUrl(url: string | undefined, fallback: string | undefined) {
  if (url?.startsWith("//")) return `https:${url}`;
  if (url?.startsWith("http://") || url?.startsWith("https://")) return url;
  return fallback ?? url ?? "";
}

class QuranFoundationAudioService implements AudioService {
  async getAvailableReciters(): Promise<QuranResponse<Reciter[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);

    try {
      const reciters = await api.client.resources.findAllChapterReciters();
      return {
        data: reciters.map((reciter) => ({
          id: String(reciter.id),
          name: reciter.name,
          arabicName: reciter.arabicName ?? null,
        })),
        status: "success",
        source: AUDIO_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getVerseRecitations(
    chapterId: number,
    reciterId: string,
  ): Promise<QuranResponse<VerseRecitation[]>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
      return {
        data: null,
        status: "unavailable",
        message: "Invalid chapter ID.",
        error: { code: "not-found", httpStatus: 404, retryable: false },
      };
    }

    try {
      const audioFiles = [];
      for (let page = 1; page <= MAX_AUDIO_PAGES; page += 1) {
        const result = await getCachedAudioPage(api.environment, chapterId, reciterId, page);
        audioFiles.push(...result.audioFiles);
        if (result.audioFiles.length === 0) break;
      }
      const uniqueAudioFiles = [...new Map(audioFiles.map((audio) => [audio.verseKey, audio])).values()];

      return {
        data: uniqueAudioFiles.map((audio) => ({
          verseKey: audio.verseKey,
          url: audio.url,
          audioUrl: normalizeAudioUrl(audio.url, audio.audioUrl),
          id: audio.id,
          chapterId: audio.chapterId,
          segments: audio.segments,
          format: audio.format,
        })),
        status: "success",
        source: AUDIO_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }

  async getChapterRecitation(
    chapterId: number,
    reciterId: string,
  ): Promise<QuranResponse<ChapterRecitation>> {
    const api = getQuranApiClient();
    if (api.status !== "ready") return configurationFailure(api);
    if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
      return {
        data: null,
        status: "unavailable",
        message: "Invalid chapter ID.",
        error: { code: "not-found", httpStatus: 404, retryable: false },
      };
    }

    try {
      const recitation = await api.client.audio.findChapterRecitationById(
        reciterId,
        chapterId as ChapterId,
      );
      return {
        data: {
          id: recitation.id,
          chapterId: recitation.chapterId,
          fileSize: recitation.fileSize,
          format: recitation.format,
          audioUrl: recitation.audioUrl,
        },
        status: "success",
        source: AUDIO_SOURCE,
      };
    } catch (error) {
      return providerFailure(error);
    }
  }
}

const audioService: AudioService = new QuranFoundationAudioService();

export function getAudioService(): AudioService {
  return audioService;
}
