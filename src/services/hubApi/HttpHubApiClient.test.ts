import { mockConfig } from "../../mocks/config";
import {
  HubApiInvalidResponseError,
  HubApiNetworkError,
  HubApiTimeoutError,
  HubApiToggleError,
} from "./errors";
import { createHttpHubApiClient } from "./HttpHubApiClient";

describe("createHttpHubApiClient", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("calls the config endpoint and maps JSON responses", async () => {
    const json = jest.fn().mockResolvedValue(mockConfig);
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue("application/json; charset=utf-8"),
      },
      json,
      text: jest.fn(),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();
    const result = await client.getConfig("192.168.1.50");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.1.50/config",
      expect.objectContaining({ method: "GET" })
    );
    expect(json).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockConfig);
  });

  it("calls the toggle endpoint with query parameters and returns text", async () => {
    const text = jest.fn().mockResolvedValue("OK");
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue("text/plain; charset=utf-8"),
      },
      json: jest.fn(),
      text,
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();
    const result = await client.toggleRelay("192.168.1.50", 3, 2);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://192.168.1.50/api/relay/toggle?addr=3&ch=2",
      expect.objectContaining({ method: "POST" })
    );
    expect(text).toHaveBeenCalledTimes(1);
    expect(result).toBe("OK");
  });

  it("raises a toggle-specific error for non-OK toggle responses", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: {
        get: jest.fn().mockReturnValue("text/plain; charset=utf-8"),
      },
      json: jest.fn(),
      text: jest.fn().mockResolvedValue("Service unavailable"),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.toggleRelay("192.168.1.50", 3, 2)).rejects.toBeInstanceOf(
      HubApiToggleError
    );
  });

  it("raises a network error when fetch rejects", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("offline"));
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.getActual("192.168.1.50")).rejects.toBeInstanceOf(
      HubApiNetworkError
    );
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry on GET
  });

  it("does not retry POSTs (toggle) on network errors", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("offline"));
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.toggleRelay("192.168.1.50", 1, 0)).rejects.toBeInstanceOf(
      HubApiNetworkError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("raises a network error for non-toggle non-OK responses", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: {
        get: jest.fn().mockReturnValue("application/json"),
      },
      json: jest.fn().mockResolvedValue({ error: "failed" }),
      text: jest.fn(),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.getRelays("192.168.1.50")).rejects.toBeInstanceOf(
      HubApiNetworkError
    );
  });

  it("raises a timeout error when fetch is aborted", async () => {
    const fetchMock = jest.fn().mockImplementation(() => {
      const err = new Error("Aborted");
      err.name = "AbortError";
      return Promise.reject(err);
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.getActual("192.168.1.50")).rejects.toBeInstanceOf(
      HubApiTimeoutError
    );
  });

  it("retries idempotent GETs on transient failures and returns the second response", async () => {
    const json = jest.fn().mockResolvedValue(mockConfig);
    const okResponse = {
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue("application/json"),
      },
      json,
      text: jest.fn(),
    };
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"))
      .mockResolvedValueOnce(okResponse);
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.getConfig("192.168.1.50")).resolves.toEqual(mockConfig);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("raises an invalid-response error when body parsing fails", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: jest.fn().mockReturnValue("application/json"),
      },
      json: jest.fn().mockRejectedValue(new Error("bad json")),
      text: jest.fn(),
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const client = createHttpHubApiClient();

    await expect(client.getConfig("192.168.1.50")).rejects.toBeInstanceOf(
      HubApiInvalidResponseError
    );
  });
});
