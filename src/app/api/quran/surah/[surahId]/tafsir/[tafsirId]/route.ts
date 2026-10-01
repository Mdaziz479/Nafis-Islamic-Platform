import { getTafsirService } from "@/services/quran/tafsir-service";
import type { QuranResponse } from "@/types/quran";
import type { Tafsir } from "@/types/quran";

export const dynamic = "force-dynamic";

interface TafsirRouteContext {
  readonly params: Promise<{ surahId: string; tafsirId: string }>;
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
  context: Readonly<TafsirRouteContext>,
) {
  const { surahId: rawSurahId, tafsirId: rawTafsirId } = await context.params;
  const surahId = Number(rawSurahId);
  const tafsirId = Number(rawTafsirId);
  
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) {
    return Response.json(
      { status: "unavailable", data: null, message: "Invalid chapter." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!Number.isInteger(tafsirId) || tafsirId < 1) {
    return Response.json(
      { status: "unavailable", data: null, message: "Invalid Tafsir." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let result: QuranResponse<Tafsir[]>;
  try {
    result = await getTafsirService().getSurahTafsirs(surahId, tafsirId);
  } catch {
    result = {
      data: null,
      status: "unavailable",
      message: "Tafsir data could not be loaded.",
      error: { code: "provider-error", retryable: true },
    };
  }

  return Response.json(
    {
      status: result.status,
      data: result.data,
      message: result.status === "success"
        ? undefined
        : "Tafsir data could not be loaded.",
      error: result.error?.code,
    },
    {
      status: responseStatus(result),
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
