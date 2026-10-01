"use client";

export interface QuranReaderPreferences {
  readonly version: 2;
  readonly selectedTranslationId: number | null;
  readonly showTranslation: boolean;
  readonly arabicFontSize: number;
  readonly translationFontSize: number;
  readonly wordByWordEnabled: boolean;
  readonly selectedReciterId: number | null;
  readonly playbackSpeed: number;
  readonly volume: number;
  readonly repeatMode: "off" | "ayah" | "surah";
  readonly autoPlayNextAyah: boolean;
  readonly selectedTafsirId: number | null;
  readonly showTafsir: boolean;
}

const STORAGE_KEY = "sakinah:quran-reader:v2";
const LEGACY_STORAGE_KEY = "sakinah:quran-reader:v1";
const CHANGE_EVENT = "sakinah:quran-reader-preferences-change";

const DEFAULT_PREFERENCES: QuranReaderPreferences = {
  version: 2,
  selectedTranslationId: null,
  showTranslation: true,
  arabicFontSize: 32,
  translationFontSize: 16,
  wordByWordEnabled: false,
  selectedReciterId: null,
  playbackSpeed: 1,
  volume: 1,
  repeatMode: "off",
  autoPlayNextAyah: true,
  selectedTafsirId: null,
  showTafsir: false,
};

let cachedRawValue: string | null | undefined;
let cachedPreferences = DEFAULT_PREFERENCES;

function normalizePreferences(value: unknown): QuranReaderPreferences {
  if (typeof value !== "object" || value === null) return DEFAULT_PREFERENCES;

  const stored = value as Record<string, unknown>;
  const selectedTranslationId = stored.selectedTranslationId;
  const selectedReciterId = stored.selectedReciterId;
  const selectedTafsirId = stored.selectedTafsirId;
  const repeatMode = stored.repeatMode;

  return {
    version: 2,
    selectedTranslationId:
      typeof selectedTranslationId === "number" &&
      Number.isInteger(selectedTranslationId) &&
      selectedTranslationId > 0
        ? selectedTranslationId
        : null,
    showTranslation:
      typeof stored.showTranslation === "boolean"
        ? stored.showTranslation
        : DEFAULT_PREFERENCES.showTranslation,
    arabicFontSize:
      typeof stored.arabicFontSize === "number"
        ? Math.min(48, Math.max(24, stored.arabicFontSize))
        : DEFAULT_PREFERENCES.arabicFontSize,
    translationFontSize:
      typeof stored.translationFontSize === "number"
        ? Math.min(24, Math.max(13, stored.translationFontSize))
        : DEFAULT_PREFERENCES.translationFontSize,
    wordByWordEnabled:
      typeof stored.wordByWordEnabled === "boolean"
        ? stored.wordByWordEnabled
        : DEFAULT_PREFERENCES.wordByWordEnabled,
    selectedReciterId:
      typeof selectedReciterId === "number" &&
      Number.isInteger(selectedReciterId) &&
      selectedReciterId > 0
        ? selectedReciterId
        : null,
    playbackSpeed:
      typeof stored.playbackSpeed === "number"
        ? Math.min(2, Math.max(0.5, stored.playbackSpeed))
        : DEFAULT_PREFERENCES.playbackSpeed,
    volume:
      typeof stored.volume === "number"
        ? Math.min(1, Math.max(0, stored.volume))
        : DEFAULT_PREFERENCES.volume,
    repeatMode:
      repeatMode === "ayah" || repeatMode === "surah"
        ? repeatMode
        : DEFAULT_PREFERENCES.repeatMode,
    autoPlayNextAyah:
      typeof stored.autoPlayNextAyah === "boolean"
        ? stored.autoPlayNextAyah
        : DEFAULT_PREFERENCES.autoPlayNextAyah,
    selectedTafsirId:
      typeof selectedTafsirId === "number" &&
      Number.isInteger(selectedTafsirId) &&
      selectedTafsirId > 0
        ? selectedTafsirId
        : null,
    showTafsir:
      typeof stored.showTafsir === "boolean"
        ? stored.showTafsir
        : DEFAULT_PREFERENCES.showTafsir,
  };
}

export function getQuranReaderPreferencesSnapshot() {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;

  try {
    const currentValue = window.localStorage.getItem(STORAGE_KEY);
    const legacyValue = currentValue
      ? null
      : window.localStorage.getItem(LEGACY_STORAGE_KEY);
    const rawValue = currentValue ?? legacyValue;
    if (rawValue !== cachedRawValue) {
      cachedPreferences = rawValue
        ? normalizePreferences(JSON.parse(rawValue))
        : DEFAULT_PREFERENCES;
      cachedRawValue = JSON.stringify(cachedPreferences);
      if (!currentValue && legacyValue) {
        window.localStorage.setItem(STORAGE_KEY, cachedRawValue);
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    }
  } catch {
    return DEFAULT_PREFERENCES;
  }

  return cachedPreferences;
}

export function getServerQuranReaderPreferencesSnapshot() {
  return DEFAULT_PREFERENCES;
}

export function subscribeToQuranReaderPreferences(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function updateQuranReaderPreferences(
  update: Partial<Omit<QuranReaderPreferences, "version">>,
) {
  cachedPreferences = normalizePreferences({
    ...getQuranReaderPreferencesSnapshot(),
    ...update,
    version: 2,
  });
  cachedRawValue = JSON.stringify(cachedPreferences);

  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRawValue);
    void fetch("/api/user-data/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: cachedRawValue,
    }).catch(() => undefined);
  } catch {
    cachedRawValue = undefined;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}
