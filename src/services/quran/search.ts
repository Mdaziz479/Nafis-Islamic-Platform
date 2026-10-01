import type { Surah } from "@/types/quran";

export function filterSurahs(surahs: Surah[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return surahs;

  return surahs.filter((surah) => {
    const searchableValues = [
      surah.id.toString(),
      surah.nameArabic,
      surah.nameEnglish,
      surah.transliteration,
    ];

    return searchableValues.some((value) =>
      value?.toLocaleLowerCase().includes(normalizedQuery),
    );
  });
}