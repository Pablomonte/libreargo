import { useHubDataStore } from "./hubDataStore";
import { buildHubSensorDevices } from "../features/sensors/buildHubSensorDevices";
import {
  getActual,
  getAlarms,
  getConfig,
  getRelays,
} from "../services/hubDataService";
import { HubApiNetworkError, HubApiTimeoutError } from "../services/hubApi/errors";

jest.mock("../services/hubApi/backend", () => {
  throw new Error("hubDataStore should not import the backend selector directly");
});

jest.mock("../services/hubDataService", () => ({
  getConfig: jest.fn(),
  getActual: jest.fn(),
  getRelays: jest.fn(),
  getAlarms: jest.fn(),
}));

jest.mock("../features/sensors/buildHubSensorDevices", () => ({
  buildHubSensorDevices: jest.fn(),
}));

describe("hubDataStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useHubDataStore.setState(useHubDataStore.getInitialState(), true);
  });

  it("loads hub data through the service facade and derives devices from config plus relays", async () => {
    const config = {
      hash: "abc12345",
      incubator_name: "Incubadora Norte",
      min_temperature: 18,
      max_temperature: 38,
      min_hum: 45,
      max_hum: 70,
      sensors: [
        {
          type: "scd30",
          enabled: true,
          config: {},
          zones: ["zone-a"],
        },
      ],
      relays: [
        {
          type: "relay_2ch",
          enabled: true,
          config: {
            address: 2,
            alias: "Extractor",
          },
        },
      ],
    };
    const actual = {
      a_temperature: "24.1",
      a_humidity: "55.2",
      a_co2: "620",
      a_pressure: "1012",
      wifi_status: "connected",
      errors: {
        temperature: [],
        humidity: [],
        sensors: [],
        wifi: [],
        rotation: [],
      },
    };
    const relays = [
      {
        type: "relay_2ch",
        address: 2,
        alias: "Extractor",
        active: true,
        state: [true, false] as const,
        input_state: [false, false] as const,
        zones: ["zone-a"],
      },
    ];
    const alarms = [
      {
        id: "alarm-1",
        timestamp: "2026-04-20T12:00:00.000Z",
        dataType: "temperature",
        alertValue: 35,
        currentValue: 36,
        zones: ["zone-a"],
        status: "active",
      },
    ];

    (getConfig as jest.Mock).mockResolvedValue(config);
    (getActual as jest.Mock).mockResolvedValue(actual);
    (getRelays as jest.Mock).mockResolvedValue(relays);
    (getAlarms as jest.Mock).mockResolvedValue(alarms);
    (buildHubSensorDevices as jest.Mock).mockReturnValue([
      {
        id: "sensor-1",
        type: "sensor",
        name: "Sensor principal",
        subtype: "scd30",
        sensorType: "temperature",
        zones: ["zone-a"],
      },
    ]);

    await useHubDataStore.getState().loadHubData("192.168.1.50");

    expect(getConfig).toHaveBeenCalledWith("192.168.1.50");
    expect(getActual).toHaveBeenCalledWith("192.168.1.50");
    expect(getRelays).toHaveBeenCalledWith("192.168.1.50");
    expect(getAlarms).toHaveBeenCalledWith("192.168.1.50");
    expect(buildHubSensorDevices).toHaveBeenCalledWith(config);

    expect(useHubDataStore.getState()).toMatchObject({
      config,
      actual,
      relays,
      alarms,
      loading: false,
      error: null,
    });
    expect(useHubDataStore.getState().devices).toEqual([
      {
        id: "sensor-1",
        type: "sensor",
        name: "Sensor principal",
        subtype: "scd30",
        sensorType: "temperature",
        zones: ["zone-a"],
      },
      {
        id: "relay-2",
        type: "actuator",
        name: "Extractor",
        subtype: "relay_2ch",
        zones: ["zone-a"],
        relayAddress: 2,
      },
    ]);
  });

  it("sets an error and clears loading when the facade rejects", async () => {
    (getConfig as jest.Mock).mockResolvedValue({
      hash: "abc12345",
      incubator_name: "Incubadora Norte",
      min_temperature: 18,
      max_temperature: 38,
      min_hum: 45,
      max_hum: 70,
      sensors: [],
      relays: [],
    });
    (getActual as jest.Mock).mockRejectedValue(new Error("hub offline"));
    (getRelays as jest.Mock).mockResolvedValue([]);
    (getAlarms as jest.Mock).mockResolvedValue([]);
    (buildHubSensorDevices as jest.Mock).mockReturnValue([]);

    await useHubDataStore.getState().loadHubData("192.168.1.50");

    expect(useHubDataStore.getState()).toMatchObject({
      loading: false,
      error: "No se pudieron cargar los datos del hub",
    });
  });

  it("propagates the HubApiError message to error state", async () => {
    (getConfig as jest.Mock).mockRejectedValue(new HubApiTimeoutError());
    (getActual as jest.Mock).mockResolvedValue({});
    (getRelays as jest.Mock).mockResolvedValue([]);
    (getAlarms as jest.Mock).mockResolvedValue([]);

    await useHubDataStore.getState().loadHubData("192.168.1.50");

    expect(useHubDataStore.getState().error).toBe(
      "El hub tardó demasiado en responder"
    );
    expect(useHubDataStore.getState().loading).toBe(false);
  });

  describe("refreshActual", () => {
    it("updates only `actual` without touching loading or other slices", async () => {
      const previous = {
        a_temperature: "20.0",
        a_humidity: "50",
        a_co2: "400",
        a_pressure: "1010",
        wifi_status: "connected" as const,
        errors: {
          temperature: [],
          humidity: [],
          sensors: [],
          wifi: [],
          rotation: [],
        },
      };
      useHubDataStore.setState({
        actual: previous,
        config: { existing: true } as never,
        loading: false,
      });

      const next = { ...previous, a_temperature: "22.5" };
      (getActual as jest.Mock).mockResolvedValue(next);

      await useHubDataStore.getState().refreshActual("192.168.1.50");

      expect(useHubDataStore.getState().actual).toEqual(next);
      expect(useHubDataStore.getState().loading).toBe(false);
      expect(useHubDataStore.getState().config).toEqual({ existing: true });
    });

    it("swallows transient errors so polling stays silent", async () => {
      const before = useHubDataStore.getState().actual;
      (getActual as jest.Mock).mockRejectedValue(new HubApiNetworkError());

      await expect(
        useHubDataStore.getState().refreshActual("192.168.1.50")
      ).resolves.toBeUndefined();

      expect(useHubDataStore.getState().actual).toBe(before);
      expect(useHubDataStore.getState().error).toBeNull();
    });
  });

  it("clearData resets per-hub slices but keeps loading flag false", () => {
    useHubDataStore.setState({
      config: { x: 1 } as never,
      actual: { y: 2 } as never,
      relays: [{}] as never,
      alarms: [{}] as never,
      devices: [{}] as never,
      error: "previous error",
    });

    useHubDataStore.getState().clearData();

    expect(useHubDataStore.getState()).toMatchObject({
      config: null,
      actual: null,
      relays: [],
      alarms: [],
      devices: [],
      error: null,
    });
  });
});
