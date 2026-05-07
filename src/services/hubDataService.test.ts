import {
  getActual,
  getAlarms,
  getConfig,
  getRecommendations,
  getRelays,
  pingHub,
  toggleRelay,
} from "./hubDataService";
import { getHubApiClient } from "./hubApi/backend";

jest.mock("./hubApi/backend", () => ({
  getHubApiClient: jest.fn(),
}));

describe("hubDataService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates getConfig to the hub api client", async () => {
    const expectedConfig = { hash: "abc12345" };
    const getConfigMock = jest.fn().mockResolvedValue({ hash: "abc12345" });
    (getHubApiClient as jest.Mock).mockReturnValue({
      getConfig: getConfigMock,
    });

    await expect(getConfig("192.168.1.50")).resolves.toEqual(expectedConfig);

    expect(getHubApiClient).toHaveBeenCalledTimes(1);
    expect(getConfigMock).toHaveBeenCalledWith("192.168.1.50");
  });

  it("delegates getActual to the hub api client", async () => {
    const expectedActual = { wifi_status: "connected" };
    const getActualMock = jest.fn().mockResolvedValue(expectedActual);
    (getHubApiClient as jest.Mock).mockReturnValue({
      getActual: getActualMock,
    });

    await expect(getActual("192.168.1.50")).resolves.toEqual(expectedActual);

    expect(getHubApiClient).toHaveBeenCalledTimes(1);
    expect(getActualMock).toHaveBeenCalledWith("192.168.1.50");
  });

  it("delegates getRelays to the hub api client", async () => {
    const expectedRelays = [{ address: 1 }];
    const getRelaysMock = jest.fn().mockResolvedValue(expectedRelays);
    (getHubApiClient as jest.Mock).mockReturnValue({
      getRelays: getRelaysMock,
    });

    await expect(getRelays("192.168.1.50")).resolves.toEqual(expectedRelays);

    expect(getHubApiClient).toHaveBeenCalledTimes(1);
    expect(getRelaysMock).toHaveBeenCalledWith("192.168.1.50");
  });

  it("delegates toggleRelay to the hub api client", async () => {
    const toggleRelayMock = jest.fn().mockResolvedValue("OK");
    (getHubApiClient as jest.Mock).mockReturnValue({
      toggleRelay: toggleRelayMock,
    });

    await expect(toggleRelay("192.168.1.50", 1, 2)).resolves.toBe("OK");

    expect(getHubApiClient).toHaveBeenCalledTimes(1);
    expect(toggleRelayMock).toHaveBeenCalledWith("192.168.1.50", 1, 2);
  });

  it("getAlarms returns empty array (no real endpoint yet)", async () => {
    await expect(getAlarms("192.168.1.50")).resolves.toEqual([]);
    expect(getHubApiClient).not.toHaveBeenCalled();
  });

  it("getRecommendations returns empty array (no real endpoint yet)", async () => {
    await expect(getRecommendations()).resolves.toEqual([]);
    expect(getHubApiClient).not.toHaveBeenCalled();
  });

  it("pingHub returns true when getConfig succeeds", async () => {
    const getConfigMock = jest.fn().mockResolvedValue({ hash: "AABBCCDD" });
    (getHubApiClient as jest.Mock).mockReturnValue({
      getConfig: getConfigMock,
    });

    await expect(pingHub("192.168.1.50")).resolves.toBe(true);
    expect(getConfigMock).toHaveBeenCalledWith("192.168.1.50");
  });

  it("pingHub returns false when getConfig throws", async () => {
    const getConfigMock = jest.fn().mockRejectedValue(new Error("offline"));
    (getHubApiClient as jest.Mock).mockReturnValue({
      getConfig: getConfigMock,
    });

    await expect(pingHub("192.168.1.50")).resolves.toBe(false);
  });
});
