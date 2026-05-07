import type { HubApiClient } from "./HubApiClient";
import {
  mapConfigurationResponse,
  mapRelayListResponse,
  mapSensorDataResponse,
  mapToggleRelayResponse,
} from "./adapters";
import {
  HubApiInvalidResponseError,
  HubApiNetworkError,
  HubApiTimeoutError,
  HubApiToggleError,
} from "./errors";

type HubResponse = {
  ok: boolean;
  status: number;
  headers: {
    get(name: string): string | null;
  };
  json(): Promise<unknown>;
  text(): Promise<string>;
};

const DEFAULT_TIMEOUT_MS = 5000;
const RETRY_COUNT = 1;
const RETRY_DELAY_MS = 400;

export function createHttpHubApiClient(): HubApiClient {
  return {
    async getConfig(hubIp: string) {
      const response = await request(hubIp, "/config", { method: "GET" });
      return mapConfigurationResponse(await readBody(response));
    },
    async getActual(hubIp: string) {
      const response = await request(hubIp, "/actual", { method: "GET" });
      return mapSensorDataResponse(await readBody(response));
    },
    async getRelays(hubIp: string) {
      const response = await request(hubIp, "/api/relays", { method: "GET" });
      return mapRelayListResponse(await readBody(response));
    },
    async toggleRelay(hubIp: string, addr: number, ch: number) {
      const response = await request(
        hubIp,
        `/api/relay/toggle?addr=${addr}&ch=${ch}`,
        { method: "POST" }
      );

      if (!response.ok) {
        throw new HubApiToggleError();
      }

      return mapToggleRelayResponse(await readBody(response));
    },
  };
}

async function request(
  hubIp: string,
  path: string,
  init?: RequestInit
): Promise<HubResponse> {
  let lastError: unknown;
  // GETs are idempotent and safe to retry on transient network errors. Toggle
  // (POST) is intentionally excluded so we don't double-fire a relay flip if
  // the first attempt actually reached the hub.
  const retries = init?.method === "POST" ? 0 : RETRY_COUNT;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestOnce(hubIp, path, init);
    } catch (error) {
      lastError = error;
      const isLast = attempt === retries;
      const isRetryable =
        error instanceof HubApiNetworkError &&
        !(error instanceof HubApiToggleError);
      if (isLast || !isRetryable) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw lastError instanceof Error ? lastError : new HubApiNetworkError();
}

async function requestOnce(
  hubIp: string,
  path: string,
  init?: RequestInit
): Promise<HubResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = (await fetch(`http://${hubIp}${path}`, {
      ...init,
      signal: controller.signal,
    })) as HubResponse;
    if (!response.ok && !isTogglePath(path)) {
      throw new HubApiNetworkError(
        `El hub respondió con estado ${response.status}`
      );
    }
    return response;
  } catch (error) {
    if (
      error instanceof HubApiToggleError ||
      error instanceof HubApiNetworkError
    ) {
      throw error;
    }
    if (isAbortError(error)) {
      throw new HubApiTimeoutError();
    }
    throw new HubApiNetworkError();
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readBody(response: HubResponse): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  const isJson =
    contentType.includes("application/json") || contentType.includes("+json");

  try {
    return isJson ? await response.json() : await response.text();
  } catch {
    throw new HubApiInvalidResponseError();
  }
}

function isTogglePath(path: string): boolean {
  return path.startsWith("/api/relay/toggle");
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message === "Aborted")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
