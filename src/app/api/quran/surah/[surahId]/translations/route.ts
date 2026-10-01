import { getTranslationService } from "@/services/quran/translation-service";
import type { QuranResponse, Translation } from "@/types/quran";

export const dynamic = "force-dynamic";

interface TranslationRouteContext {
  readonly params: Promise<{ surahId: string }>;
}

function getHttpStatus(errorCode?: string, status?: string) {
  if (status === "not-configured") return 503;
  switch (errorCode) {
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not-found":
    case "invalid-translation":
      return 404;
    case "rate-limited":
      return 429;
    case "provider-error":
    case "network-error":
      return 502;
    default:
      return 503;
  }
}

export async function GET(
  request: Request,
  context: Readonly<TranslationRouteContext>,
) {
  const { surahId: rawSurahId } = await context.params;
  const surahId = Number(rawSurahId);
  const translationResourceId = Number(
    new URL(request.url).searchParams.get("resourceId"),
  );

  if (
    !Number.isInteger(surahId) || surahId < 1 || surahId > 114 ||
    !Number.isInteger(translationResourceId) || translationResourceId < 1
  ) {
    return Response.json(
      { status: "unavailable", data: null, message: "Invalid Surah or translation." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  let result: QuranResponse<Translation[]>;
  try {
    result = await getTranslationService().getSurahTranslations(
      surahId,
      translationResourceId,
    );
  } catch {
    result = {
      data: null,
      status: "unavailable",
      message: "Translation could not be loaded.",
      error: { code: "provider-error", retryable: true },
    };
  }

  return Response.json(
    {
      status: result.status,
      data: result.data,
      message: result.status === "success"
        ? undefined
        : "Translation could not be loaded.",
      error: result.error?.code,
    },
    {
      status: result.status === "success"
        ? 200
        : getHttpStatus(result.error?.code, result.status),
      headers: { "Cache-Control": "no-store" },
    },
  );
}