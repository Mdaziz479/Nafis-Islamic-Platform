export interface Surah {
  id: number;
  nameArabic: string | null;
  nameEnglish: string | null;
  transliteration: string | null;
  bismillahText?: string | null;
  bismillahPre?: boolean | null;
  ayahCount: number | null;
  revelationType: string | null;
  metadata?: Record<string, unknown>;
}

export interface TranslationResource {
  id: number;
  languageId: number | null;
  languageName: string;
  languageCode: string | null;
  resourceName: string;
  translator: string | null;
}

export interface TranslationFootnote {
  id: number | string;
  marker?: string | null;
  text: string;
}

export interface Translation {
  id: string;
  ayahId: number | string;
  verseKey: string;
  resourceId: number;
  languageId: number | null;
  language: string;
  text: string | null;
  source?: string | null;
  footnotes?: TranslationFootnote[];
  metadata?: Record<string, unknown>;
}

export interface QuranWord {
  id: number | string;
  verseKey: string;
  position: number;
  arabicText: string | null;
  transliteration?: string | null;
  translation?: Pick<
    Translation,
    "resourceId" | "languageId" | "language" | "text" | "source"
  >;
  translations?: Translation[];
}

export interface AyahWordData {
  surahId: number;
  ayahId: number | string;
  verseKey: string;
  words: QuranWord[];
}

export interface QuranAudioReference {
  reciterId: string;
  url: string;
  durationSeconds?: number | null;
}

export interface Reciter {
  id: string;
  name: string;
  arabicName?: string | null;
}

export interface VerseRecitation {
  verseKey: string;
  url: string;
  audioUrl: string;
  id?: number | string;
  chapterId?: number;
  segments?: [number, number, number, number][];
  format?: string;
}

export interface ChapterRecitation {
  id: number;
  chapterId: number;
  fileSize: number;
  format: string;
  audioUrl: string;
}

export interface TafsirResource {
  id: number;
  name: string;
  authorName: string | null;
  languageName: string;
  translatedName?: {
    languageName: string;
    name: string;
  } | null;
}

export interface Tafsir {
  id: number;
  resourceId: number;
  text: string;
  languageName: string;
  languageId: number | null;
  verseKey: string;
}

export interface Ayah {
  id: number | string;
  surahId: number;
  numberInSurah: number;
  verseKey: string;
  arabicText: string | null;
  translations?: Translation[];
  tafsir?: Translation[];
  words?: QuranWord[];
  audio?: QuranAudioReference[];
  metadata?: Record<string, unknown>;
}

export interface SurahWithAyahs extends Surah {
  ayahs: Ayah[];
}

export type QuranResponseStatus = "success" | "not-configured" | "unavailable";

export type QuranServiceErrorCode =
  | "missing-credentials"
  | "invalid-environment"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "rate-limited"
  | "provider-error"
  | "network-error"
  | "incomplete-data"
  | "invalid-translation";

export interface QuranResponse<T> {
  data: T | null;
  status: QuranResponseStatus;
  message?: string;
  error?: {
    code: QuranServiceErrorCode;
    httpStatus?: number;
    retryable: boolean;
  };
  source?: {
    provider: string;
    attributionUrl?: string;
  };
  metadata?: Record<string, unknown>;
}