import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import { filterSurahs } from "@/services/quran/search";
import type { QuranResponseStatus, Surah } from "@/types/quran";

interface SurahDirectoryProps {
  readonly surahs: Surah[] | null;
  readonly query: string;
  readonly status: QuranResponseStatus;
  readonly message?: string;
}

export function SurahDirectory({
  surahs,
  query,
  status,
  message,
}: SurahDirectoryProps) {
  const filteredSurahs = filterSurahs(surahs ?? [], query);
  const hasSurahs = status === "success" && filteredSurahs.length > 0;

  return (
    <Container>
      <div className="quran-directory-page">
        <SectionHeading
          level={1}
          eyebrow="Quran library"
          title="Surahs"
          description="Browse Surah information from the configured, verified Quran source."
        />

        <form className="surah-search" action={ROUTES.quran} method="get" role="search">
          <label htmlFor="surah-query">Search Surahs</label>
          <div className="surah-search-controls">
            <input
              id="surah-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Name, transliteration, or number"
              autoComplete="off"
            />
            <button className="button button-primary" type="submit">
              Search
            </button>
          </div>
        </form>

        {hasSurahs ? (
          <>
            <p className="surah-result-count" aria-live="polite">
              {filteredSurahs.length} Surahs
            </p>
            <ol className="surah-list" aria-label="Surah list">
              {filteredSurahs.map((surah) => (
                <li key={surah.id}>
                  <Link
                    className="surah-list-item"
                    href={`${ROUTES.quran}/surah/${surah.id}`}
                  >
                    <span className="surah-number" aria-label={`Surah ${surah.id}`}>
                      {surah.id}
                    </span>
                    <span className="surah-names">
                      <span
                        className="surah-arabic-name"
                        lang={surah.nameArabic ? "ar" : undefined}
                        dir="rtl"
                      >
                        {surah.nameArabic ?? "Arabic name unavailable"}
                      </span>
                      <span className="surah-english-name">
                        {surah.nameEnglish ?? surah.transliteration ?? "Name unavailable"}
                      </span>
                    </span>
                    <span className="surah-list-meta">
                      <span>{surah.ayahCount === null ? "Ayah count unavailable" : `${surah.ayahCount} ayahs`}</span>
                      <span>{surah.revelationType ?? "Revelation type unavailable"}</span>
                    </span>
                    <span className="surah-open-mark" aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <Card className="quran-unavailable-card">
            <EmptyState
              title={
                status === "success"
                  ? "No Surahs match this search"
                  : "Surah data is not connected"
              }
              description={
                status === "success"
                  ? "Try a different Surah name, transliteration, or number."
                  : message ?? "Configure a verified Quran source to display Surah information."
              }
            />
          </Card>
        )}

        <section className="juz-placeholder" aria-labelledby="juz-title">
          <SectionHeading id="juz-title" eyebrow="Reading navigation" title="Juz navigation" description="Browse the 30 provider-backed Juz divisions." />
          <Card className="juz-placeholder-panel">
            <span className="juz-placeholder-mark" aria-hidden="true">30</span>
            <p>Open the verified Juz directory to browse Quran boundaries.</p>
            <Link className="button button-secondary" href={`${ROUTES.quran}/juz`}>Browse Juz</Link>
          </Card>
        </section>
      </div>
    </Container>
  );
}

