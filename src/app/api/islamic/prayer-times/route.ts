import { NextRequest, NextResponse } from "next/server";
import { getPrayerTimes } from "@/services/islamic/aladhan";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const method = Number(params.get("method"));
  const school = Number(params.get("school"));
  const latitudeParam = params.get("latitude");
  const longitudeParam = params.get("longitude");
  const latitude = latitudeParam === null ? undefined : Number(latitudeParam);
  const longitude = longitudeParam === null ? undefined : Number(longitudeParam);
  const city = params.get("city") ?? "";
  const country = params.get("country") ?? "";
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const hasCity = city.trim().length > 0 && country.trim().length > 0;
  if (
    (latitudeParam === null) !== (longitudeParam === null) ||
    (!hasCoordinates && !hasCity) ||
    (hasCoordinates && (!Number.isFinite(latitude) || latitude! < -90 || latitude! > 90 || !Number.isFinite(longitude) || longitude! < -180 || longitude! > 180)) ||
    !Number.isInteger(method) || !((method >= 0 && method <= 23) || method === 99) ||
    (school !== 0 && school !== 1)
  ) {
    return NextResponse.json({ data: null, message: "Choose a valid location, date, calculation method, and Asr method." }, { status: 400 });
  }
  const result = await getPrayerTimes({
    date: params.get("date") ?? "",
    city,
    country,
    latitude,
    longitude,
    method,
    school: school as 0 | 1,
  });
  return result.data
    ? NextResponse.json(result)
    : NextResponse.json({ data: null, message: result.message }, { status: 503 });
}