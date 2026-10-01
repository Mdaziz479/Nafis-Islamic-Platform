import { NextRequest, NextResponse } from "next/server";
import { getRamadanCalendar, isSupportedCalendarMethod } from "@/services/islamic/aladhan";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const year = Number(params.get("year"));
  const method = params.get("method") ?? "HJCoSA";
  if (!Number.isInteger(year) || year < 1300 || year > 1600 || !isSupportedCalendarMethod(method)) {
    return NextResponse.json({ data: null, message: "Choose a valid Hijri year and date convention." }, { status: 400 });
  }
  const result = await getRamadanCalendar(year, method);
  return result.data
    ? NextResponse.json(result)
    : NextResponse.json({ data: null, message: result.message }, { status: 503 });
}