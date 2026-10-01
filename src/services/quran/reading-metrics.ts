export const DEFAULT_READING_TIME_ZONE = "UTC";

export interface ReadingStreak {
  readonly currentStreak: number;
  readonly longestStreak: number;
}

export function isValidReadingTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function getReadingTimeZone(value: unknown) {
  return isValidReadingTimeZone(value) ? value : DEFAULT_READING_TIME_ZONE;
}

export function getReadingDateKey(date: Date, timeZone = DEFAULT_READING_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: getReadingTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function getPreviousReadingDate(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getNextReadingDate(day: string) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function getGoalCompletion(completed: number, target: number | null) {
  return target && target > 0 ? Math.min(100, Math.floor(Math.max(0, completed) / target * 100)) : null;
}

export function getReadingStreak(
  dailyActivity: Readonly<Record<string, number>>,
  today: string,
  longestRecorded = 0,
): ReadingStreak {
  const activeDates = new Set(Object.entries(dailyActivity)
    .filter(([, count]) => Number.isFinite(count) && count > 0)
    .map(([date]) => date));

  let currentStreak = 0;
  let currentDate = activeDates.has(today) ? today : getPreviousReadingDate(today);
  while (activeDates.has(currentDate)) {
    currentStreak += 1;
    currentDate = getPreviousReadingDate(currentDate);
  }

  let longestStreak = Math.max(0, longestRecorded);
  let currentRun = 0;
  let previousDate: string | null = null;
  for (const date of [...activeDates].sort()) {
    currentRun = previousDate && getNextReadingDate(previousDate) === date ? currentRun + 1 : 1;
    longestStreak = Math.max(longestStreak, currentRun);
    previousDate = date;
  }

  return { currentStreak, longestStreak };
}