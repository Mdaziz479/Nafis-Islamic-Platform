import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUserData, isUserDataResource, normalizePayload, saveUserData } from "@/lib/user-data";

export const dynamic = "force-dynamic";
interface ResourceItemContext { params: Promise<{ resource: string; id: string }> }

export async function PATCH(request: NextRequest, context: ResourceItemContext) {
  const user = await getCurrentUser();
  const { resource, id } = await context.params;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isUserDataResource(resource) || ["progress", "goals", "streak", "settings"].includes(resource)) return NextResponse.json({ error: "Invalid resource" }, { status: 400 });
  const payload = normalizePayload(resource, await request.json().catch(() => null));
  if (!payload) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  try {
    const data = await saveUserData(user.id, resource, payload, id);
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch { return NextResponse.json({ error: "Could not update data" }, { status: 400 }); }
}

export async function DELETE(_request: NextRequest, context: ResourceItemContext) {
  const user = await getCurrentUser();
  const { resource, id } = await context.params;
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isUserDataResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  return (await deleteUserData(user.id, resource, id))
    ? new NextResponse(null, { status: 204 })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
