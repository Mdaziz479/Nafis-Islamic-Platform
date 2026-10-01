"use client";

export interface IslamicPreferences {
  readonly city: string;
  readonly country: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly prayerMethod: number;
  readonly school: 0 | 1;
  readonly calendarMethod: "HJCoSA" | "UAQ" | "DIYANET" | "MATHEMATICAL";
}

const STORAGE_KEY = "sakinah:islamic-preferences:v1";
const CHANGE_EVENT = "sakinah:islamic-preferences-change";
const DEFAULT_PREFERENCES: IslamicPreferences = {
  city: "",
  country: "",
  latitude: null,
  longitude: null,
  prayerMethod: 3,
  school: 0,
  calendarMethod: "HJCoSA",
};
let cachedRawValue: string | null | undefined;
let cachedSnapshot = DEFAULT_PREFERENCES;

function normalize(value: unknown): IslamicPreferences {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_PREFERENCES;
  const input = value as Record<string, unknown>;
  const latitude = input.latitude;
  const longitude = input.longitude;
  const validCoordinates = typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  const method = input.prayerMethod;
  const calendarMethod = input.calendarMethod;
  return {
    city: typeof input.city === "string" ? input.city.trim().slice(0, 80) : "",
    country: typeof input.country === "string" ? input.country.trim().slice(0, 80) : "",
    latitude: validCoordinates ? latitude : null,
    longitude: validCoordinates ? longitude : null,
    prayerMethod: typeof method === "number" && Number.isInteger(method) && ((method >= 0 && method <= 23) || method === 99) ? method : 3,
    school: input.school === 1 ? 1 : 0,
    calendarMethod: calendarMethod === "UAQ" || calendarMethod === "DIYANET" || calendarMethod === "MATHEMATICAL" ? calendarMethod : "HJCoSA",
  };
}

export function getIslamicPreferencesSnapshot(): IslamicPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRawValue) {
      cachedRawValue = raw;
      cachedSnapshot = raw ? normalize(JSON.parse(raw)) : DEFAULT_PREFERENCES;
    }
    return cachedSnapshot;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function getServerIslamicPreferencesSnapshot() {
  return DEFAULT_PREFERENCES;
}

export function updateIslamicPreferences(update: Partial<IslamicPreferences>) {
  cachedSnapshot = normalize({ ...getIslamicPreferencesSnapshot(), ...update });
  cachedRawValue = JSON.stringify(cachedSnapshot);
  try {
    window.localStorage.setItem(STORAGE_KEY, cachedRawValue);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    cachedRawValue = undefined;
  }
}

export function subscribeToIslamicPreferences(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}