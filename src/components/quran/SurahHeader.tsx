import Link from "next/link";
import type { Surah } from "@/types/quran";

interface SurahHeaderProps {
  readonly surahId: number;
  readonly surah: Surah | null;
}

export function SurahHeader({ surahId, surah }: SurahHeaderProps) {
  const displayName =
    surah?.nameEnglish ?? surah?.transliteration ?? `Surah ${surahId}`;

  return (
    <>
      <Link className="reader-back-link" href="/quran">
        <span aria-hidden="true">←</span> All Surahs
      </Link>
      <header className="reader-heading">
        <span className="eyebrow">Surah {surahId}</span>
        <h1>{displayName}</h1>
        {surah?.nameArabic ? (
          <p className="reader-surah-arabic" lang="ar" dir="rtl" translate="no">
            {surah.nameArabic}
          </p>
        ) : (
          <p className="reader-surah-arabic reader-surah-unavailable">
            Arabic name unavailable
          </p>
        )}
        <div className="reader-surah-meta" aria-label="Surah information">
          <span>
            {surah?.ayahCount === null || surah?.ayahCount === undefined
              ? "Ayah count unavailable"
              : `${surah.ayahCount} Ayahs`}
          </span>
          {surah?.revelationType ? <span>{surah.revelationType}</span> : null}
        </div>
        {surah?.bismillahText ? (
          <p className="reader-bismillah" lang="ar" dir="rtl">
            {surah.bismillahText}
          </p>
        ) : null}
      </header>
    </>
  );
}