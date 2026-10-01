import "server-only";

import { isValidObjectId } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Bookmark from "@/models/Bookmark";
import Collection from "@/models/Collection";
import Goal from "@/models/Goal";
import Note from "@/models/Note";
import ReadingProgress from "@/models/ReadingProgress";
import Streak from "@/models/Streak";
import UserSettings from "@/models/UserSettings";
import { getReadingDateKey, getReadingStreak, getReadingTimeZone, isValidReadingTimeZone } from "@/services/quran/reading-metrics";

export type UserDataResource = "bookmarks" | "notes" | "collections" | "progress" | "goals" | "streak" | "settings";

const RESOURCES = new Set<UserDataResource>(["bookmarks", "notes", "collections", "progress", "goals", "streak", "settings"]);

export function isUserDataResource(value: string): value is UserDataResource {
  return RESOURCES.has(value as UserDataResource);
}

export function cleanString(value: unknown, maximum: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maximum
    ? value.trim()
    : null;
}

export function positiveInteger(value: unknown, maximum = 114) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value <= maximum
    ? value
    : null;
}

export function isVerseKey(value: unknown) {
  if (typeof value !== "string" || !/^\d{1,3}:\d{1,3}$/.test(value)) return false;
  const [surah, ayah] = value.split(":").map(Number);
  return surah >= 1 && surah <= 114 && ayah >= 1;
}

function object(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function mapNumbers(value: unknown, maximumValue: number) {
  const input = object(value);
  if (!input || Object.keys(input).length > 114) return null;
  const result: Record<string, number> = {};
  for (const [key, number] of Object.entries(input)) {
    if (!/^\d{1,3}$/.test(key) || typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > maximumValue) return null;
    result[key] = number;
  }
  return result;
}

function dailyActivityMap(value: unknown) {
  const input = object(value);
  if (!input || Object.keys(input).length > 3660) return null;
  const result: Record<string, number> = {};
  for (const [key, number] of Object.entries(input)) {
    const date = new Date(`${key}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key || typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 10000) return null;
    result[key] = number;
  }
  return result;
}

function dailyVerseKeyMap(value: unknown) {
  const input = object(value);
  if (!input || Object.keys(input).length > 3660) return null;
  const result: Record<string, string[]> = {};
  for (const [day, values] of Object.entries(input)) {
    const date = new Date(`${day}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day || !Array.isArray(values) || values.length > 10000 || !values.every(isVerseKey)) return null;
    result[day] = [...new Set(values)];
  }
  return result;
}

function normalizeSettings(payload: Record<string, unknown>) {
  const rules: Record<string, (value: unknown) => boolean> = {
    selectedTranslationId: (value) => value === null || (typeof value === "number" && Number.isSafeInteger(value) && value > 0),
    showTranslation: (value) => typeof value === "boolean",
    arabicFontSize: (value) => typeof value === "number" && Number.isInteger(value) && value >= 24 && value <= 48,
    translationFontSize: (value) => typeof value === "number" && Number.isInteger(value) && value >= 13 && value <= 24,
    wordByWordEnabled: (value) => typeof value === "boolean",
    selectedReciterId: (value) => value === null || (typeof value === "number" && Number.isSafeInteger(value) && value > 0),
    playbackSpeed: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0.5 && value <= 2,
    volume: (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1,
    repeatMode: (value) => value === "off" || value === "ayah" || value === "surah",
    autoPlayNextAyah: (value) => typeof value === "boolean",
    selectedTafsirId: (value) => value === null || (typeof value === "number" && Number.isSafeInteger(value) && value > 0),
    showTafsir: (value) => typeof value === "boolean",
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === "version" && value === 2) continue;
    if (!rules[key]?.(value)) return null;
    result[key] = value;
  }
  return Object.keys(result).length ? result : null;
}

function normalizeBookmark(payload: Record<string, unknown>) {
  const surahId = positiveInteger(payload.surahId);
  const ayahNumber = positiveInteger(payload.ayahNumber, 286);
  if (!isVerseKey(payload.verseKey) || !surahId || !ayahNumber || payload.verseKey !== `${surahId}:${ayahNumber}`) return null;
  return { verseKey: payload.verseKey, surahId, ayahNumber };
}

function normalizeNote(payload: Record<string, unknown>) {
  const bookmark = normalizeBookmark(payload);
  const content = cleanString(payload.content, 5000);
  return bookmark && content ? { ...bookmark, content } : null;
}

function normalizeCollection(payload: Record<string, unknown>) {
  const name = cleanString(payload.name, 120);
  const values = payload.verseKeys;
  if (!name || !Array.isArray(values) || values.length > 500 || !values.every(isVerseKey)) return null;
  return { name, verseKeys: [...new Set(values)] };
}

function normalizeProgress(payload: Record<string, unknown>) {
  const lastSurahId = payload.lastSurahId === null ? null : positiveInteger(payload.lastSurahId);
  const lastAyahId = payload.lastAyahId === null ? null : positiveInteger(payload.lastAyahId, 286);
  const surahProgress = mapNumbers(payload.surahProgress, 286);
  const dailyActivity = dailyActivityMap(payload.dailyActivity);
  const dailyReadVerseKeys = payload.dailyReadVerseKeys === undefined
    ? {}
    : dailyVerseKeyMap(payload.dailyReadVerseKeys);
  const timeZone = payload.timeZone === undefined
    ? "UTC"
    : isValidReadingTimeZone(payload.timeZone) ? payload.timeZone : null;
  const hasValidLastRead = (lastSurahId === null && lastAyahId === null) || (lastSurahId !== null && lastAyahId !== null);
  return hasValidLastRead && surahProgress && dailyActivity && dailyReadVerseKeys && timeZone
    ? { lastSurahId, lastAyahId, timeZone, surahProgress, dailyActivity, dailyReadVerseKeys }
    : null;
}

function normalizeGoal(payload: Record<string, unknown>) {
  const targetAyahsPerDay = positiveInteger(payload.targetAyahsPerDay, 10000);
  return targetAyahsPerDay ? { targetAyahsPerDay } : null;
}

export function normalizePayload(resource: UserDataResource, value: unknown): Record<string, unknown> | null {
  const payload = object(value);
  if (!payload) return null;
  switch (resource) {
    case "bookmarks": return normalizeBookmark(payload);
    case "notes": return normalizeNote(payload);
    case "collections": return normalizeCollection(payload);
    case "progress": return normalizeProgress(payload);
    case "goals": return normalizeGoal(payload);
    case "settings": return normalizeSettings(payload);
    default: return null;
  }
}

export async function listUserData(userId: string, resource: UserDataResource) {
  await connectToDatabase();
  if (resource === "bookmarks") return Bookmark.find({ userId }).sort({ createdAt: -1 }).lean();
  if (resource === "notes") return Note.find({ userId }).sort({ updatedAt: -1 }).lean();
  if (resource === "collections") return Collection.find({ userId }).sort({ updatedAt: -1 }).lean();
  if (resource === "progress") return ReadingProgress.findOne({ userId }).lean();
  if (resource === "goals") return Goal.findOne({ userId }).lean();
  if (resource === "streak") return Streak.findOne({ userId }).lean();
  return UserSettings.findOne({ userId }).lean();
}

async function saveBookmark(userId: string, payload: Record<string, unknown>, id?: string) {
  const verseKey = typeof payload.verseKey === "string" ? payload.verseKey : "";
  let existing;
  if (id) {
    if (!isValidObjectId(id)) return null;
    existing = await Bookmark.findOne({ _id: id, userId });
    if (!existing) return null;
  } else {
    existing = await Bookmark.findOne({ userId, verseKey });
  }
  if (existing) {
    existing.set(payload);
    await existing.save();
    return existing.toObject();
  }
  return Bookmark.create({ ...payload, userId }).then((item) => item.toObject());
}

async function saveNote(userId: string, payload: Record<string, unknown>, id?: string) {
  const verseKey = typeof payload.verseKey === "string" ? payload.verseKey : "";
  let existing;
  if (id) {
    if (!isValidObjectId(id)) return null;
    existing = await Note.findOne({ _id: id, userId });
    if (!existing) return null;
  } else {
    existing = await Note.findOne({ userId, verseKey });
  }
  if (existing) {
    existing.set(payload);
    await existing.save();
    return existing.toObject();
  }
  return Note.create({ ...payload, userId }).then((item) => item.toObject());
}

async function saveCollection(userId: string, payload: Record<string, unknown>, id?: string) {
  const name = typeof payload.name === "string" ? payload.name : "";
  let existing;
  if (id) {
    if (!isValidObjectId(id)) return null;
    existing = await Collection.findOne({ _id: id, userId });
    if (!existing) return null;
  } else {
    existing = await Collection.findOne({ userId, name });
  }
  if (existing) {
    existing.set(payload);
    await existing.save();
    return existing.toObject();
  }
  return Collection.create({ ...payload, userId }).then((item) => item.toObject());
}

async function updateStreak(userId: string, dailyActivity: Record<string, number>, timeZone: string) {
  const activeDates = Object.entries(dailyActivity)
    .filter(([, count]) => count > 0)
    .map(([date]) => date)
    .sort((left, right) => left.localeCompare(right));
  const mostRecent = activeDates.at(-1);
  const stored = await Streak.findOne({ userId }).lean();
  const today = getReadingDateKey(new Date(), timeZone);
  const summary = getReadingStreak(dailyActivity, today, stored?.longestStreak ?? 0);
  await Streak.findOneAndUpdate(
    { userId },
    {
      $set: {
        currentStreak: summary.currentStreak,
        longestStreak: summary.longestStreak,
        lastActivityDate: mostRecent ? new Date(`${mostRecent}T00:00:00.000Z`) : null,
      },
      $setOnInsert: { userId },
    },
    { upsert: true, new: true, runValidators: true },
  );
}

async function saveProgress(userId: string, payload: Record<string, unknown>) {
  const existing = await ReadingProgress.findOne({ userId }).lean();
  const mergedDailyReadVerseKeys = mergeStringArrayMaps(existing?.dailyReadVerseKeys, payload.dailyReadVerseKeys);
  const mergedDailyActivity = mergeNumberMaps(existing?.dailyActivity, payload.dailyActivity);
  for (const [day, verseKeys] of Object.entries(mergedDailyReadVerseKeys)) {
    mergedDailyActivity[day] = Math.max(mergedDailyActivity[day] ?? 0, verseKeys.length);
  }
  const mergedPayload = {
    ...payload,
    timeZone: getReadingTimeZone(payload.timeZone ?? existing?.timeZone),
    surahProgress: mergeNumberMaps(existing?.surahProgress, payload.surahProgress),
    dailyActivity: mergedDailyActivity,
    dailyReadVerseKeys: mergedDailyReadVerseKeys,
  };
  const progress = await ReadingProgress.findOneAndUpdate(
    { userId },
    { $set: mergedPayload, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
  await updateStreak(userId, mergedPayload.dailyActivity, getReadingTimeZone(mergedPayload.timeZone));
  return progress;
}

async function saveGoal(userId: string, payload: Record<string, unknown>) {
  return Goal.findOneAndUpdate(
    { userId },
    { $set: payload, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
}

async function saveSettings(userId: string, payload: Record<string, unknown>) {
  return UserSettings.findOneAndUpdate(
    { userId },
    { $set: payload, $setOnInsert: { userId } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
}

export async function saveUserData(userId: string, resource: UserDataResource, payload: Record<string, unknown>, id?: string) {
  await connectToDatabase();
  switch (resource) {
    case "bookmarks": return saveBookmark(userId, payload, id);
    case "notes": return saveNote(userId, payload, id);
    case "collections": return saveCollection(userId, payload, id);
    case "progress": return saveProgress(userId, payload);
    case "goals": return saveGoal(userId, payload);
    case "settings": return saveSettings(userId, payload);
    default: return null;
  }
}

function plainNumberMap(value: unknown) {
  if (value instanceof Map) return Object.fromEntries(value);
  return object(value) ?? {};
}

function plainStringArrayMap(value: unknown) {
  if (value instanceof Map) return Object.fromEntries(value);
  return object(value) ?? {};
}

function mergeNumberMaps(existing: unknown, incoming: unknown) {
  const result: Record<string, number> = {};
  for (const source of [plainNumberMap(existing), plainNumberMap(incoming)]) {
    for (const [key, value] of Object.entries(source)) {
      if (typeof value === "number") result[key] = Math.max(result[key] ?? 0, value);
    }
  }
  return result;
}

function mergeStringArrayMaps(existing: unknown, incoming: unknown) {
  const result: Record<string, string[]> = {};
  for (const source of [plainStringArrayMap(existing), plainStringArrayMap(incoming)]) {
    for (const [day, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        result[day] = [...new Set([...(result[day] ?? []), ...value.filter((key): key is string => typeof key === "string")])];
      }
    }
  }
  return result;
}

async function mergeBookmark(userId: string, payload: Record<string, unknown>) {
  const verseKey = typeof payload.verseKey === "string" ? payload.verseKey : "";
  return Bookmark.findOneAndUpdate(
    { userId, verseKey },
    { $setOnInsert: { ...payload, userId } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
}

async function mergeNote(userId: string, payload: Record<string, unknown>) {
  const verseKey = typeof payload.verseKey === "string" ? payload.verseKey : "";
  const content = typeof payload.content === "string" ? payload.content : "";
  const existing = await Note.findOne({ userId, verseKey });
  if (!existing) return Note.create({ ...payload, userId }).then((item) => item.toObject());
  const separator = "\n\n--- Guest note ---\n";
  const syncedNotes = existing.content.split(separator).slice(1);
  if (existing.content !== content && !syncedNotes.includes(content)) {
    existing.content = `${existing.content}${separator}${content}`;
    await existing.save();
  }
  return existing.toObject();
}

async function mergeCollection(userId: string, payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name : "";
  const verseKeys = Array.isArray(payload.verseKeys) ? payload.verseKeys as string[] : [];
  return Collection.findOneAndUpdate(
    { userId, name },
    { $setOnInsert: { userId, name }, $addToSet: { verseKeys: { $each: verseKeys } } },
    { upsert: true, new: true, runValidators: true },
  ).lean();
}

async function mergeProgress(userId: string, payload: Record<string, unknown>) {
  const existing = await ReadingProgress.findOne({ userId }).lean();
  if (!existing) return saveUserData(userId, "progress", payload);
  return saveUserData(userId, "progress", {
    lastSurahId: existing.lastSurahId ?? payload.lastSurahId,
    lastAyahId: existing.lastAyahId ?? payload.lastAyahId,
    surahProgress: mergeNumberMaps(existing.surahProgress, payload.surahProgress),
    dailyActivity: mergeNumberMaps(existing.dailyActivity, payload.dailyActivity),
    dailyReadVerseKeys: mergeStringArrayMaps(existing.dailyReadVerseKeys, payload.dailyReadVerseKeys),
  });
}

async function mergeGoal(userId: string, payload: Record<string, unknown>) {
  const existing = await Goal.findOne({ userId }).lean();
  return existing ?? saveUserData(userId, "goals", payload);
}

export async function mergeSyncedUserData(
  userId: string,
  resource: UserDataResource,
  payload: Record<string, unknown>,
) {
  await connectToDatabase();
  switch (resource) {
    case "bookmarks": return mergeBookmark(userId, payload);
    case "notes": return mergeNote(userId, payload);
    case "collections": return mergeCollection(userId, payload);
    case "progress": return mergeProgress(userId, payload);
    case "goals": return mergeGoal(userId, payload);
    case "settings": return saveUserData(userId, resource, payload);
    default: return null;
  }
}

export async function deleteUserData(userId: string, resource: UserDataResource, id: string) {
  const deletableResources = new Set<UserDataResource>(["bookmarks", "notes", "collections"]);
  if (!deletableResources.has(resource) || !isValidObjectId(id)) return false;
  await connectToDatabase();
  switch (resource) {
    case "bookmarks": return Boolean(await Bookmark.findOneAndDelete({ _id: id, userId }));
    case "notes": return Boolean(await Note.findOneAndDelete({ _id: id, userId }));
    case "collections": return Boolean(await Collection.findOneAndDelete({ _id: id, userId }));
    default: return false;
  }
}
