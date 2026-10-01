import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UserLibrary } from "@/components/dashboard/UserLibrary";
import { DashboardProgress } from "@/components/dashboard/DashboardProgress";
import { getCurrentUser } from "@/lib/auth";
import { listUserData } from "@/lib/user-data";
import { getReadingDateKey, getReadingTimeZone } from "@/services/quran/reading-metrics";

export const dynamic = "force-dynamic";

function objectRecords(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    : [];
}

function recordId(value: unknown) {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || !("toHexString" in value)) return "";
  const toHexString = value.toHexString;
  return typeof toHexString === "function" ? toHexString.call(value) : "";
}

function plainRecord(value: unknown): Record<string, unknown> {
  if (value instanceof Map) return Object.fromEntries(value);
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function numericRecord(value: unknown) {
  return Object.fromEntries(Object.entries(plainRecord(value)).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]),
  ));
}

function verseKeyRecord(value: unknown) {
  return Object.fromEntries(Object.entries(plainRecord(value)).flatMap(([day, entries]) =>
    Array.isArray(entries) ? [[day, entries.filter((entry): entry is string => typeof entry === "string")]] : [],
  ));
}

export default async function DashboardPage() {
  const user = await getCurrentUser().catch(() => null);
  const records = user ? await Promise.all([
    listUserData(user.id, "progress"), listUserData(user.id, "bookmarks"), listUserData(user.id, "notes"), listUserData(user.id, "collections"), listUserData(user.id, "goals"), listUserData(user.id, "streak"),
  ]).catch(() => null) : null;
  if (user && !records) {
    return <Container><div className="route-placeholder"><SectionHeading level={1} eyebrow="Your space" title="Dashboard" description="Your synced data is temporarily unavailable." /><p className="dashboard-unavailable">Your account data could not be loaded. Please try again later.</p></div></Container>;
  }
  const [progress, bookmarks, notes, collections, goal, streak] = records ?? [null, [], [], [], null, null];
  const progressRecord = plainRecord(progress);
  const today = getReadingDateKey(new Date(), getReadingTimeZone(progressRecord.timeZone));
  const lastSurahId = typeof progressRecord.lastSurahId === "number" ? progressRecord.lastSurahId : null;
  const lastAyahId = typeof progressRecord.lastAyahId === "number" ? progressRecord.lastAyahId : null;
  const goalRecord = plainRecord(goal);
  const goalData = typeof goalRecord.targetAyahsPerDay === "number" ? { targetAyahsPerDay: goalRecord.targetAyahsPerDay } : null;
  const streakRecord = plainRecord(streak);
  const streakData = typeof streakRecord.longestStreak === "number"
    ? { currentStreak: 0, longestStreak: streakRecord.longestStreak }
    : null;
  const initialProgress = progress !== null
    ? {
        lastSurahId,
        lastAyahId,
        timeZone: getReadingTimeZone(progressRecord.timeZone),
        surahProgress: numericRecord(progressRecord.surahProgress),
        dailyActivity: numericRecord(progressRecord.dailyActivity),
        dailyReadVerseKeys: verseKeyRecord(progressRecord.dailyReadVerseKeys),
      }
    : null;
  const initialBookmarks = objectRecords(bookmarks).flatMap((item) => typeof item.verseKey === "string" && typeof item.surahId === "number" && typeof item.ayahNumber === "number"
    ? [{ id: recordId(item._id), verseKey: item.verseKey, surahId: item.surahId, ayahNumber: item.ayahNumber }]
    : []);
  const initialNotes = objectRecords(notes).flatMap((item) => typeof item.verseKey === "string" && typeof item.surahId === "number" && typeof item.ayahNumber === "number" && typeof item.content === "string"
    ? [{ id: recordId(item._id), verseKey: item.verseKey, surahId: item.surahId, ayahNumber: item.ayahNumber, content: item.content }]
    : []);
  const initialCollections = objectRecords(collections).flatMap((item) => typeof item.name === "string" && Array.isArray(item.verseKeys)
    ? [{ id: recordId(item._id), name: item.name, verseKeys: item.verseKeys.filter((key): key is string => typeof key === "string") }]
    : []);

  return (
    <Container>
      <div className="route-placeholder dashboard-page">
        <SectionHeading level={1} eyebrow="Your space" title="Dashboard" description={user ? `Welcome back, ${user.name}.` : "Reading progress and saved items on this device."} />
        <div className="dashboard-grid">
          <p>Last read: {lastSurahId ? `Surah ${lastSurahId}, Ayah ${lastAyahId}` : "No reading progress yet"}</p>
          <p>Bookmarks: {initialBookmarks.length}</p>
          <p>Notes: {initialNotes.length}</p>
          <p>Collections: {initialCollections.length}</p>
          <p>Daily goal: {goalData ? `${goalData.targetAyahsPerDay} ayahs` : "Not set"}</p>
          <p>Current streak: {streakData?.currentStreak ?? 0} days</p>
          {streakData?.longestStreak ? <p>Longest streak: {streakData.longestStreak} days</p> : null}
        </div>
        <DashboardProgress
          authenticated={Boolean(user)}
          today={today}
          initialProgress={initialProgress}
          initialGoal={goalData}
          initialStreak={streakData}
        />
        <UserLibrary
          authenticated={Boolean(user)}
          initialBookmarks={initialBookmarks}
          initialNotes={initialNotes}
          initialCollections={initialCollections}
        />
      </div>
    </Container>
  );
}
