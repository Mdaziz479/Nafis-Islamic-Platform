"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import {
  getGuestUserDataSnapshot,
  getServerGuestUserDataSnapshot,
  subscribeToGuestUserData,
  type ReaderGoal,
  type ReaderProgress,
} from "@/components/quran/guest-user-data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ROUTES } from "@/lib/constants/routes";
import { createAyahIdentifier } from "@/services/quran/identifiers";
import { getGoalCompletion, getReadingDateKey, getReadingStreak, getReadingTimeZone } from "@/services/quran/reading-metrics";

interface HomeAccountData {
  readonly progress: ReaderProgress | null;
  readonly goal: ReaderGoal | null;
  readonly longestStreak: number;
  readonly bookmarkCount: number;
  readonly noteCount: number;
  readonly collectionCount: number;
}

interface ApiResult {
  readonly data?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberMap(value: unknown) {
  return isRecord(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1])))
    : {};
}

function readProgress(value: unknown): ReaderProgress | null {
  if (!isRecord(value)) return null;
  const lastSurahId = typeof value.lastSurahId === "number" ? value.lastSurahId : null;
  const lastAyahId = typeof value.lastAyahId === "number" ? value.lastAyahId : null;
  const verseKeys = isRecord(value.dailyReadVerseKeys) ? value.dailyReadVerseKeys : {};
  const dailyReadVerseKeys = Object.fromEntries(Object.entries(verseKeys).flatMap(([day, keys]) =>
    Array.isArray(keys) ? [[day, [...new Set(keys.filter((key): key is string => typeof key === "string"))]]] : [],
  ));
  return {
    lastSurahId,
    lastAyahId,
    timeZone: getReadingTimeZone(value.timeZone),
    surahProgress: numberMap(value.surahProgress),
    dailyActivity: numberMap(value.dailyActivity),
    dailyReadVerseKeys,
  };
}

function readGoal(value: unknown): ReaderGoal | null {
  if (!isRecord(value) || typeof value.targetAyahsPerDay !== "number" || value.targetAyahsPerDay < 1) return null;
  return { targetAyahsPerDay: value.targetAyahsPerDay };
}

async function getResource(resource: string, signal: AbortSignal) {
  const response = await fetch(`/api/user-data/${resource}`, { cache: "no-store", signal });
  if (!response.ok) throw new Error("Your saved account data could not be loaded.");
  return response.json() as Promise<ApiResult>;
}

function arrayCount(value: unknown) {
  return Array.isArray(value) ? value.length : 0;
}

export function HomeProgressSection() {
  const auth = useAuth();
  const user = auth?.user ?? null;
  const authLoading = auth?.isLoading ?? false;
  const guestData = useSyncExternalStore(subscribeToGuestUserData, getGuestUserDataSnapshot, getServerGuestUserDataSnapshot);
  const [accountData, setAccountData] = useState<HomeAccountData | null>(null);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const timer = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;

    const activeUserId = user.id;
    let active = true;
    let controller: AbortController | null = null;
    async function load() {
      controller?.abort();
      controller = new AbortController();
      setLoading(true);
      setError(null);
      try {
        const resources = await Promise.all([
          getResource("progress", controller.signal),
          getResource("goals", controller.signal),
          getResource("streak", controller.signal),
          getResource("bookmarks", controller.signal),
          getResource("notes", controller.signal),
          getResource("collections", controller.signal),
        ]);
        if (!active) return;
        const [progress, goal, streak, bookmarks, notes, collections] = resources;
        const streakRecord = isRecord(streak.data) ? streak.data : {};
        setAccountUserId(activeUserId);
        setAccountData({
          progress: readProgress(progress.data),
          goal: readGoal(goal.data),
          longestStreak: typeof streakRecord.longestStreak === "number" ? streakRecord.longestStreak : 0,
          bookmarkCount: arrayCount(bookmarks.data),
          noteCount: arrayCount(notes.data),
          collectionCount: arrayCount(collections.data),
        });
      } catch (loadError) {
        if (!active || (loadError instanceof Error && loadError.name === "AbortError")) return;
        setAccountData(null);
        setError("Your account data is temporarily unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    window.addEventListener("focus", load);
    window.addEventListener("sakinah-user-data-change", load);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener("focus", load);
      window.removeEventListener("sakinah-user-data-change", load);
    };
  }, [authLoading, user, refreshKey]);

  const currentAccountData = user && accountUserId === user.id ? accountData : null;
  const accountError = user ? error : null;
  const isWaiting = authLoading || Boolean(user && (loading || (!currentAccountData && !accountError))) || now === null;
  const progress = user ? currentAccountData?.progress ?? null : guestData.progress;
  const goal = user ? currentAccountData?.goal ?? null : guestData.goals;
  const timeZone = getReadingTimeZone(progress?.timeZone ?? (!user ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined));
  const today = getReadingDateKey(now === null ? new Date(0) : new Date(now), timeZone);
  const completedToday = progress?.dailyActivity[today] ?? 0;
  const goalPercent = getGoalCompletion(completedToday, goal?.targetAyahsPerDay ?? null);
  const streak = getReadingStreak(progress?.dailyActivity ?? {}, today, user ? currentAccountData?.longestStreak : 0);
  const lastReadHref = progress?.lastSurahId && progress.lastAyahId
    ? `${ROUTES.quran}/surah/${progress.lastSurahId}#${createAyahIdentifier(progress.lastSurahId, progress.lastAyahId)}`
    : ROUTES.quran;
  const bookmarkCount = user ? currentAccountData?.bookmarkCount ?? 0 : guestData.bookmarks.length;
  const noteCount = user ? currentAccountData?.noteCount ?? 0 : guestData.notes.length;
  const collectionCount = user ? currentAccountData?.collectionCount ?? 0 : guestData.collections.length;

  return (
    <section className="content-section" aria-labelledby="home-progress-title">
      <SectionHeading
        id="home-progress-title"
        title="Your Quran progress"
        eyebrow="Your space"
        description="Reading activity and goals from your account or this device."
      />
      {isWaiting ? (
        <p className="home-progress-status" role="status">Loading your reading progress…</p>
      ) : accountError ? (
        <div className="home-progress-status" role="alert">
          <p>{accountError}</p>
          <Button type="button" variant="secondary" onClick={() => setRefreshKey((key) => key + 1)}>Try again</Button>
        </div>
      ) : (
        <div className="home-progress-grid">
          <Card className="home-progress-card">
            <span className="card-label">Recent reading</span>
            <h3 className="reading-surah">{progress?.lastSurahId ? `Surah ${progress.lastSurahId}` : "Ready to begin"}</h3>
            <p className="reading-reference">
              {progress?.lastAyahId ? `Last position: Ayah ${progress.lastAyahId}` : "No saved reading position yet."}
            </p>
            <p className="home-progress-detail">Today: {completedToday} {completedToday === 1 ? "Ayah" : "Ayahs"} recorded</p>
            <Link className="button button-primary" href={lastReadHref}>
              {progress?.lastSurahId ? "Resume Quran" : "Open Quran"} <span aria-hidden="true">→</span>
            </Link>
          </Card>

          <Card className="home-progress-card">
            <span className="card-label">Daily reading goal</span>
            {goal ? (
              <>
                <h3 className="reading-surah">{completedToday} / {goal.targetAyahsPerDay} Ayahs</h3>
                <p className="reading-reference">{goalPercent}% of today&apos;s target · {streak.currentStreak} day streak</p>
                <progress className="data-progress-track" aria-label="Today's Quran reading goal" max={100} value={goalPercent ?? 0} />
                {goalPercent === 100 ? <p className="home-progress-detail">Daily target complete.</p> : null}
              </>
            ) : (
              <>
                <h3 className="reading-surah">No target set</h3>
                <p className="reading-reference">Reading goal and streak begin with your saved activity.</p>
              </>
            )}
            <Link className="button button-secondary" href={ROUTES.dashboard}>Manage goal and library</Link>
          </Card>

          <Card className="home-progress-card home-library-summary">
            <span className="card-label">Saved library</span>
            <ul>
              <li><span>Bookmarks</span><strong>{bookmarkCount}</strong></li>
              <li><span>Notes</span><strong>{noteCount}</strong></li>
              <li><span>Collections</span><strong>{collectionCount}</strong></li>
            </ul>
            <Link className="button button-secondary" href={ROUTES.dashboard}>Open saved items</Link>
          </Card>
        </div>
      )}
    </section>
  );
}