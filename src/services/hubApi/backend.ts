import type { HubApiClient, HubDataBackend } from "./HubApiClient";
import { createHttpHubApiClient } from "./HttpHubApiClient";
import { createMockHubApiClient } from "./MockHubApiClient";

function isHubDataBackend(value: string | undefined): value is HubDataBackend {
  return value === "mock" || value === "http";
}

export function getHubDataBackend(): HubDataBackend {
  const configuredBackend =
    normalizeBackendEnv(process.env.EXPO_PUBLIC_HUB_DATA_BACKEND) ??
    normalizeBackendEnv(process.env.HUB_DATA_BACKEND);
  if (configuredBackend === undefined || configuredBackend.trim() === "") {
    return "http";
  }
  if (!isHubDataBackend(configuredBackend)) {
    throw new Error(`Unsupported hub data backend: ${configuredBackend}`);
  }
  return configuredBackend;
}

let cachedClient: HubApiClient | undefined;

export function getHubApiClient(): HubApiClient {
  if (!cachedClient) {
    const backend = getHubDataBackend();
    switch (backend) {
      case "mock":
        cachedClient = createMockHubApiClient();
        break;
      case "http":
        cachedClient = createHttpHubApiClient();
        break;
      default: {
        const exhaustiveCheck: never = backend;
        throw new Error(`Unsupported hub data backend: ${exhaustiveCheck}`);
      }
    }
  }
  return cachedClient;
}

export function resetHubApiClientForTests(): void {
  cachedClient = undefined;
}

export function setHubApiClientForTests(client: HubApiClient | undefined): void {
  cachedClient = client;
}

function normalizeBackendEnv(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
