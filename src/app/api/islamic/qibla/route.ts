import { NextRequest, NextResponse } from "next/server";
import { getQiblaDirection } from "@/services/islamic/aladhan";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const latitude = Number(params.get("latitude"));
  const longitude = Number(params.get("longitude"));
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json({ data: null, message: "Enter valid latitude and longitude coordinates." }, { status: 400 });
  }
  const result = await getQiblaDirection(latitude, longitude);
  return result.data
    ? NextResponse.json(result)
    : NextResponse.json({ data: null, message: result.message }, { status: 503 });
}