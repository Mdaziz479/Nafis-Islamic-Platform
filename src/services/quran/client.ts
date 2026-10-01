import "server-only";

import {
  createServerClient,
  type ServerClient,
} from "@quranjs/api/server";
import {
  getQuranApiConfiguration,
  type QuranFoundationEnvironment,
} from "@/services/quran/config";

export type QuranApiClientResult =
  | {
      readonly status: "ready";
      readonly environment: QuranFoundationEnvironment;
      readonly client: ServerClient;
    }
  | {
      readonly status: "not-configured";
      readonly missingVariables: readonly string[];
    }
  | {
      readonly status: "invalid-environment";
      readonly requestedEnvironment: string;
    };

const clients = new Map<QuranFoundationEnvironment, ServerClient>();

export function getQuranApiClient(): QuranApiClientResult {
  const configuration = getQuranApiConfiguration();

  if (configuration.status !== "ready") {
    return configuration;
  }

  let client = clients.get(configuration.environment);
  if (!client) {
    client = createServerClient({
      clientId: configuration.clientId,
      clientSecret: configuration.clientSecret,
      services: {
        gatewayUrl: configuration.gatewayUrl,
        oauth2BaseUrl: configuration.oauth2BaseUrl,
      },
    });
    clients.set(configuration.environment, client);
  }

  return {
    status: "ready",
    environment: configuration.environment,
    client,
  };
}