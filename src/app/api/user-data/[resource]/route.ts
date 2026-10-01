import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isUserDataResource, listUserData, normalizePayload, saveUserData } from "@/lib/user-data";

export const dynamic = "force-dynamic";
interface ResourceContext { params: Promise<{ resource: string }> }

async function currentUserOrResponse() {
  const user = await getCurrentUser();
  return user ?? null;
}

export async function GET(_request: NextRequest, context: ResourceContext) {
  const user = await currentUserOrResponse();
  const { resource } = await context.params;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isUserDataResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  try { return NextResponse.json({ data: await listUserData(user.id, resource) }); }
  catch { return NextResponse.json({ error: "Data service is unavailable" }, { status: 503 }); }
}

export async function POST(request: NextRequest, context: ResourceContext) {
  const user = await currentUserOrResponse();
  const { resource } = await context.params;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isUserDataResource(resource) || resource === "streak") return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
  const payload = normalizePayload(resource, await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  try { return NextResponse.json({ data: await saveUserData(user.id, resource, payload) }, { status: 201 }); }
  catch { return NextResponse.json({ error: "Could not save data" }, { status: 409 }); }
}
