import { getAudioService } from "@/services/quran/audio-service";
import type { QuranResponse } from "@/types/quran";
import type { VerseRecitation } from "@/types/quran";

export const dynamic = "force-dynamic";

interface AudioRouteContext {
  readonly params: Promise<{ chapterId: string; reciterId: string }>;
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
  context: Readonly<AudioRouteContext>,
) {
  const { chapterId: rawChapterId, reciterId } = await context.params;
  const chapterId = Number(rawChapterId);
  if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > 114) {
    return Response.json(
      { status: "unavailable", data: null, message: "Invalid chapter." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let result: QuranResponse<VerseRecitation[]>;
  try {
    result = await getAudioService().getVerseRecitations(chapterId, reciterId);
  } catch {
    result = {
      data: null,
      status: "unavailable",
      message: "Audio data could not be loaded.",
      error: { code: "provider-error", retryable: true },
    };
  }

  return Response.json(
    {
      status: result.status,
      data: result.data,
      message: result.status === "success"
        ? undefined
        : "Audio data could not be loaded.",
      error: result.error?.code,
    },
    {
      status: responseStatus(result),
      headers: { "Cache-Control": "no-store" },
    },
  );
}
