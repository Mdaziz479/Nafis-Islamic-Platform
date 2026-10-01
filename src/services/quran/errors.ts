import "server-only";

import type { QuranApiClientResult } from "@/services/quran/client";
import type { QuranResponse, QuranServiceErrorCode } from "@/types/quran";

function getHttpStatus(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null) {
    if ("status" in error && typeof error.status === "number") return error.status;
    if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  }

  if (error instanceof Error) {
    const status = /\b(400|401|403|404|429|5\d{2})\b/.exec(error.message);
    return status ? Number(status[1]) : undefined;
  }
  return undefined;
}

export function configurationFailure<T>(
  result: Exclude<QuranApiClientResult, { status: "ready" }>,
): QuranResponse<T> {
  if (result.status === "not-configured") {
    const message =
      process.env.NODE_ENV === "development"
        ? `Set ${result.missingVariables.join(" and ")} in the ignored .env.local file.`
        : "The Quran source is not available.";

    return {
      data: null,
      status: "not-configured",
      message,
      error: { code: "missing-credentials", retryable: false },
    };
  }

  return {
    data: null,
    status: "unavailable",
    message:
      process.env.NODE_ENV === "development"
        ? "QF_ENV must be set to prelive or production."
        : "The Quran source is not available.",
    error: { code: "invalid-environment", retryable: false },
  };
}

export function providerFailure<T>(error: unknown): QuranResponse<T> {
  const httpStatus = getHttpStatus(error);
  let code: QuranServiceErrorCode = "network-error";
  let retryable = true;
  let message = "The Quran provider could not be reached.";

  if (httpStatus === 401) {
    code = "unauthorized";
    retryable = false;
    message = "Quran Foundation authentication failed. Check the environment credentials.";
  } else if (httpStatus === 403) {
    code = "forbidden";
    retryable = false;
    message = "Quran Foundation denied access. Check Content API permissions.";
  } else if (httpStatus === 404) {
    code = "not-found";
    retryable = false;
    message = "The requested Quran content is not available from this provider.";
  } else if (httpStatus === 429) {
    code = "rate-limited";
    message = "Quran Foundation is receiving too many requests. Try again later.";
  } else if (httpStatus !== undefined && httpStatus >= 500) {
    code = "provider-error";
    message = "Quran Foundation is temporarily unavailable.";
  } else if (httpStatus !== undefined) {
    code = "provider-error";
    retryable = false;
    message = "The Quran provider rejected this request. Check the configured environment and API permissions.";
  }

  return {
    data: null,
    status: "unavailable",
    message,
    error: { code, httpStatus, retryable },
  };
}

export function incompleteProviderData<T>(message: string): QuranResponse<T> {
  return {
    data: null,
    status: "unavailable",
    message,
    error: { code: "incomplete-data", retryable: true },
  };
}