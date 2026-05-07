import { mockActual } from "../../mocks/actual";
import { mockConfig } from "../../mocks/config";
import { mockRelays } from "../../mocks/relays";
import { createMockHubApiClient } from "./MockHubApiClient";

describe("createMockHubApiClient", () => {
  it("returns app-level mock values for the mock backend", async () => {
    const client = createMockHubApiClient();

    await expect(client.getConfig("192.168.1.50")).resolves.toEqual(mockConfig);
    await expect(client.getActual("192.168.1.50")).resolves.toEqual(mockActual);
    await expect(client.getRelays("192.168.1.50")).resolves.toEqual(mockRelays);
    await expect(client.toggleRelay("192.168.1.50", 1, 1)).resolves.toBe("OK");
  });

  it("returns fresh copies so consumer mutation does not leak across calls", async () => {
    const client = createMockHubApiClient();

    const firstConfig = await client.getConfig("192.168.1.50");
    ((firstConfig as unknown as { sensors: Array<{ config: { measurementKey?: string } }>; relays: Array<{ config: { alias?: string } }> }).sensors[0].config).measurementKey = "mutated";
    ((firstConfig as unknown as { sensors: Array<{ config: { measurementKey?: string } }>; relays: Array<{ config: { alias?: string } }> }).relays[0].config).alias = "mutated";

    const secondConfig = await client.getConfig("192.168.1.50");
    expect(secondConfig).toEqual(mockConfig);

    const firstActual = await client.getActual("192.168.1.50");
    ((firstActual as unknown as { errors: { temperature: string[] } }).errors.temperature).push("mutated");

    const secondActual = await client.getActual("192.168.1.50");
    expect(secondActual).toEqual(mockActual);

    const firstRelays = await client.getRelays("192.168.1.50");
    ((firstRelays[0].state as unknown as boolean[])[0] = false);
    ((firstRelays[0].zones as unknown as string[])[0] = "mutated");

    const secondRelays = await client.getRelays("192.168.1.50");
    expect(secondRelays).toEqual(mockRelays);
  });

  it("uses the configured mock backend through backend.ts", () => {
    const originalExpoBackend = process.env.EXPO_PUBLIC_HUB_DATA_BACKEND;
    const originalBackend = process.env.HUB_DATA_BACKEND;
    const createMockHubApiClientMock = jest.fn(() => ({ mocked: true }));

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = "mock";
    delete process.env.HUB_DATA_BACKEND;

    jest.isolateModules(() => {
      jest.doMock("./MockHubApiClient", () => ({
        createMockHubApiClient: createMockHubApiClientMock,
      }));

      const backend = require("./backend") as typeof import("./backend");

      backend.resetHubApiClientForTests();

      expect(backend.getHubDataBackend()).toBe("mock");
      expect(backend.getHubApiClient()).toEqual({ mocked: true });
      expect(createMockHubApiClientMock).toHaveBeenCalledTimes(1);
    });

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = originalExpoBackend;
    process.env.HUB_DATA_BACKEND = originalBackend;
    jest.dontMock("./MockHubApiClient");
  });

  it("falls back to http backend when no environment value is configured", () => {
    const originalExpoBackend = process.env.EXPO_PUBLIC_HUB_DATA_BACKEND;
    const originalBackend = process.env.HUB_DATA_BACKEND;

    delete process.env.EXPO_PUBLIC_HUB_DATA_BACKEND;
    delete process.env.HUB_DATA_BACKEND;

    jest.isolateModules(() => {
      const backend = require("./backend") as typeof import("./backend");

      backend.resetHubApiClientForTests();

      expect(backend.getHubDataBackend()).toBe("http");
    });

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = originalExpoBackend;
    process.env.HUB_DATA_BACKEND = originalBackend;
  });

  it("throws for unsupported configured backends", () => {
    const originalExpoBackend = process.env.EXPO_PUBLIC_HUB_DATA_BACKEND;
    const originalBackend = process.env.HUB_DATA_BACKEND;

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = "invalid-backend";
    delete process.env.HUB_DATA_BACKEND;

    jest.isolateModules(() => {
      const backend = require("./backend") as typeof import("./backend");

      expect(() => backend.getHubDataBackend()).toThrow(
        "Unsupported hub data backend: invalid-backend"
      );
    });

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = originalExpoBackend;
    process.env.HUB_DATA_BACKEND = originalBackend;
  });

  it("ignores blank public env values and falls through to the private backend env", () => {
    const originalExpoBackend = process.env.EXPO_PUBLIC_HUB_DATA_BACKEND;
    const originalBackend = process.env.HUB_DATA_BACKEND;

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = "   ";
    process.env.HUB_DATA_BACKEND = "http";

    jest.isolateModules(() => {
      const backend = require("./backend") as typeof import("./backend");

      expect(backend.getHubDataBackend()).toBe("http");
    });

    process.env.EXPO_PUBLIC_HUB_DATA_BACKEND = originalExpoBackend;
    process.env.HUB_DATA_BACKEND = originalBackend;
  });
});
