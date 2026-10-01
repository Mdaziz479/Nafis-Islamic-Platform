import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SurahReader } from "@/components/quran/SurahReader";
import { getAudioService } from "@/services/quran/audio-service";
import { getQuranService } from "@/services/quran/quran-service";
import { getTranslationService } from "@/services/quran/translation-service";
import { getTafsirService } from "@/services/quran/tafsir-service";

export const metadata: Metadata = {
  title: "Quran reader",
  description: "Read a Surah from a configured, verified Quran source.",
};

interface SurahReaderPageProps {
  readonly params: Promise<{ surahId: string }>;
}

export default async function SurahReaderPage(
  props: Readonly<SurahReaderPageProps>,
) {
  const { surahId: rawSurahId } = await props.params;
  const surahId = Number(rawSurahId);

  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    notFound();
  }

  const [response, translationResourcesResponse, recitersResponse, tafsirsResponse] = await Promise.all([
    getQuranService().getSurah(surahId).catch(() => ({
      data: null,
      status: "unavailable" as const,
      message: "Unable to load this Surah.",
    })),
    getTranslationService().getAvailableTranslations().catch(() => ({
      data: null,
      status: "unavailable" as const,
      message: "Translation resources are unavailable.",
    })),
    getAudioService().getAvailableReciters().catch(() => ({
      data: null,
      status: "unavailable" as const,
      message: "Reciters are unavailable.",
    })),
    getTafsirService().getAvailableTafsirs().catch(() => ({
      data: null,
      status: "unavailable" as const,
      message: "Tafsirs are unavailable.",
    })),
  ]);
  const reciters = recitersResponse.data
    ? (await Promise.all(recitersResponse.data.map(async (reciter) => {
      const result = await getAudioService().getVerseRecitations(surahId, reciter.id).catch(() => null);
      return result?.status === "success" && result.data?.length ? reciter : null;
    }))).filter((reciter): reciter is NonNullable<typeof reciter> => reciter !== null)
    : [];

  return (
    <SurahReader
      surahId={surahId}
      response={response}
      translationResources={translationResourcesResponse.data ?? []}
      translationResourcesUnavailable={
        translationResourcesResponse.status === "unavailable"
      }
      reciters={reciters}
      tafsirResources={tafsirsResponse.data ?? []}
    />
  );
}