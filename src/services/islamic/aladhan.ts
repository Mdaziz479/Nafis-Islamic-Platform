import "server-only";

import type { HijriCalendarDay, PrayerTimesData } from "@/types/islamic";

const API_BASE = "https://api.aladhan.com/v1";
const CALENDAR_METHODS = new Set(["HJCoSA", "UAQ", "DIYANET", "MATHEMATICAL"]);

export interface PrayerTimesQuery {
  readonly date: string;
  readonly city?: string;
  readonly country?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly method: number;
  readonly school: 0 | 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clean(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
}

function methodIsValid(method: number) {
  return Number.isInteger(method) && ((method >= 0 && method <= 23) || method === 99);
}

function formatAladhanDate(value: string) {
  const parts = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!parts) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? `${parts[3]}-${parts[2]}-${parts[1]}`
    : null;
}

async function readResponse(url: URL, revalidateSeconds: number) {
  const response = await fetch(url, { next: { revalidate: revalidateSeconds } });
  if (!response.ok) throw new Error("The Islamic calendar provider is unavailable.");
  const result: unknown = await response.json();
  if (!isRecord(result) || result.code !== 200) throw new Error("The Islamic calendar provider returned an invalid response.");
  return result.data;
}

function normalizeHijriCalendarDays(raw: unknown): HijriCalendarDay[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry): HijriCalendarDay[] => {
    if (!isRecord(entry) || !isRecord(entry.gregorian) || !isRecord(entry.hijri)) return [];
    const gregorian = entry.gregorian;
    const hijri = entry.hijri;
    const hijriMonth = isRecord(hijri.month) ? hijri.month : {};
    const weekday = isRecord(gregorian.weekday) ? gregorian.weekday : {};
    const hijriWeekday = isRecord(hijri.weekday) ? hijri.weekday : {};
    const gregorianDay = Number(gregorian.day);
    const hijriDay = Number(hijri.day);
    const monthNumber = Number(hijriMonth.number);
    const hijriYear = Number(hijri.year);
    if (typeof gregorian.date !== "string" || !Number.isInteger(gregorianDay) || !Number.isInteger(hijriDay) || !Number.isInteger(monthNumber) || !Number.isInteger(hijriYear)) return [];
    return [{
      gregorianDate: gregorian.date,
      gregorianDay,
      weekday: typeof weekday.en === "string" ? weekday.en : typeof hijriWeekday.en === "string" ? hijriWeekday.en : "",
      hijriDate: typeof hijri.date === "string" ? hijri.date : "",
      hijriDay,
      hijriMonth: monthNumber,
      hijriMonthName: typeof hijriMonth.en === "string" ? hijriMonth.en : "",
      hijriMonthArabic: typeof hijriMonth.ar === "string" ? hijriMonth.ar : "",
      hijriYear,
      holidays: Array.isArray(hijri.holidays) ? hijri.holidays.filter((holiday): holiday is string => typeof holiday === "string") : [],
      lunarSighting: typeof gregorian.lunarSighting === "boolean" ? gregorian.lunarSighting : null,
    }];
  });
}

export async function getPrayerTimes(query: PrayerTimesQuery) {
  const date = formatAladhanDate(query.date);
  const city = clean(query.city, 80);
  const country = clean(query.country, 80);
  const hasCoordinates = typeof query.latitude === "number" && Number.isFinite(query.latitude) && query.latitude >= -90 && query.latitude <= 90 &&
    typeof query.longitude === "number" && Number.isFinite(query.longitude) && query.longitude >= -180 && query.longitude <= 180;
  const hasCity = Boolean(city && country);
  if (!date || (!hasCoordinates && !hasCity) || !methodIsValid(query.method) || (query.school !== 0 && query.school !== 1)) {
    return { data: null, message: "Choose a valid date, city, country, calculation method, and Asr method." };
  }

  try {
    const url = new URL(`${API_BASE}/${hasCoordinates ? `timings/${date}` : `timingsByCity/${date}`}`);
    const params = new URLSearchParams({ method: String(query.method), school: String(query.school) });
    if (hasCoordinates) {
      params.set("latitude", String(query.latitude));
      params.set("longitude", String(query.longitude));
    } else {
      params.set("city", city ?? "");
      params.set("country", country ?? "");
    }
    url.search = params.toString();
    const raw = await readResponse(url, 1800);
    if (!isRecord(raw) || !isRecord(raw.timings) || !isRecord(raw.date) || !isRecord(raw.date.gregorian) || !isRecord(raw.date.hijri) || !isRecord(raw.meta)) {
      return { data: null, message: "Prayer-time data is unavailable for this location." };
    }
    const timings = raw.timings;
    const gregorian = raw.date.gregorian;
    const hijri = raw.date.hijri;
    const month = isRecord(hijri.month) ? hijri.month : {};
    const method = isRecord(raw.meta.method) ? raw.meta.method : {};
    const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
    if (!prayerNames.every((name) => typeof timings[name] === "string")) {
      return { data: null, message: "Prayer-time data is incomplete for this location." };
    }
    return {
      data: {
        timings: Object.fromEntries(prayerNames.map((name) => [name, (timings[name] as string).replace(/\s*\([^)]*\)$/, "")])) as PrayerTimesData["timings"],
        gregorianDate: typeof gregorian.date === "string" ? gregorian.date : query.date,
        hijriDate: typeof hijri.date === "string" ? hijri.date : "",
        hijriMonth: typeof month.en === "string" ? month.en : "",
        hijriYear: typeof hijri.year === "string" ? hijri.year : "",
        timezone: typeof raw.meta.timezone === "string" ? raw.meta.timezone : "",
        method: typeof method.name === "string" ? method.name : String(query.method),
      } satisfies PrayerTimesData,
      message: null,
    };
  } catch {
    return { data: null, message: "Prayer times could not be loaded. Check your location and try again." };
  }
}

export async function getQiblaDirection(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { data: null, message: "Enter valid latitude and longitude coordinates." };
  }
  try {
    const url = new URL(`${API_BASE}/qibla/${latitude}/${longitude}`);
    const raw = await readResponse(url, 86400);
    if (!isRecord(raw) || typeof raw.direction !== "number" || typeof raw.latitude !== "number" || typeof raw.longitude !== "number") {
      return { data: null, message: "Qibla bearing is unavailable for these coordinates." };
    }
    return { data: { direction: raw.direction, latitude: raw.latitude, longitude: raw.longitude }, message: null };
  } catch {
    return { data: null, message: "Qibla bearing could not be loaded. Please try again." };
  }
}

export async function getHijriCalendar(month: number, year: number, calendarMethod: string) {
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 2200 || !CALENDAR_METHODS.has(calendarMethod)) {
    return { data: null, message: "Choose a valid Gregorian month, year, and Hijri date convention." };
  }
  try {
    const url = new URL(`${API_BASE}/gToHCalendar/${month}/${year}`);
    url.searchParams.set("calendarMethod", calendarMethod);
    const raw = await readResponse(url, 86400);
    const days = normalizeHijriCalendarDays(raw);
    return days.length ? { data: days, message: null } : { data: null, message: "Hijri calendar data was incomplete." };
  } catch {
    return { data: null, message: "Hijri calendar could not be loaded. Please try again." };
  }
}

export function isSupportedCalendarMethod(value: string) {
  return CALENDAR_METHODS.has(value);
}

export async function getRamadanCalendar(hijriYear: number, calendarMethod: string) {
  if (!Number.isInteger(hijriYear) || hijriYear < 1300 || hijriYear > 1600 || !CALENDAR_METHODS.has(calendarMethod)) {
    return { data: null, message: "Choose a valid Hijri year and date convention." };
  }
  try {
    const url = new URL(`${API_BASE}/hToGCalendar/9/${hijriYear}`);
    url.searchParams.set("calendarMethod", calendarMethod);
    const raw = await readResponse(url, 86400);
    const days = normalizeHijriCalendarDays(raw);
    return days.length ? { data: days, message: null } : { data: null, message: "Ramadan calendar data was incomplete." };
  } catch {
    return { data: null, message: "Ramadan dates could not be loaded. Please try again." };
  }
}

export async function getHijriDate(date: string, calendarMethod: string) {
  const formattedDate = formatAladhanDate(date);
  if (!formattedDate || !CALENDAR_METHODS.has(calendarMethod)) {
    return { data: null, message: "Choose a valid date and Hijri date convention." };
  }
  try {
    const url = new URL(`${API_BASE}/gToH/${formattedDate}`);
    url.searchParams.set("calendarMethod", calendarMethod);
    const raw = await readResponse(url, 86400);
    if (!isRecord(raw) || !isRecord(raw.hijri) || !isRecord(raw.hijri.month)) return { data: null, message: "Hijri date is unavailable." };
    return {
      data: {
        day: Number(raw.hijri.day),
        month: Number(raw.hijri.month.number),
        year: Number(raw.hijri.year),
      },
      message: null,
    };
  } catch {
    return { data: null, message: "Hijri date could not be loaded." };
  }
}