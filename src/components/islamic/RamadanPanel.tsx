"use client";

import Link from "next/link";
import { useState } from "react";
import { useSyncExternalStore } from "react";
import {
  getIslamicPreferencesSnapshot,
  getServerIslamicPreferencesSnapshot,
  subscribeToIslamicPreferences,
  updateIslamicPreferences,
} from "@/components/islamic/islamic-preferences";
import { HIJRI_CALENDAR_METHODS, type HijriCalendarDay, type HijriCalendarMethod } from "@/types/islamic";
import { Button } from "@/components/ui/Button";

interface HijriDate {
  readonly day: number;
  readonly month: number;
  readonly year: number;
}

export function RamadanPanel({
  today,
  hijriToday,
  ramadanYear,
  initialDates,
  initialMessage,
}: {
  readonly today: string;
  readonly hijriToday: HijriDate | null;
  readonly ramadanYear: number;
  readonly initialDates: HijriCalendarDay[];
  readonly initialMessage?: string | null;
}) {
  const preferences = useSyncExternalStore(
    subscribeToIslamicPreferences,
    getIslamicPreferencesSnapshot,
    getServerIslamicPreferencesSnapshot,
  );
  const [dates, setDates] = useState(initialDates);
  const [method, setMethod] = useState<HijriCalendarMethod>(preferences.calendarMethod);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);
  const [pending, setPending] = useState(false);
  const currentRamadanDay = hijriToday?.year === ramadanYear && hijriToday.month === 9 ? hijriToday.day : null;
  const firstDate = dates[0]?.gregorianDate ?? null;
  const lastDate = dates.at(-1)?.gregorianDate ?? null;

  async function changeMethod(nextMethod: HijriCalendarMethod) {
    setMethod(nextMethod);
    setPending(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ year: String(ramadanYear), method: nextMethod });
      const response = await fetch(`/api/islamic/ramadan?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as { data?: HijriCalendarDay[]; message?: string };
      if (!response.ok || !result.data) throw new Error(result.message ?? "Ramadan dates are unavailable.");
      setDates(result.data);
      updateIslamicPreferences({ calendarMethod: nextMethod });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ramadan dates could not be loaded.");
      setMethod(preferences.calendarMethod);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ramadan-page-content">
      <section className="ramadan-date-section" aria-labelledby="ramadan-date-title">
        <div className="ramadan-date-heading">
          <div>
            <span className="eyebrow">Hijri year {ramadanYear}</span>
            <h2 id="ramadan-date-title">{currentRamadanDay ? `Ramadan day ${currentRamadanDay}` : "Ramadan dates"}</h2>
          </div>
          <div className="ramadan-date-range">
            <span>Estimated Gregorian range</span>
            <strong>{firstDate && lastDate ? `${firstDate} – ${lastDate}` : "Unavailable"}</strong>
          </div>
        </div>
        <div className="ramadan-convention-row">
          <label htmlFor="ramadan-calendar-method">Date convention</label>
          <select id="ramadan-calendar-method" value={method} disabled={pending} onChange={(event) => void changeMethod(event.currentTarget.value as HijriCalendarMethod)}>
            {HIJRI_CALENDAR_METHODS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
        <p className="ramadan-date-disclaimer">Dates are calculated by AlAdhan using the selected convention and may differ from local moon-sighting announcements.</p>
        {message ? <output className="calendar-error" aria-live="polite">{message}</output> : null}
        {pending ? <p className="calendar-loading" aria-live="polite">Updating dates...</p> : null}
      </section>

      <section className="ramadan-links-section" aria-labelledby="ramadan-rhythm-title">
        <h2 id="ramadan-rhythm-title">Daily rhythm</h2>
        <p>Use the Fajr time as your local suhoor cutoff and Maghrib for iftar in the selected prayer schedule.</p>
        <div className="ramadan-actions">
          <Link className="button button-primary" href="/prayer">Open prayer schedule</Link>
          <Link className="button button-secondary" href="/dashboard">Reading progress and personal goal</Link>
          <Link className="button button-secondary" href="/calendar">Open Hijri calendar</Link>
        </div>
      </section>

      <section className="ramadan-links-section" aria-labelledby="ramadan-dua-title">
        <h2 id="ramadan-dua-title">Duas</h2>
        <p>Verified Ramadan dua content is not connected yet; no unsourced text is shown.</p>
        <Button type="button" variant="secondary" disabled>Verified source unavailable</Button>
      </section>
      <p className="ramadan-today-note">Calendar reference date: {today}</p>
    </div>
  );
}