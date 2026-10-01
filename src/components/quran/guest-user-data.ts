"use client";

import { getReadingDateKey, getReadingTimeZone } from "@/services/quran/reading-metrics";

export interface ReaderBookmark {
  readonly verseKey: string;
  readonly surahId: number;
  readonly ayahNumber: number;
  readonly id?: string;
}

export interface ReaderNote extends ReaderBookmark {
  readonly content: string;
}

export interface ReaderCollection {
  readonly name: string;
  readonly verseKeys: string[];
  readonly id?: string;
}

export interface ReaderProgress {
  readonly lastSurahId: number | null;
  readonly lastAyahId: number | null;
  readonly timeZone?: string;
  readonly surahProgress: Record<string, number>;
  readonly dailyActivity: Record<string, number>;
  readonly dailyReadVerseKeys: Record<string, string[]>;
}

export interface ReaderGoal {
  readonly targetAyahsPerDay: number;
}

export interface GuestUserData {
  readonly bookmarks: ReaderBookmark[];
  readonly notes: ReaderNote[];
  readonly collections: ReaderCollection[];
  readonly progress: ReaderProgress | null;
  readonly goals: ReaderGoal | null;
}

const STORAGE_KEY = "sakinah:guest-user-data:v1";
const CHANGE_EVENT = "sakinah:guest-user-data-change";
const EMPTY_DATA: GuestUserData = { bookmarks: [], notes: [], collections: [], progress: null, goals: null };
let cachedRawValue: string | null | undefined;
let cachedSnapshot = EMPTY_DATA;

function isVerseKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{1,3}:\d{1,3}$/.test(value)) return false;
  const [surahId, ayahNumber] = value.split(":").map(Number);
  return surahId >= 1 && surahId <= 114 && ayahNumber >= 1 && ayahNumber <= 286;
}

function normalizeBookmark(value: unknown): ReaderBookmark | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  if (!isVerseKey(item.verseKey)) return null;
  const [surahId, ayahNumber] = item.verseKey.split(":").map(Number);
  if (item.surahId !== surahId || item.ayahNumber !== ayahNumber) return null;
  return {
    verseKey: item.verseKey,
    surahId,
    ayahNumber,
    ...(typeof item._id === "string" ? { id: item._id } : {}),
    ...(typeof item.id === "string" ? { id: item.id } : {}),
  };
}

function normalizeGuestData(value: unknown): GuestUserData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return EMPTY_DATA;
  const input = value as Record<string, unknown>;
  const bookmarks = Array.isArray(input.bookmarks)
    ? input.bookmarks.flatMap((item) => {
        const bookmark = normalizeBookmark(item);
        return bookmark ? [bookmark] : [];
      })
    : [];
  const notes = Array.isArray(input.notes)
    ? input.notes.flatMap((item) => {
        const bookmark = normalizeBookmark(item);
        if (!bookmark || typeof item !== "object" || item === null) return [];
        const content = (item as Record<string, unknown>).content;
        return typeof content === "string" && content.trim().length > 0 && content.length <= 5000
          ? [{ ...bookmark, content: content.trim() }]
          : [];
      })
    : [];
  const collections = Array.isArray(input.collections)
    ? input.collections.flatMap((item) => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
        const collection = item as Record<string, unknown>;
        const name = typeof collection.name === "string" ? collection.name.trim() : "";
        const verseKeys = Array.isArray(collection.verseKeys)
          ? [...new Set(collection.verseKeys.filter(isVerseKey))]
          : null;
        return name.length > 0 && name.length <= 120 && verseKeys && verseKeys.length <= 500
          ? [{ name, verseKeys }]
          : [];
      })
    : [];
    const progress = normalizeProgress(input.progress);
    const goal = typeof input.goals === "object" && input.goals !== null && !Array.isArray(input.goals)
      ? (input.goals as Record<string, unknown>).targetAyahsPerDay
      : null;
    const goals = typeof goal === "number" && Number.isInteger(goal) && goal >= 1 && goal <= 10000
      ? { targetAyahsPerDay: goal }
      : null;

  return {
    bookmarks: [...new Map(bookmarks.map((item) => [item.verseKey, item])).values()],
    notes: [...new Map(notes.map((item) => [item.verseKey, item])).values()],
    collections: [...new Map(collections.map((item) => [item.name.toLocaleLowerCase(), item])).values()],
    progress,
    goals,
  };
}

function normalizeProgress(value: unknown): ReaderProgress | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const lastSurahId = input.lastSurahId;
  const lastAyahId = input.lastAyahId;
  const hasLastRead = (lastSurahId === null && lastAyahId === null) ||
    (typeof lastSurahId === "number" && Number.isInteger(lastSurahId) && lastSurahId >= 1 && lastSurahId <= 114 &&
      typeof lastAyahId === "number" && Number.isInteger(lastAyahId) && lastAyahId >= 1 && lastAyahId <= 286);
  if (!hasLastRead) return null;

  const surahProgress: Record<string, number> = {};
  if (typeof input.surahProgress === "object" && input.surahProgress !== null && !Array.isArray(input.surahProgress)) {
    for (const [surahId, ayahNumber] of Object.entries(input.surahProgress)) {
      const key = Number(surahId);
      if (Number.isInteger(key) && key >= 1 && key <= 114 && typeof ayahNumber === "number" && Number.isInteger(ayahNumber) && ayahNumber >= 0 && ayahNumber <= 286) {
        surahProgress[surahId] = ayahNumber;
      }
    }
  }

  const dailyReadVerseKeys: Record<string, string[]> = {};
  const dailyActivity: Record<string, number> = {};
  const sourceReadKeys = typeof input.dailyReadVerseKeys === "object" && input.dailyReadVerseKeys !== null && !Array.isArray(input.dailyReadVerseKeys)
    ? input.dailyReadVerseKeys as Record<string, unknown>
    : {};
  for (const [day, values] of Object.entries(sourceReadKeys)) {
    const date = new Date(`${day}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day || !Array.isArray(values)) continue;
    const verses = [...new Set(values.filter(isVerseKey))].slice(0, 10000);
    dailyReadVerseKeys[day] = verses;
    dailyActivity[day] = verses.length;
  }
  if (typeof input.dailyActivity === "object" && input.dailyActivity !== null && !Array.isArray(input.dailyActivity)) {
    for (const [day, count] of Object.entries(input.dailyActivity)) {
      if (dailyActivity[day] !== undefined) continue;
      if (typeof count === "number" && Number.isInteger(count) && count >= 0 && count <= 10000) dailyActivity[day] = count;
    }
  }

  return {
    lastSurahId,
    lastAyahId,
    timeZone: getReadingTimeZone(input.timeZone),
    surahProgress,
    dailyActivity,
    dailyReadVerseKeys,
  };
}

export function getGuestUserDataSnapshot(): GuestUserData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRawValue) {
      cachedRawValue = raw;
      cachedSnapshot = raw ? normalizeGuestData(JSON.parse(raw)) : EMPTY_DATA;
    }
    return cachedSnapshot;
  } catch {
    return EMPTY_DATA;
  }
}

export function getServerGuestUserDataSnapshot() {
  return EMPTY_DATA;
}

export function saveGuestUserData(data: GuestUserData) {
  try {
    const normalized = normalizeGuestData(data);
    const raw = JSON.stringify(normalized);
    window.localStorage.setItem(STORAGE_KEY, raw);
    cachedRawValue = raw;
    cachedSnapshot = normalized;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    throw new Error("Saved items could not be stored on this device.");
  }
}

export function clearGuestUserData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    cachedRawValue = null;
    cachedSnapshot = EMPTY_DATA;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    return;
  }
}

export function subscribeToGuestUserData(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function recordGuestReading(surahId: number, ayahNumber: number) {
  const verseKey = `${surahId}:${ayahNumber}`;
  if (!isVerseKey(verseKey)) return;
  const guestData = getGuestUserDataSnapshot();
  const previous = guestData.progress ?? {
    lastSurahId: null,
    lastAyahId: null,
    surahProgress: {},
    dailyActivity: {},
    dailyReadVerseKeys: {},
  };
  const timeZone = getReadingTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const today = getReadingDateKey(new Date(), timeZone);
  const dailyReadVerseKeys = {
    ...previous.dailyReadVerseKeys,
    [today]: [...new Set([...(previous.dailyReadVerseKeys[today] ?? []), verseKey])],
  };
  const progress: ReaderProgress = {
    lastSurahId: surahId,
    lastAyahId: ayahNumber,
    timeZone,
    surahProgress: {
      ...previous.surahProgress,
      [String(surahId)]: Math.max(previous.surahProgress[String(surahId)] ?? 0, ayahNumber),
    },
    dailyActivity: { ...previous.dailyActivity, [today]: dailyReadVerseKeys[today].length },
    dailyReadVerseKeys,
  };
  saveGuestUserData({ ...guestData, progress });
}