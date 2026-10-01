import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { getTranslationService } from "@/services/quran/translation-service";
import { searchQuran, type QuranSearchPage, type QuranSearchResult } from "@/services/quran/search-service";
import type { TranslationResource } from "@/types/quran";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search Quran",
  description: "Search provider-backed Quran verses and configured translations.",
  robots: { index: false, follow: true },
};

interface SearchPageProps {
  readonly searchParams: Promise<{
    readonly q?: string | string[];
    readonly page?: string | string[];
    readonly translationId?: string | string[];
  }>;
}

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

function positiveNumber(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function highlightedMatch(text: string, query: string) {
  const index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (index < 0) return text;
  const matchEnd = index + query.length;
  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, matchEnd)}</mark>
      {text.slice(matchEnd)}
    </>
  );
}

async function loadSearchPageData(query: string, page: number, requestedTranslationId: number | null) {
  const translationResponse = await getTranslationService().getAvailableTranslations().catch(() => null);
  const translations = translationResponse?.status === "success" ? translationResponse.data ?? [] : [];
  const selectedTranslation = translations.find(({ id }) => id === requestedTranslationId) ?? null;
  const result = query
    ? await searchQuran(query, { page, translationId: selectedTranslation?.id }).catch(() => null)
    : null;
  return { translations, selectedTranslation, result };
}

function pageHref(query: string, translationId: number | null, nextPage: number) {
  const nextParams = new URLSearchParams({ q: query, page: String(nextPage) });
  if (translationId) nextParams.set("translationId", String(translationId));
  return `/search?${nextParams.toString()}`;
}

function SearchResultList({
  results,
  query,
  translation,
  pagination,
}: {
  readonly results: QuranSearchResult[];
  readonly query: string;
  readonly translation: TranslationResource | null;
  readonly pagination: NonNullable<QuranSearchPage["pagination"]>;
}) {
  return (
    <>
      <p className="quran-search-count" aria-live="polite">
        {pagination.totalRecords} results{translation ? ` in ${translation.resourceName}` : ""}
      </p>
      <ol className="quran-search-results">
        {results.map((item) => (
          <li key={item.verseKey}>
            <article className="quran-search-result">
              <div className="quran-search-result-heading">
                <span>{item.surahName} · Ayah {item.ayahNumber}</span>
                <Link
                  href={`/quran/surah/${item.surahId}#surah-${item.surahId}-ayah-${item.ayahNumber}`}
                  aria-label={`Open Surah ${item.surahId}, Ayah ${item.ayahNumber}`}
                >
                  Open Ayah <span aria-hidden="true">→</span>
                </Link>
              </div>
              {item.arabicText ? (
                <p className="quran-search-arabic" lang="ar" dir="rtl" translate="no">
                  {item.arabicText}
                </p>
              ) : null}
              <p className="quran-search-match" lang={item.isArabic ? "ar" : undefined} dir={item.isArabic ? "rtl" : "auto"}>
                {highlightedMatch(item.matchText, query)}
              </p>
            </article>
          </li>
        ))}
      </ol>
      {pagination.totalPages > 1 ? (
        <nav className="quran-search-pagination" aria-label="Search result pages">
          {pagination.currentPage > 1
            ? <Link className="button button-secondary" href={pageHref(query, translation?.id ?? null, pagination.currentPage - 1)}>Previous</Link>
            : <span />}
          <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
          {pagination.nextPage
            ? <Link className="button button-secondary" href={pageHref(query, translation?.id ?? null, pagination.nextPage)}>Next</Link>
            : <span />}
        </nav>
      ) : null}
    </>
  );
}

function SearchState({ query, result }: { readonly query: string; readonly result: QuranSearchPage | null }) {
  if (!query) return <p className="quran-search-empty">Enter a search term to find provider-backed Quran verses.</p>;
  if (result?.status !== "success") {
    return (
      <output className="quran-search-unavailable" aria-live="polite">
        {result?.message ?? "Quran search is unavailable from the configured provider right now."}
      </output>
    );
  }
  return <p className="quran-search-empty">No Quran verses matched this search.</p>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = singleValue(params.q).trim();
  const page = positiveNumber(singleValue(params.page)) ?? 1;
  const requestedTranslationId = positiveNumber(singleValue(params.translationId));
  const { translations, selectedTranslation, result } = await loadSearchPageData(query, page, requestedTranslationId);
  const results = result?.status === "success" ? result.data : null;

  return (
    <Container>
      <div className="quran-search-page">
        <SectionHeading
          level={1}
          eyebrow="Verified source"
          title="Search Quran"
          description="Search provider-backed Quran verses, with an optional translation filter."
        />
        <form className="quran-search-form" action="/search" method="get" role="search">
          <div className="quran-search-query">
            <label htmlFor="quran-search-query">Search terms</label>
            <input
              id="quran-search-query"
              name="q"
              type="search"
              defaultValue={query}
              maxLength={120}
              placeholder="Search Arabic or transliterated text"
              autoComplete="off"
            />
          </div>
          <div className="quran-search-filter">
            <label htmlFor="quran-search-translation">Translation</label>
            <select
              id="quran-search-translation"
              name="translationId"
              defaultValue={selectedTranslation ? String(selectedTranslation.id) : ""}
              disabled={translations.length === 0}
            >
              <option value="">All available text</option>
              {translations.map((translation) => (
                <option key={translation.id} value={translation.id}>
                  {translation.languageName} — {translation.resourceName}
                </option>
              ))}
            </select>
          </div>
          <button className="button button-primary" type="submit">Search</button>
        </form>

        {results?.length && result?.pagination
          ? <SearchResultList results={results} query={query} translation={selectedTranslation} pagination={result.pagination} />
          : <SearchState query={query} result={result} />}
      </div>
    </Container>
  );
}