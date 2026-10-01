import Link from "next/link";
import { RetrySurahButton } from "@/components/quran/RetrySurahButton";
import { ROUTES } from "@/lib/constants/routes";

export function SurahNotConfiguredState({
  message,
}: {
  readonly message?: string;
}) {
  return (
    <section className="surah-reader-state" aria-labelledby="source-state-title">
      <span className="placeholder-tag">Content unavailable</span>
      <h2 id="source-state-title">Quran source not configured</h2>
      <p>
        {message ??
          "This reader will display Surah content after a verified Quran data source is connected."}
      </p>
      <Link className="button button-secondary" href={ROUTES.quran}>
        Back to Quran
      </Link>
    </section>
  );
}

export function SurahLoadErrorState({
  message,
}: {
  readonly message?: string;
}) {
  return (
    <section
      className="surah-reader-state"
      aria-labelledby="surah-load-error-title"
      role="alert"
    >
      <span className="placeholder-tag">Load error</span>
      <h2 id="surah-load-error-title">Unable to load this Surah.</h2>
      <p>{message ?? "Please try again, or return to the Surah list."}</p>
      <div className="reader-state-actions">
        <RetrySurahButton />
        <Link className="button button-secondary" href={ROUTES.quran}>
          Back to Quran
        </Link>
      </div>
    </section>
  );
}