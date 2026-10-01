import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isUserDataResource, mergeSyncedUserData, normalizePayload, type UserDataResource } from "@/lib/user-data";

export const dynamic = "force-dynamic";

class InvalidSyncBatchError extends Error {}

async function syncGuestData(userId: string, body: Record<string, unknown>) {
  const results: Record<string, number> = {};
  for (const [key, value] of Object.entries(body)) {
    if (!isUserDataResource(key) || key === "streak") continue;
    const resource = key as UserDataResource;
    const isCollection = ["bookmarks", "notes", "collections"].includes(resource);
    if (isCollection && (!Array.isArray(value) || value.length > 500)) {
      throw new InvalidSyncBatchError();
    }
    const entries = isCollection ? value as unknown[] : [value];
    for (const entry of entries) {
      const payload = normalizePayload(resource, entry);
      if (!payload) continue;
      await mergeSyncedUserData(userId, resource, payload);
      results[resource] = (results[resource] ?? 0) + 1;
    }
  }
  return results;
}

/** Merges guest records into the signed-in user without replacing existing cloud data. */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  try {
    const results = await syncGuestData(user.id, body as Record<string, unknown>);
    return NextResponse.json({ synced: results });
  } catch (error) {
    if (error instanceof InvalidSyncBatchError) {
      return NextResponse.json({ error: "Sync batch is too large or invalid." }, { status: 413 });
    }
    return NextResponse.json({ error: "Sync could not be completed." }, { status: 503 });
  }
}
