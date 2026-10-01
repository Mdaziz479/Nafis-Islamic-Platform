import { SurahDirectory } from "@/components/quran/SurahDirectory";
import { getQuranService } from "@/services/quran/quran-service";

export const metadata = {
  title: "Quran",
  description: "Browse Surah information from a configured Quran source.",
};

interface QuranPageProps {
  readonly searchParams: Promise<{ q?: string | string[] }>;
}

export default async function QuranPage(props: Readonly<QuranPageProps>) {
  const params = await props.searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const response = await getQuranService().listSurahs();

  return (
    <SurahDirectory
      surahs={response.data}
      query={query}
      status={response.status}
      message={response.message}
    />
  );
}