"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore, type SyntheticEvent } from "react";
import { Button } from "@/components/ui/Button";
import {
  getGuestUserDataSnapshot,
  getServerGuestUserDataSnapshot,
  saveGuestUserData,
  subscribeToGuestUserData,
  type ReaderGoal,
  type ReaderProgress,
} from "@/components/quran/guest-user-data";
import { createAyahIdentifier } from "@/services/quran/identifiers";
import { getGoalCompletion, getReadingDateKey, getReadingStreak, getReadingTimeZone } from "@/services/quran/reading-metrics";

interface StreakData {
  readonly currentStreak: number;
  readonly longestStreak: number;
}

interface DashboardProgressProps {
  readonly authenticated: boolean;
  readonly today: string;
  readonly initialProgress?: ReaderProgress | null;
  readonly initialGoal?: ReaderGoal | null;
  readonly initialStreak?: StreakData | null;
}

interface ApiResult {
  readonly data?: { readonly targetAyahsPerDay?: number };
}

async function persistGoal(authenticated: boolean, targetAyahsPerDay: number) {
  if (!authenticated) {
    const current = getGuestUserDataSnapshot();
    saveGuestUserData({ ...current, goals: { targetAyahsPerDay } });
    return targetAyahsPerDay;
  }

  const response = await fetch("/api/user-data/goals", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ targetAyahsPerDay }),
  });
  if (!response.ok) throw new Error("Your goal could not be saved. Please try again.");
  const result = await response.json() as ApiResult;
  return result.data?.targetAyahsPerDay ?? targetAyahsPerDay;
}

export function DashboardProgress({
  authenticated,
  today,
  initialProgress = null,
  initialGoal = null,
  initialStreak = null,
}: DashboardProgressProps) {
  const guestData = useSyncExternalStore(subscribeToGuestUserData, getGuestUserDataSnapshot, getServerGuestUserDataSnapshot);
  const [accountGoal, setAccountGoal] = useState(initialGoal);
  const [guestToday, setGuestToday] = useState(today);
  useEffect(() => {
    if (authenticated) return;
    const updateToday = () => setGuestToday(getReadingDateKey(
      new Date(),
      getReadingTimeZone(guestData.progress?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
    ));
    updateToday();
    const timer = window.setInterval(updateToday, 60_000);
    window.addEventListener("focus", updateToday);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", updateToday);
    };
  }, [authenticated, guestData.progress?.timeZone, today]);
  const progress = authenticated ? initialProgress : guestData.progress;
  const goal = authenticated ? accountGoal : guestData.goals;
  const currentDay = authenticated ? today : guestToday;
  const streak = getReadingStreak(progress?.dailyActivity ?? {}, currentDay, initialStreak?.longestStreak);
  const [goalDraft, setGoalDraft] = useState(String(goal?.targetAyahsPerDay ?? ""));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const completedToday = progress?.dailyActivity[currentDay] ?? 0;
  const goalPercent = getGoalCompletion(completedToday, goal?.targetAyahsPerDay ?? null) ?? 0;
  const goalButtonLabel = pending ? "Saving..." : goal ? "Update goal" : "Set goal";
  const lastReadHref = progress?.lastSurahId && progress.lastAyahId
    ? `/quran/surah/${progress.lastSurahId}#${createAyahIdentifier(progress.lastSurahId, progress.lastAyahId)}`
    : "/quran";

  async function saveGoal(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const targetAyahsPerDay = Number(goalDraft);
    if (!Number.isInteger(targetAyahsPerDay) || targetAyahsPerDay < 1 || targetAyahsPerDay > 10000) {
      setMessage("Choose a personal daily target between 1 and 10,000 Ayahs.");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const savedGoal = await persistGoal(authenticated, targetAyahsPerDay);
      if (authenticated) setAccountGoal({ targetAyahsPerDay: savedGoal });
      setGoalDraft(String(savedGoal));
      setMessage("Personal reading goal saved.");
    } catch {
      setMessage("Your goal could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="dashboard-progress" aria-labelledby="dashboard-progress-title">
      <div className="dashboard-progress-heading">
        <div>
          <span className="eyebrow">Your reading rhythm</span>
          <h2 id="dashboard-progress-title">Continue reading</h2>
        </div>
        <Link className="button button-secondary" href={lastReadHref}>
          {progress?.lastSurahId && progress.lastAyahId ? `Resume Ayah ${progress.lastAyahId}` : "Open Quran"}
        </Link>
      </div>
      {progress?.lastSurahId && progress.lastAyahId ? (
        <p className="dashboard-last-read">Last read: Surah {progress.lastSurahId}, Ayah {progress.lastAyahId}</p>
      ) : <p className="dashboard-last-read">No reading position saved yet.</p>}

      <div className="dashboard-progress-row">
        <span>Today&apos;s reading</span>
        <span>{completedToday} Ayahs read</span>
      </div>
      {goal ? (
        <>
          <div className="dashboard-progress-row">
            <span>Personal daily goal</span>
            <span>{completedToday} / {goal.targetAyahsPerDay} Ayahs · {goalPercent}%</span>
          </div>
          <progress className="data-progress-track" aria-label="Personal daily Quran reading goal" max={100} value={goalPercent} />
          {goalPercent >= 100 ? <p className="dashboard-goal-complete">Personal goal complete for today.</p> : null}
        </>
      ) : null}

      <div className="dashboard-streak-row">
        <span>Current streak: {streak?.currentStreak ?? 0} days</span>
        <span>Longest streak: {streak?.longestStreak ?? 0} days</span>
        <small>Reading activity only; not a religious obligation.</small>
      </div>

      <form className="dashboard-goal-form" onSubmit={saveGoal}>
        <label htmlFor="dashboard-daily-goal">Personal Ayahs-per-day target</label>
        <input
          id="dashboard-daily-goal"
          type="number"
          min={1}
          max={10000}
          step={1}
          value={goalDraft}
          onChange={(event) => setGoalDraft(event.currentTarget.value)}
          placeholder="For example, 5"
        />
        <Button type="submit" disabled={pending}>{goalButtonLabel}</Button>
      </form>
      {message ? <output className="dashboard-library-message" aria-live="polite">{message}</output> : null}
    </section>
  );
}