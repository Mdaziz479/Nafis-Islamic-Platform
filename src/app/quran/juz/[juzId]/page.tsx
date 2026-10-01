import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getJuzService } from "@/services/quran/juz-service";

export const dynamic = "force-dynamic";

export default async function JuzDetailPage({ params }: { params: Promise<{ juzId: string }> }) {
  const juzId = Number((await params).juzId);
  if (!Number.isInteger(juzId) || juzId < 1 || juzId > 30) notFound();
  const result = await getJuzService().getJuz(juzId);
  if (!result.data) return <Container><p role="alert">Juz data could not be loaded.</p></Container>;
  return (
    <Container>
      <div className="surah-reader-page">
        <SectionHeading level={1} eyebrow="Quran navigation" title={`Juz ${juzId}`} description="Arabic Quran verses from the verified Quran Foundation source." />
        <section className="ayah-list" aria-label={`Ayahs in Juz ${juzId}`}>
          {result.data.map((verse) => (
            <article className="ayah-card" id={`juz-${juzId}-${verse.verseKey.replace(":", "-")}`} key={verse.id}>
              <h2 className="ayah-number">{verse.verseKey}</h2>
              <p className="ayah-arabic-text" lang="ar" dir="rtl">{verse.arabicText}</p>
              <Link className="button button-secondary" href={`/quran/surah/${verse.surahId}#surah-${verse.surahId}-ayah-${verse.numberInSurah}`}>Open Surah</Link>
            </article>
          ))}
        </section>
      </div>
    </Container>
  );
}