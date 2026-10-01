import Link from "next/link";
import { ROUTES } from "@/lib/constants/routes";

interface SurahNavigationProps {
  readonly surahId: number;
}

export function SurahNavigation({ surahId }: SurahNavigationProps) {
  return (
    <nav className="surah-navigation" aria-label="Surah navigation">
      {surahId > 1 ? (
        <Link
          className="button button-secondary"
          href={`${ROUTES.quran}/surah/${surahId - 1}`}
        >
          <span aria-hidden="true">←</span> Previous Surah
        </Link>
      ) : (
        <span className="surah-navigation-spacer" aria-hidden="true" />
      )}
      <Link className="button button-quiet" href={ROUTES.quran}>
        All Surahs
      </Link>
      {surahId < 114 ? (
        <Link
          className="button button-secondary"
          href={`${ROUTES.quran}/surah/${surahId + 1}`}
        >
          Next Surah <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="surah-navigation-spacer" aria-hidden="true" />
      )}
    </nav>
  );
}