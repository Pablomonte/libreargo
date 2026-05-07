import { mockActual } from "../../mocks/actual";
import { mockConfig } from "../../mocks/config";
import { mockRelays } from "../../mocks/relays";
import { HubApiInvalidResponseError } from "./errors";
import {
  mapConfigurationResponse,
  mapRelayListResponse,
  mapSensorDataResponse,
  mapToggleRelayResponse,
} from "./adapters";

describe("hubApi adapters", () => {
  it("maps configuration responses to HubConfig", () => {
    expect(mapConfigurationResponse(mockConfig)).toEqual(mockConfig);
  });

  it("deep-clones nested configuration values", () => {
    const payload = {
      ...mockConfig,
      sensors: [
        {
          type: "scd30",
          enabled: true,
          config: {
            calibration: {
              offsets: [1, 2, 3],
            },
          },
        },
      ],
      relays: [
        {
          type: "relay_2ch",
          enabled: true,
          config: { address: 1, alias: "Ventilador" },
        },
      ],
    };

    const result = mapConfigurationResponse(payload);
    (((result.sensors[0].config as { calibration: { offsets: number[] } }).calibration)
      .offsets[0] = 99);

    expect(
      ((payload.sensors[0].config as { calibration: { offsets: number[] } }).calibration)
        .offsets[0]
    ).toBe(1);
  });

  it("rejects invalid configuration responses", () => {
    expect(() => mapConfigurationResponse({ hash: "short" })).toThrow(
      HubApiInvalidResponseError
    );
  });

  it("rejects semantically invalid configuration responses", () => {
    expect(() =>
      mapConfigurationResponse({
        ...mockConfig,
        min_temperature: 40,
        max_temperature: 30,
      })
    ).toThrow(HubApiInvalidResponseError);
  });

  it("maps sensor data responses to SensorData", () => {
    expect(mapSensorDataResponse(mockActual)).toEqual(mockActual);
  });

  it("maps relay list responses to RelayState arrays", () => {
    expect(mapRelayListResponse(mockRelays)).toEqual(mockRelays);
  });

  it("accepts the firmware-style minimal relay shape and fills sane defaults", () => {
    const payload = [
      { address: 1, alias: "Relay 01", r0: 0, r1: 1 },
      { address: 2, alias: "Nuevo Relé GPIO", r0: 1, r1: 0 },
    ];

    const result = mapRelayListResponse(payload);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      address: 1,
      alias: "Relay 01",
      active: true,
      state: [false, true],
      input_state: [false, false],
    });
    // type defaults to a non-empty string so the UI can group the device
    expect(typeof result[0].type).toBe("string");
    expect(result[0].type.length).toBeGreaterThan(0);

    expect(result[1].state).toEqual([true, false]);
  });

  it("treats truthy/numeric r0/r1 as boolean state", () => {
    const result = mapRelayListResponse([
      { address: 3, alias: "x", r0: 1, r1: 0 },
    ]);
    expect(result[0].state).toEqual([true, false]);
  });

  it("rejects relay items missing both address and alias", () => {
    expect(() => mapRelayListResponse([{ r0: 0, r1: 0 }])).toThrow(
      HubApiInvalidResponseError
    );
  });

  it("maps toggle responses to strings", () => {
    expect(mapToggleRelayResponse("OK")).toBe("OK");
  });

  it("rejects invalid sensor data responses", () => {
    expect(() => mapSensorDataResponse(null)).toThrow(
      HubApiInvalidResponseError
    );
  });

  it("rejects sensor data responses with unsupported wifi status", () => {
    expect(() =>
      mapSensorDataResponse({
        ...mockActual,
        wifi_status: "ok",
      })
    ).toThrow(HubApiInvalidResponseError);
  });

  it("derives a_* fields from firmware-style sensors[] payload", () => {
    const payload = {
      wifi_status: "connected",
      sensors: [
        {
          type: "scd30",
          id: "scd30-1",
          active: true,
          error: false,
          readings: [
            { label: "Temp", value: "23.4", unit: "°C", status: "ok", key_var: 0 },
            { label: "Humedad", value: "55.1", unit: "%", status: "ok", key_var: 1 },
            { label: "CO2", value: "612", unit: "ppm", status: "ok", key_var: 2 },
          ],
        },
        {
          type: "bme280",
          id: "bme280-1",
          active: true,
          error: false,
          readings: [
            { label: "Presión", value: "1013.2", unit: "hPa", key_var: 4 },
          ],
        },
      ],
    };

    const result = mapSensorDataResponse(payload);

    expect(result.a_temperature).toBe("23.4");
    expect(result.a_humidity).toBe("55.1");
    expect(result.a_co2).toBe("612");
    expect(result.a_pressure).toBe("1013.2");
    expect(result.wifi_status).toBe("connected");
    expect(result.errors.sensors).toEqual([]);
    expect(result.sensors).toBeDefined();
    expect(result.sensors).toHaveLength(2);
    expect(result.sensors?.[0]?.readings[0]?.label).toBe("Temp");
  });

  it("falls back to label-matching when key_var is missing", () => {
    const payload = {
      wifi_status: "connected",
      sensors: [
        {
          type: "dht22",
          active: true,
          error: false,
          readings: [
            { label: "Temp", value: "21.0", unit: "°C" },
            { label: "Humedad", value: "70.0", unit: "%" },
          ],
        },
      ],
    };

    const result = mapSensorDataResponse(payload);

    expect(result.a_temperature).toBe("21.0");
    expect(result.a_humidity).toBe("70.0");
    expect(result.a_co2).toBe("--");
    expect(result.a_pressure).toBe("--");
  });

  it("flags inactive/error sensors in errors.sensors when using new shape", () => {
    const payload = {
      wifi_status: "disconnected",
      sensors: [
        {
          type: "scd30",
          id: "scd30-1",
          active: false,
          error: true,
          readings: [],
        },
        {
          type: "bme280",
          id: "bme280-1",
          active: true,
          error: false,
          readings: [
            { label: "Temp", value: "20.0", unit: "°C", key_var: 0 },
          ],
        },
      ],
    };

    const result = mapSensorDataResponse(payload);

    expect(result.errors.sensors).toEqual(["scd30-1"]);
    expect(result.errors.wifi).toEqual(["wifi"]);
    expect(result.a_temperature).toBe("20.0");
  });

  it("accepts superset payload that has both legacy and new shape", () => {
    const payload = {
      ...mockActual,
      sensors: [
        {
          type: "scd30",
          id: "scd30-1",
          active: true,
          error: false,
          readings: [
            { label: "Temp", value: "99.9", unit: "°C", key_var: 0 },
          ],
        },
      ],
    };

    const result = mapSensorDataResponse(payload);

    expect(result.a_temperature).toBe(mockActual.a_temperature);
    expect(result.errors).toEqual(mockActual.errors);
    expect(result.sensors).toHaveLength(1);
  });

  it("rejects payloads without legacy fields and without sensors[]", () => {
    expect(() =>
      mapSensorDataResponse({ wifi_status: "connected" })
    ).toThrow(HubApiInvalidResponseError);
  });

  it("rejects invalid relay list responses", () => {
    expect(() => mapRelayListResponse({})).toThrow(
      HubApiInvalidResponseError
    );
  });

  it("rejects invalid toggle responses", () => {
    expect(() => mapToggleRelayResponse(42)).toThrow(
      HubApiInvalidResponseError
    );
  });
});
