import "server-only";

export type QuranFoundationEnvironment = "prelive" | "production";

interface QuranApiReadyConfiguration {
  readonly status: "ready";
  readonly environment: QuranFoundationEnvironment;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly gatewayUrl: string;
  readonly oauth2BaseUrl: string;
  readonly baseUrl: string;
}

interface QuranApiNotConfigured {
  readonly status: "not-configured";
  readonly baseUrl: null;
  readonly missingVariables: readonly string[];
}

interface QuranApiInvalidEnvironment {
  readonly status: "invalid-environment";
  readonly baseUrl: null;
  readonly requestedEnvironment: string;
}

export type QuranApiConfiguration =
  | QuranApiReadyConfiguration
  | QuranApiNotConfigured
  | QuranApiInvalidEnvironment;

const ENVIRONMENT_URLS: Record<
  QuranFoundationEnvironment,
  { gatewayUrl: string; oauth2BaseUrl: string }
> = {
  prelive: {
    gatewayUrl: "https://apis-prelive.quran.foundation",
    oauth2BaseUrl: "https://prelive-oauth2.quran.foundation",
  },
  production: {
    gatewayUrl: "https://apis.quran.foundation",
    oauth2BaseUrl: "https://oauth2.quran.foundation",
  },
};

export function getQuranApiConfiguration(): QuranApiConfiguration {
  const requestedEnvironment = process.env.QF_ENV?.trim() || "prelive";
  if (!(requestedEnvironment in ENVIRONMENT_URLS)) {
    return {
      status: "invalid-environment",
      baseUrl: null,
      requestedEnvironment,
    };
  }

  const environment = requestedEnvironment as QuranFoundationEnvironment;
  const clientId = process.env.QF_CLIENT_ID?.trim();
  const clientSecret = process.env.QF_CLIENT_SECRET?.trim();
  const missingVariables = [
    !clientId ? "QF_CLIENT_ID" : null,
    !clientSecret ? "QF_CLIENT_SECRET" : null,
  ].filter((variable): variable is string => variable !== null);

  if (missingVariables.length > 0 || !clientId || !clientSecret) {
    return { status: "not-configured", baseUrl: null, missingVariables };
  }

  const urls = ENVIRONMENT_URLS[environment];

  return {
    status: "ready",
    environment,
    clientId,
    clientSecret,
    ...urls,
    baseUrl: urls.gatewayUrl,
  };
}