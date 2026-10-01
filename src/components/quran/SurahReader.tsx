import { AyahCard } from "@/components/quran/AyahCard";
import { AudioProvider } from "@/components/quran/AudioContext";
import { AudioPlayer } from "@/components/quran/AudioPlayer";
import { Container } from "@/components/ui/Container";
import { ReaderLayout } from "@/components/quran/ReaderLayout";
import { SurahHeader } from "@/components/quran/SurahHeader";
import { SurahLoadErrorState, SurahNotConfiguredState } from "@/components/quran/SurahReaderStates";
import { SurahNavigation } from "@/components/quran/SurahNavigation";
import { createAyahIdentifier } from "@/services/quran/identifiers";
import type {
  QuranResponse,
  SurahWithAyahs,
  TranslationResource,
  Reciter,
  TafsirResource,
} from "@/types/quran";

interface SurahReaderProps {
  readonly surahId: number;
  readonly response: QuranResponse<SurahWithAyahs>;
  readonly translationResources: TranslationResource[];
  readonly translationResourcesUnavailable: boolean;
  readonly reciters: Reciter[];
  readonly tafsirResources: TafsirResource[];
}

export function SurahReader({
  surahId,
  response,
  translationResources,
  translationResourcesUnavailable,
  reciters,
  tafsirResources,
}: SurahReaderProps) {
  const surah = response.data;
  const ayahs = surah ? [...surah.ayahs].sort((left, right) => left.numberInSurah - right.numberInSurah) : [];
  const hasSequentialAyahNumbers = ayahs.every(
    (ayah, index) => ayah.numberInSurah === index + 1,
  );
  const ayahIdentifiers = new Set(
    ayahs.map((ayah) => createAyahIdentifier(surahId, ayah.id)),
  );
  const isCompleteResponse =
    response.status === "success" &&
    surah?.id === surahId &&
    ayahs.length > 0 &&
    hasSequentialAyahNumbers &&
    ayahs.every((ayah) => ayah.surahId === surahId) &&
    ayahIdentifiers.size === ayahs.length &&
    (surah.ayahCount === null || ayahs.length === surah.ayahCount);
  const surahName =
    surah?.nameEnglish || surah?.transliteration || `Surah ${surahId}`;
  const errorState = response.status === "not-configured"
    ? <SurahNotConfiguredState message={response.message} />
    : <SurahLoadErrorState message={response.message} />;

  return (
    <AudioProvider>
      <Container>
        <div className="surah-reader-page">
          <SurahHeader surahId={surahId} surah={surah} />
          {isCompleteResponse && surah ? (
            <ReaderLayout
              surahId={surahId}
              translationResources={translationResources}
              translationResourcesUnavailable={translationResourcesUnavailable}
              tafsirResources={tafsirResources}
            >
              <section className="ayah-list" aria-label={`Ayahs in ${surahName}`}>
                {ayahs.map((ayah) => (
                  <AyahCard
                    key={createAyahIdentifier(surahId, ayah.id)}
                    surahId={surahId}
                    ayah={ayah}
                  />
                ))}
              </section>
            </ReaderLayout>
          ) : (
            errorState
          )}
          <SurahNavigation surahId={surahId} />
          <AudioPlayer surahId={surahId} reciters={reciters} />
        </div>
      </Container>
    </AudioProvider>
  );
}
