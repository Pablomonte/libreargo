import { mockConfig } from "../../mocks/config";
import { InvalidHubConfigError, validateHubConfig } from "./validation";

describe("validateHubConfig", () => {
  it("returns the input on a valid payload", () => {
    expect(validateHubConfig(mockConfig)).toEqual(mockConfig);
  });

  it.each([null, undefined, [], 0, "string"])(
    "rejects non-object payloads (%p)",
    (value) => {
      expect(() => validateHubConfig(value)).toThrow(InvalidHubConfigError);
    }
  );

  it("rejects payloads with a hash that is too short", () => {
    expect(() =>
      validateHubConfig({ ...mockConfig, hash: "short" })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects payloads with non-hex hash characters", () => {
    expect(() =>
      validateHubConfig({ ...mockConfig, hash: "ZZZZZZZZ" })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects payloads with an empty incubator_name", () => {
    expect(() =>
      validateHubConfig({ ...mockConfig, incubator_name: "  " })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects payloads with non-finite numeric ranges", () => {
    expect(() =>
      validateHubConfig({ ...mockConfig, min_temperature: Number.NaN })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects payloads where min > max", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        min_temperature: 50,
        max_temperature: 20,
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects sensors that are not plain objects", () => {
    expect(() =>
      validateHubConfig({ ...mockConfig, sensors: ["not-an-object"] })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects sensors with missing required fields", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        sensors: [{ type: "scd30", enabled: true }],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects sensors whose zones contain non-strings", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        sensors: [
          {
            type: "scd30",
            enabled: true,
            config: {},
            zones: [1, 2, 3],
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects relays with an out-of-range modbus address", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "relay_2ch",
            enabled: true,
            config: { address: 999, alias: "Relay" },
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects relays with a non-integer address", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "relay_2ch",
            enabled: true,
            config: { address: 1.5, alias: "Relay" },
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects relays with an empty alias", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "relay_2ch",
            enabled: true,
            config: { address: 1, alias: "   " },
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("accepts gpio-style relays that do not carry a modbus address", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "gpio",
            enabled: true,
            config: { pin: 2, alias: "Relé GPIO", active_low: false },
          },
        ],
      })
    ).not.toThrow();
  });

  it("still rejects modbus relay_2ch entries that omit the address", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "relay_2ch",
            enabled: true,
            config: { alias: "Sin address" },
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });

  it("rejects gpio relays whose alias is empty", () => {
    expect(() =>
      validateHubConfig({
        ...mockConfig,
        relays: [
          {
            type: "gpio",
            enabled: true,
            config: { pin: 2, alias: "" },
          },
        ],
      })
    ).toThrow(InvalidHubConfigError);
  });
});
