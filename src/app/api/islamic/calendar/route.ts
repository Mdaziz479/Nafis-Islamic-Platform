import { NextRequest, NextResponse } from "next/server";
import { getHijriCalendar, isSupportedCalendarMethod } from "@/services/islamic/aladhan";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const month = Number(params.get("month"));
  const year = Number(params.get("year"));
  const method = params.get("method") ?? "HJCoSA";
  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1900 || year > 2200 || !isSupportedCalendarMethod(method)) {
    return NextResponse.json({ data: null, message: "Choose a valid month, year, and Hijri date convention." }, { status: 400 });
  }
  const result = await getHijriCalendar(month, year, method);
  return result.data
    ? NextResponse.json(result)
    : NextResponse.json({ data: null, message: result.message }, { status: 503 });
}