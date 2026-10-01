import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getJuzService } from "@/services/quran/juz-service";

export const dynamic = "force-dynamic";

export default async function JuzPage() {
  const result = await getJuzService().listJuzs();
  return (
    <Container>
      <div className="quran-directory-page">
        <SectionHeading level={1} eyebrow="Quran navigation" title="Juz" description="Browse provider-backed Juz boundaries and Quran verses." />
        {result.data?.length ? (
          <ol className="surah-list" aria-label="Juz list">
            {result.data.map((juz) => (
              <li key={juz.id}>
                <Link className="surah-list-item" href={`/quran/juz/${juz.id}`}>
                  <span className="surah-number" aria-label={`Juz ${juz.id}`}>{juz.id}</span>
                  <span className="surah-names"><span className="surah-english-name">Juz {juz.id}</span></span>
                  <span className="surah-list-meta"><span>{juz.versesCount} Ayahs</span></span>
                  <span className="surah-open-mark" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : <p role="alert">Juz data could not be loaded from the configured Quran source.</p>}
      </div>
    </Container>
  );
}