"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  getIslamicPreferencesSnapshot,
  updateIslamicPreferences,
} from "@/components/islamic/islamic-preferences";
import { HIJRI_CALENDAR_METHODS, type HijriCalendarDay, type HijriCalendarMethod } from "@/types/islamic";

function gregorianMonthName(month: number, year: number) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

export function HijriCalendarPanel({
  initialMonth,
  initialYear,
  today,
  initialDays,
  initialMessage,
}: {
  readonly initialMonth: number;
  readonly initialYear: number;
  readonly today: string;
  readonly initialDays: HijriCalendarDay[];
  readonly initialMessage?: string | null;
}) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [days, setDays] = useState(initialDays);
  const [method, setMethod] = useState<HijriCalendarMethod>(getIslamicPreferencesSnapshot().calendarMethod);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage ?? null);

  async function loadMonth(nextMonth: number, nextYear: number, nextMethod = method) {
    setPending(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ month: String(nextMonth), year: String(nextYear), method: nextMethod });
      const response = await fetch(`/api/islamic/calendar?${params.toString()}`, { cache: "no-store" });
      const result = await response.json() as { data?: HijriCalendarDay[]; message?: string };
      if (!response.ok || !result.data) throw new Error(result.message ?? "Calendar data is unavailable.");
      setMonth(nextMonth);
      setYear(nextYear);
      setDays(result.data);
      setMethod(nextMethod);
      updateIslamicPreferences({ calendarMethod: nextMethod });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Calendar data could not be loaded.");
    } finally {
      setPending(false);
    }
  }

  function changeMonth(offset: -1 | 1) {
    const next = new Date(Date.UTC(year, month - 1 + offset, 1));
    void loadMonth(next.getUTCMonth() + 1, next.getUTCFullYear());
  }

  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const calendarCells: (HijriCalendarDay | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...days,
  ];
  const monthNames = [...new Set(days.map((day) => `${day.hijriMonthName} ${day.hijriYear}`))];
  const calendarDaysWithHolidays = days.filter((day) => day.holidays.length > 0);

  return (
    <section className="hijri-calendar-panel" aria-labelledby="hijri-calendar-month">
      <div className="calendar-toolbar">
        <Button type="button" variant="secondary" aria-label="Previous month" disabled={pending || (year === 1900 && month === 1)} onClick={() => changeMonth(-1)}>←</Button>
        <div className="calendar-month-title">
          <h2 id="hijri-calendar-month">{gregorianMonthName(month, year)}</h2>
          <p>{monthNames.length ? monthNames.join(" / ") : "Hijri dates unavailable"}</p>
        </div>
        <Button type="button" variant="secondary" aria-label="Next month" disabled={pending || (year === 2200 && month === 12)} onClick={() => changeMonth(1)}>→</Button>
      </div>

      <div className="calendar-method-row">
        <label htmlFor="calendar-method">Hijri date convention</label>
        <select id="calendar-method" value={method} disabled={pending} onChange={(event) => void loadMonth(month, year, event.currentTarget.value as HijriCalendarMethod)}>
          {HIJRI_CALENDAR_METHODS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>

      {message ? <output className="calendar-error" aria-live="polite">{message}</output> : null}
      {pending ? <p className="calendar-loading" aria-live="polite">Loading calendar...</p> : null}
      {!pending && !days.length && !message ? <p className="calendar-empty">No calendar dates were returned for this month.</p> : null}
      {days.length ? (
        <div className="calendar-grid" role="grid" aria-label={`${gregorianMonthName(month, year)} with Hijri dates`} aria-busy={pending}>
          {(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const).map((weekday) => (
            <div className="calendar-weekday" role="columnheader" key={weekday}>{weekday.slice(0, 3)}</div>
          ))}
          {calendarCells.map((day, index) => day ? (
            <div className={`calendar-day${day.gregorianDate === today ? " is-today" : ""}${day.holidays.length ? " has-holiday" : ""}`} role="gridcell" key={day.gregorianDate} aria-label={`${day.gregorianDate}, ${day.hijriDate}${day.holidays.length ? `, ${day.holidays.join(", ")}` : ""}`}>
              <span className="calendar-gregorian-day">{day.gregorianDay}</span>
              <span className="calendar-hijri-day" lang="ar" dir="rtl">{day.hijriDay}</span>
              {day.holidays.length ? <span className="calendar-holiday" title={day.holidays.join(", ")}>{day.holidays[0]}</span> : null}
            </div>
          ) : <div className="calendar-day is-empty" role="gridcell" aria-hidden="true" key={`empty-${index}`} />)}
        </div>
      ) : null}

      <p className="calendar-attribution">Dates from AlAdhan using {HIJRI_CALENDAR_METHODS.find((item) => item.id === method)?.name}. Local moon-sighting declarations may differ.</p>
      {calendarDaysWithHolidays.length ? (
        <section className="calendar-holidays" aria-labelledby="calendar-holidays-title">
          <h3 id="calendar-holidays-title">Dates listed by source</h3>
          <ul>{calendarDaysWithHolidays.flatMap((day) => day.holidays.map((holiday) => <li key={`${day.gregorianDate}:${holiday}`}><span>{day.hijriDate}</span>{holiday}</li>))}</ul>
        </section>
      ) : null}
    </section>
  );
}