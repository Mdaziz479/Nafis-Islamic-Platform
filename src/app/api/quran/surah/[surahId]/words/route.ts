import { getQuranService } from "@/services/quran/quran-service";
import type { AyahWordData, QuranResponse } from "@/types/quran";

export const dynamic = "force-dynamic";

interface WordRouteContext {
  readonly params: Promise<{ surahId: string }>;
}

function responseStatus(result: QuranResponse<unknown>) {
  if (result.status === "success") return 200;
  switch (result.error?.code) {
    case "missing-credentials":
      return 503;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not-found":
      return 404;
    case "rate-limited":
      return 429;
    default:
      return 502;
  }
}

export async function GET(
  _request: Request,
  context: Readonly<WordRouteContext>,
) {
  const { surahId: rawSurahId } = await context.params;
  const surahId = Number(rawSurahId);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return Response.json(
      { status: "unavailable", data: null, message: "Invalid Surah." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let result: QuranResponse<AyahWordData[]>;
  try {
    result = await getQuranService().getSurahWords(surahId);
  } catch {
    result = {
      data: null,
      status: "unavailable",
      message: "Word data could not be loaded.",
      error: { code: "provider-error", retryable: true },
    };
  }

  return Response.json(
    {
      status: result.status,
      data: result.data,
      message: result.status === "success"
        ? undefined
        : "Word-by-word data could not be loaded.",
      error: result.error?.code,
    },
    {
      status: responseStatus(result),
      headers: { "Cache-Control": "no-store" },
    },
  );
}