"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import {
  getIslamicPreferencesSnapshot,
  getServerIslamicPreferencesSnapshot,
  subscribeToIslamicPreferences,
  updateIslamicPreferences,
} from "@/components/islamic/islamic-preferences";
import { PRAYER_CALCULATION_METHODS, type PrayerTimesData } from "@/types/islamic";

type PrayerName = "Fajr" | "Sunrise" | "Dhuhr" | "Asr" | "Maghrib" | "Isha";
const PRAYER_NAMES: readonly PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
const NEXT_PRAYER_NAMES: readonly Exclude<PrayerName, "Sunrise">[] = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

function dateAfter(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + 1);
  return value.toISOString().slice(0, 10);
}

function formatTodayInTimezone(timezone: string, timestamp: number) {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(timestamp);
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

function minutesInDay(time: string) {
  const match = /^([0-2][0-9]):([0-5][0-9])$/.exec(time);
  if (!match) return null;
  const hours = Number(match[1]);
  return hours < 24 ? hours * 60 + Number(match[2]) : null;
}

function zonedWallTime(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const minute = minutesInDay(time);
  if (!year || !month || !day || minute === null) return null;
  const targetWallTime = Date.UTC(year, month - 1, day, Math.floor(minute / 60), minute % 60);
  let timestamp = targetWallTime;
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(timestamp).map(({ type, value }) => [type, value]));
      const displayedAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
      timestamp += targetWallTime - displayedAsUtc;
    }
    return timestamp;
  } catch {
    return new Date(`${date}T${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}:00`).getTime();
  }
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function PrayerTimesPanel({ today }: { readonly today: string }) {
  const preferences = useSyncExternalStore(subscribeToIslamicPreferences, getIslamicPreferencesSnapshot, getServerIslamicPreferencesSnapshot);
  const [date, setDate] = useState(today);
  const [data, setData] = useState<PrayerTimesData | null>(null);
  const [tomorrowFajr, setTomorrowFajr] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadTimes(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preferences.latitude === null && (!preferences.city || !preferences.country)) {
      setMessage("Choose a city and country, or explicitly use your device location.");
      return;
    }
    setPending(true);
    setMessage(null);
    setData(null);
    setTomorrowFajr(null);
    const buildUrl = (requestedDate: string) => {
      const params = new URLSearchParams({ date: requestedDate, method: String(preferences.prayerMethod), school: String(preferences.school) });
      if (preferences.latitude !== null && preferences.longitude !== null) {
        params.set("latitude", String(preferences.latitude));
        params.set("longitude", String(preferences.longitude));
      } else {
        params.set("city", preferences.city);
        params.set("country", preferences.country);
      }
      return `/api/islamic/prayer-times?${params.toString()}`;
    };
    try {
      const [response, nextResponse] = await Promise.all([
        fetch(buildUrl(date), { cache: "no-store" }),
        fetch(buildUrl(dateAfter(date)), { cache: "no-store" }),
      ]);
      const result = await response.json() as { data?: PrayerTimesData; message?: string };
      const nextResult = await nextResponse.json() as { data?: PrayerTimesData };
      if (!response.ok || !result.data) throw new Error(result.message ?? "Prayer times are unavailable for this location.");
      setData(result.data);
      setTomorrowFajr(nextResult.data?.timings.Fajr ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Prayer times could not be loaded.");
    } finally {
      setPending(false);
    }
  }

  function useDeviceLocation() {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage("This browser does not support location. Enter a city and country instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateIslamicPreferences({ city: "", country: "", latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("Using coordinates you shared from this device.");
      },
      () => setLocationMessage("Location permission was unavailable. Enter a city and country instead."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  const locationLabel = preferences.latitude !== null && preferences.longitude !== null
    ? `Coordinates ${preferences.latitude.toFixed(3)}, ${preferences.longitude.toFixed(3)}`
    : preferences.city && preferences.country
      ? `${preferences.city}, ${preferences.country}`
      : null;
  const locationDate = data && now ? formatTodayInTimezone(data.timezone, now) : null;
  const localMinutes = data && now
    ? Number(new Intl.DateTimeFormat("en-GB", { timeZone: data.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":")[0]) * 60 + Number(new Intl.DateTimeFormat("en-GB", { timeZone: data.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now).split(":")[1])
    : null;
  const nextName = data && localMinutes !== null
    ? NEXT_PRAYER_NAMES.find((name) => (minutesInDay(data.timings[name]) ?? -1) > localMinutes) ?? (tomorrowFajr ? "Fajr" : null)
    : null;
  const currentName = data && localMinutes !== null
    ? [...NEXT_PRAYER_NAMES].reverse().find((name) => (minutesInDay(data.timings[name]) ?? 1441) <= localMinutes) ?? "Before Fajr"
    : null;
  const nextTime = data && nextName ? nextName === "Fajr" && localMinutes !== null && (minutesInDay(data.timings.Fajr) ?? 0) <= localMinutes ? tomorrowFajr : data.timings[nextName] : null;
  const countdownTarget = data && date === locationDate && nextName && nextTime
    ? zonedWallTime(nextName === "Fajr" && localMinutes !== null && (minutesInDay(data.timings.Fajr) ?? 0) <= localMinutes ? dateAfter(date) : date, nextTime, data.timezone)
    : null;
  const countdown = countdownTarget !== null && now ? formatCountdown(countdownTarget - now) : null;

  return (
    <div className="prayer-times-panel">
      <form className="prayer-times-form" onSubmit={loadTimes}>
        <div className="prayer-location-fields">
          <div>
            <label htmlFor="prayer-city">City</label>
            <input id="prayer-city" value={preferences.city} disabled={preferences.latitude !== null} maxLength={80} onChange={(event) => updateIslamicPreferences({ city: event.currentTarget.value, latitude: null, longitude: null })} placeholder="For example, London" />
          </div>
          <div>
            <label htmlFor="prayer-country">Country</label>
            <input id="prayer-country" value={preferences.country} disabled={preferences.latitude !== null} maxLength={80} onChange={(event) => updateIslamicPreferences({ country: event.currentTarget.value, latitude: null, longitude: null })} placeholder="For example, United Kingdom" />
          </div>
          <Button type="button" variant="secondary" onClick={useDeviceLocation}>Use my location</Button>
        </div>
        {locationLabel ? <p className="prayer-location-label">Location used: <strong>{locationLabel}</strong></p> : <p className="prayer-location-label">No location selected.</p>}
        {locationMessage ? <output className="prayer-status" aria-live="polite">{locationMessage}</output> : null}
        <div className="prayer-settings-fields">
          <div>
            <label htmlFor="prayer-date">Date</label>
            <input id="prayer-date" type="date" value={date} onChange={(event) => setDate(event.currentTarget.value)} />
          </div>
          <div>
            <label htmlFor="prayer-method">Calculation method</label>
            <select id="prayer-method" value={preferences.prayerMethod} onChange={(event) => updateIslamicPreferences({ prayerMethod: Number(event.currentTarget.value) })}>
              {PRAYER_CALCULATION_METHODS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="prayer-school">Asr method</label>
            <select id="prayer-school" value={preferences.school} onChange={(event) => updateIslamicPreferences({ school: Number(event.currentTarget.value) as 0 | 1 })}>
              <option value={0}>Shafi (standard)</option>
              <option value={1}>Hanafi</option>
            </select>
          </div>
        </div>
        <Button type="submit" disabled={pending || !locationLabel}>{pending ? "Loading times..." : "Show prayer times"}</Button>
      </form>

      {message ? <output className="prayer-error" aria-live="polite">{message}</output> : null}
      {data ? (
        <section className="prayer-times-results" aria-labelledby="prayer-times-title">
          <div className="prayer-times-results-heading">
            <div>
              <span>{data.gregorianDate} · {data.hijriDate} {data.hijriMonth} {data.hijriYear} AH</span>
              <h2 id="prayer-times-title">{locationLabel}</h2>
              <p>{data.method} · {data.timezone}</p>
            </div>
            {countdown && nextName ? <div className="prayer-countdown"><span>Next prayer · {nextName}</span><strong>{countdown}</strong><span>{nextTime}</span></div> : null}
          </div>
          {currentName ? <p className="current-prayer-label">Current period: {currentName}</p> : null}
          <ol className="prayer-time-list" aria-label="Prayer schedule">
            {PRAYER_NAMES.map((name) => (
              <li className="prayer-time-item" key={name}>
                <span>{name}</span><strong>{data.timings[name]}</strong>
              </li>
            ))}
          </ol>
          {date !== locationDate ? <p className="prayer-schedule-note">Countdown is available for the selected location’s current date.</p> : null}
          <p className="prayer-schedule-note">Calculated by AlAdhan. Local mosque schedules may differ.</p>
        </section>
      ) : null}
    </div>
  );
}