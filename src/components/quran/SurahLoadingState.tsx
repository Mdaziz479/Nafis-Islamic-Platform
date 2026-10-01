import { Container } from "@/components/ui/Container";

export function SurahLoadingState() {
  return (
    <Container>
      <div
        className="surah-reader-page reader-loading"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Loading Surah</span>
        <div className="reader-skeleton reader-skeleton-back" aria-hidden="true" />
        <div className="reader-skeleton reader-skeleton-heading" aria-hidden="true" />
        <div className="reader-skeleton reader-skeleton-meta" aria-hidden="true" />
        <div className="reader-skeleton reader-skeleton-toolbar" aria-hidden="true" />
        <div className="reader-skeleton reader-skeleton-content" aria-hidden="true" />
      </div>
    </Container>
  );
}