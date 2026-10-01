import { getTafsirService } from "@/services/quran/tafsir-service";
import type { QuranResponse } from "@/types/quran";
import type { TafsirResource } from "@/types/quran";

export const dynamic = "force-dynamic";

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

export async function GET() {
  let result: QuranResponse<TafsirResource[]>;
  try {
    result = await getTafsirService().getAvailableTafsirs();
  } catch {
    result = {
      data: null,
      status: "unavailable",
      message: "Tafsirs could not be loaded.",
      error: { code: "provider-error", retryable: true },
    };
  }

  return Response.json(
    {
      status: result.status,
      data: result.data,
      message: result.status === "success"
        ? undefined
        : "Tafsirs could not be loaded.",
      error: result.error?.code,
    },
    {
      status: responseStatus(result),
      headers: { "Cache-Control": "public, max-age=86400" },
    },
  );
}
