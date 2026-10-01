export function createAyahIdentifier(
  surahId: number,
  ayahId: number | string | null,
) {
  return `surah-${surahId}-ayah-${ayahId ?? "pending"}`;
}