"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getReadingDateKey, getReadingTimeZone } from "@/services/quran/reading-metrics";
import {
  getGuestUserDataSnapshot,
  recordGuestReading,
  saveGuestUserData,
  subscribeToGuestUserData,
  type ReaderBookmark,
  type ReaderNote,
  type ReaderProgress,
} from "@/components/quran/guest-user-data";

interface ReaderUserDataValue {
  readonly bookmarks: readonly ReaderBookmark[];
  readonly notes: readonly ReaderNote[];
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly progress: ReaderProgress | null;
  readonly progressError: string | null;
  recordReading: (surahId: number, ayahNumber: number) => void;
  toggleBookmark: (bookmark: ReaderBookmark) => Promise<void>;
  saveNote: (bookmark: ReaderBookmark, content: string) => Promise<void>;
  deleteNote: (note: ReaderNote) => Promise<void>;
}

interface ApiList<T> {
  readonly data?: T[];
}

const ReaderUserDataContext = createContext<ReaderUserDataValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBookmarks(value: unknown): ReaderBookmark[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.verseKey !== "string") return [];
    const [surahId, ayahNumber] = item.verseKey.split(":").map(Number);
    if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return [];
    return [{ verseKey: item.verseKey, surahId, ayahNumber, ...(typeof item._id === "string" ? { id: item._id } : {}) }];
  });
}

function readNotes(value: unknown): ReaderNote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.content !== "string") return [];
    const [surahId, ayahNumber] = typeof item.verseKey === "string" ? item.verseKey.split(":").map(Number) : [];
    if (!Number.isInteger(surahId) || !Number.isInteger(ayahNumber)) return [];
    return [{
      verseKey: `${surahId}:${ayahNumber}`,
      surahId,
      ayahNumber,
      content: item.content,
      ...(typeof item._id === "string" ? { id: item._id } : {}),
    }];
  });
}

async function sendUserData(path: string, method: string, body?: unknown) {
  const response = await fetch(path, {
    method,
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Saved items could not be updated. Please try again.");
  return response.status === 204 ? null : response.json() as Promise<{ data?: unknown }>;
}

export function useReaderUserData() {
  return useContext(ReaderUserDataContext);
}

export function ReaderUserDataProvider({ children }: { readonly children: ReactNode }) {
  const [bookmarks, setBookmarks] = useState<ReaderBookmark[]>([]);
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [progress, setProgress] = useState<ReaderProgress | null>(null);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isAuthenticatedRef = useRef(false);
  const progressRef = useRef<ReaderProgress | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      const guestData = getGuestUserDataSnapshot();
      if (isMounted) {
        setBookmarks(guestData.bookmarks);
        setNotes(guestData.notes);
        setProgress(guestData.progress);
        progressRef.current = guestData.progress;
        setIsLoading(true);
      }
      try {
        const session = await fetch("/api/auth/me", { cache: "no-store" });
        if (!session.ok) {
          if (isMounted) setIsAuthenticated(false);
          return;
        }
        const [bookmarkResponse, noteResponse, progressResponse] = await Promise.all([
          fetch("/api/user-data/bookmarks", { cache: "no-store" }),
          fetch("/api/user-data/notes", { cache: "no-store" }),
          fetch("/api/user-data/progress", { cache: "no-store" }),
        ]);
        if (!bookmarkResponse.ok || !noteResponse.ok || !progressResponse.ok) throw new Error("Saved items could not be loaded.");
        const [bookmarkList, noteList, progressResult] = await Promise.all([
          bookmarkResponse.json() as Promise<ApiList<unknown>>,
          noteResponse.json() as Promise<ApiList<unknown>>,
          progressResponse.json() as Promise<ApiList<unknown>>,
        ]);
        if (isMounted) {
          setBookmarks(readBookmarks(bookmarkList.data));
          setNotes(readNotes(noteList.data));
          const nextProgress = readProgress(progressResult.data);
          setProgress(nextProgress);
          progressRef.current = nextProgress;
          isAuthenticatedRef.current = true;
          setIsAuthenticated(true);
        }
      } catch {
        if (isMounted) {
          isAuthenticatedRef.current = false;
          setIsAuthenticated(false);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    const reload = () => void load();
    const refreshGuestData = () => {
      if (isAuthenticatedRef.current) return;
      const guestData = getGuestUserDataSnapshot();
      setBookmarks(guestData.bookmarks);
      setNotes(guestData.notes);
      setProgress(guestData.progress);
      progressRef.current = guestData.progress;
    };
    void load();
    window.addEventListener("sakinah-auth-change", reload);
    const unsubscribeGuestData = subscribeToGuestUserData(refreshGuestData);
    return () => {
      isMounted = false;
      window.removeEventListener("sakinah-auth-change", reload);
      unsubscribeGuestData();
    };
  }, []);

  useEffect(() => () => {
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
  }, []);

  const recordReading = useCallback((surahId: number, ayahNumber: number) => {
    if (isLoading || !Number.isInteger(surahId) || surahId < 1 || surahId > 114 || !Number.isInteger(ayahNumber) || ayahNumber < 1 || ayahNumber > 286) return;
    if (!isAuthenticated) {
      recordGuestReading(surahId, ayahNumber);
      return;
    }

    const timeZone = getReadingTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const today = getReadingDateKey(new Date(), timeZone);
    const verseKey = `${surahId}:${ayahNumber}`;
    const current = progressRef.current ?? emptyProgress();
    const todayKeys = new Set(current.dailyReadVerseKeys[today] ?? []);
    const wasReadToday = todayKeys.has(verseKey);
    todayKeys.add(verseKey);
    const nextProgress: ReaderProgress = {
      lastSurahId: surahId,
      lastAyahId: ayahNumber,
      timeZone,
      surahProgress: {
        ...current.surahProgress,
        [String(surahId)]: Math.max(current.surahProgress[String(surahId)] ?? 0, ayahNumber),
      },
      dailyActivity: {
        ...current.dailyActivity,
        [today]: wasReadToday ? current.dailyActivity[today] ?? todayKeys.size : Math.max((current.dailyActivity[today] ?? 0) + 1, todayKeys.size),
      },
      dailyReadVerseKeys: { ...current.dailyReadVerseKeys, [today]: [...todayKeys] },
    };
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    setProgressError(null);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => {
      const latest = progressRef.current;
      if (!latest) return;
      void sendUserData("/api/user-data/progress", "POST", latest)
        .then(() => window.dispatchEvent(new Event("sakinah-user-data-change")))
        .catch(() => {
          const guestData = getGuestUserDataSnapshot();
          saveGuestUserData({ ...guestData, progress: latest });
          try {
            window.sessionStorage.setItem("sakinah:guest-sync-pending", "1");
          } catch {
            setProgressError("Reading progress could not sync. Please try again while online.");
          }
          window.dispatchEvent(new Event("sakinah-guest-sync-state-change"));
          setProgressError("Reading progress could not sync. It has been saved on this device.");
        });
    }, 700);
  }, [isAuthenticated, isLoading]);

  const toggleBookmark = useCallback(async (bookmark: ReaderBookmark) => {
    const existing = bookmarks.find((item) => item.verseKey === bookmark.verseKey);
    if (isAuthenticated && existing?.id) {
      await sendUserData(`/api/user-data/bookmarks/${existing.id}`, "DELETE");
      setBookmarks((current) => current.filter((item) => item.verseKey !== bookmark.verseKey));
      return;
    }
    if (isAuthenticated) {
      const result = await sendUserData("/api/user-data/bookmarks", "POST", bookmark) as { data?: unknown } | null;
      const saved = readBookmarks(result?.data ? [result.data] : [bookmark])[0];
      setBookmarks((current) => current.some((item) => item.verseKey === bookmark.verseKey)
        ? current
        : [...current, saved]);
      return;
    }
    const guestData = getGuestUserDataSnapshot();
    const nextBookmarks = existing
      ? guestData.bookmarks.filter((item) => item.verseKey !== bookmark.verseKey)
      : [...guestData.bookmarks, bookmark];
    saveGuestUserData({ ...guestData, bookmarks: nextBookmarks });
    setBookmarks(nextBookmarks);
  }, [bookmarks, isAuthenticated]);

  const saveNote = useCallback(async (bookmark: ReaderBookmark, content: string) => {
    const existing = notes.find((item) => item.verseKey === bookmark.verseKey);
    const payload = { ...bookmark, content: content.trim() };
    if (isAuthenticated) {
      const result = existing?.id
        ? await sendUserData(`/api/user-data/notes/${existing.id}`, "PATCH", payload)
        : await sendUserData("/api/user-data/notes", "POST", payload);
      const saved = readNotes(result?.data ? [result.data] : [payload])[0];
      setNotes((current) => [...current.filter((item) => item.verseKey !== bookmark.verseKey), saved]);
      return;
    }
    const guestData = getGuestUserDataSnapshot();
    const nextNotes = [...guestData.notes.filter((item) => item.verseKey !== bookmark.verseKey), payload];
    saveGuestUserData({ ...guestData, notes: nextNotes });
    setNotes(nextNotes);
  }, [isAuthenticated, notes]);

  const deleteNote = useCallback(async (note: ReaderNote) => {
    if (isAuthenticated && note.id) {
      await sendUserData(`/api/user-data/notes/${note.id}`, "DELETE");
      setNotes((current) => current.filter((item) => item.verseKey !== note.verseKey));
      return;
    }
    const guestData = getGuestUserDataSnapshot();
    const nextNotes = guestData.notes.filter((item) => item.verseKey !== note.verseKey);
    saveGuestUserData({ ...guestData, notes: nextNotes });
    setNotes(nextNotes);
  }, [isAuthenticated]);

  const value = useMemo<ReaderUserDataValue>(() => ({
    bookmarks,
    notes,
    isLoading,
    isAuthenticated,
    progress,
    progressError,
    recordReading,
    toggleBookmark,
    saveNote,
    deleteNote,
  }), [bookmarks, notes, isLoading, isAuthenticated, progress, progressError, recordReading, toggleBookmark, saveNote, deleteNote]);

  return (
    <ReaderUserDataContext.Provider value={value}>
      {children}
    </ReaderUserDataContext.Provider>
  );
}

function readProgress(value: unknown): ReaderProgress | null {
  if (!isRecord(value)) return null;
  const lastSurahId = typeof value.lastSurahId === "number" ? value.lastSurahId : null;
  const lastAyahId = typeof value.lastAyahId === "number" ? value.lastAyahId : null;
  const surahProgress = isRecord(value.surahProgress) ? value.surahProgress : {};
  const dailyActivity = isRecord(value.dailyActivity) ? value.dailyActivity : {};
  const verseMap = isRecord(value.dailyReadVerseKeys) ? value.dailyReadVerseKeys : {};
  const dailyReadVerseKeys: Record<string, string[]> = {};
  for (const [day, keys] of Object.entries(verseMap)) {
    if (Array.isArray(keys)) dailyReadVerseKeys[day] = [...new Set(keys.filter((key): key is string => typeof key === "string"))];
  }
  const numericMap = (input: Record<string, unknown>) => Object.fromEntries(
    Object.entries(input).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
  return {
    lastSurahId,
    lastAyahId,
    timeZone: getReadingTimeZone(value.timeZone),
    surahProgress: numericMap(surahProgress),
    dailyActivity: numericMap(dailyActivity),
    dailyReadVerseKeys,
  };
}

function emptyProgress(): ReaderProgress {
  return { lastSurahId: null, lastAyahId: null, surahProgress: {}, dailyActivity: {}, dailyReadVerseKeys: {} };
}