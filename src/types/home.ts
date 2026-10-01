export interface QuickAccessItem {
  title: string;
  description: string;
  href: string;
  mark: string;
}

export interface DailyAyahData {
  arabic: string | null;
  translation: string | null;
  surahName: string | null;
  ayahNumber: number | null;
}

export interface DailyDuaData {
  title: string | null;
  arabic: string | null;
  translation: string | null;
  source: string | null;
}

