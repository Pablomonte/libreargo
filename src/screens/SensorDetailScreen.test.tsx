import React from "react";
import { render, screen } from "@testing-library/react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SensorDetailScreen } from "./SensorDetailScreen";
import { useHubDataStore } from "../stores/hubDataStore";
import type { HubConfig, SensorData } from "../types";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SensorDetail">;

function makeProps(sensorId: string): Props {
  return {
    navigation: { goBack: jest.fn() } as unknown as Props["navigation"],
    route: {
      key: "SensorDetail",
      name: "SensorDetail",
      params: { hubHash: "hub-1", sensorId },
    } as Props["route"],
  };
}

describe("SensorDetailScreen (icon-first redesign)", () => {
  const config: HubConfig = {
    incubator_name: "Hub Demo",
    hash: "hub-1",
    min_temperature: 37.3,
    max_temperature: 37.7,
    min_hum: 55,
    max_hum: 65,
    sensors: [],
    relays: [],
  };

  const actual: SensorData = {
    a_temperature: "25.5",
    a_humidity: "60.0",
    a_co2: "500",
    a_pressure: "1013",
    wifi_status: "connected",
    errors: {
      temperature: [],
      humidity: [],
      sensors: [],
      wifi: [],
      rotation: [],
    },
  };

  beforeEach(() => {
    useHubDataStore.setState({
      config,
      actual,
      relays: [],
      alarms: [],
      devices: [],
      loading: false,
      error: null,
      loadHubData: jest.fn(),
      clearData: jest.fn(),
    });
  });

  it("resolves the device by sensorId and shows its zones and metric", () => {
    useHubDataStore.setState({
      config,
      actual,
      relays: [],
      alarms: [],
      devices: [
        {
          id: "sensor-bme280-0",
          type: "sensor",
          name: "Humedad",
          subtype: "bme280",
          sensorType: "humidity",
          zones: ["Zona A"],
        },
        {
          id: "sensor-bme280-1",
          type: "sensor",
          name: "Temperatura",
          subtype: "bme280",
          sensorType: "temperature",
          zones: ["Zona B"],
        },
      ],
      loading: false,
      error: null,
      loadHubData: jest.fn(),
      clearData: jest.fn(),
    });

    render(<SensorDetailScreen {...makeProps("sensor-bme280-1")} />);

    expect(screen.getByText("Zona B")).toBeTruthy();
    expect(screen.getByText("25.5")).toBeTruthy();
    expect(screen.queryByText("Zona A")).toBeNull();
  });

  it("renders an explicit unsupported state for unknown subtypes", () => {
    render(<SensorDetailScreen {...makeProps("sensor-mystery_sensor-0")} />);

    expect(screen.getByText("MYSTERY_SENSOR")).toBeTruthy();
    expect(screen.getByText("Sensor no soportado")).toBeTruthy();
    expect(screen.queryByText("Temperatura")).toBeNull();
    expect(screen.queryByText("Histórico reciente")).toBeNull();
  });

  it("renders the measurement label and range bar for a supported sensor", () => {
    useHubDataStore.setState({
      config,
      actual,
      relays: [],
      alarms: [],
      devices: [
        {
          id: "sensor-bme280-0",
          type: "sensor",
          name: "Sensor BME280",
          subtype: "bme280",
          sensorType: "humidity",
          zones: ["Zona A"],
        },
      ],
      loading: false,
      error: null,
      loadHubData: jest.fn(),
      clearData: jest.fn(),
    });

    render(<SensorDetailScreen {...makeProps("sensor-bme280-0")} />);

    expect(screen.getByText("Humedad")).toBeTruthy();
    expect(screen.getByTestId("sensor-range-marker")).toBeTruthy();
    expect(screen.getByText("55.0%")).toBeTruthy();
    expect(screen.getByText("65.0%")).toBeTruthy();
  });

  it("renders a supported sensor without a configured range without crashing", () => {
    useHubDataStore.setState({
      config,
      actual,
      relays: [],
      alarms: [],
      devices: [
        {
          id: "sensor-hd38-0",
          type: "sensor",
          name: "Sensor HD38",
          subtype: "hd38",
          sensorType: "co2",
          zones: ["Zona A"],
        },
      ],
      loading: false,
      error: null,
      loadHubData: jest.fn(),
      clearData: jest.fn(),
    });

    render(<SensorDetailScreen {...makeProps("sensor-hd38-0")} />);

    expect(screen.getByText("CO2")).toBeTruthy();
    expect(screen.queryByTestId("sensor-range-marker")).toBeNull();
  });

  it("shows an empty history placeholder for a supported sensor", () => {
    useHubDataStore.setState({
      config,
      actual,
      relays: [],
      alarms: [],
      devices: [
        {
          id: "sensor-bme280-0",
          type: "sensor",
          name: "Sensor BME280",
          subtype: "bme280",
          sensorType: "humidity",
          zones: ["Zona A"],
        },
      ],
      loading: false,
      error: null,
      loadHubData: jest.fn(),
      clearData: jest.fn(),
    });

    render(<SensorDetailScreen {...makeProps("sensor-bme280-0")} />);

    expect(screen.getByText("Sin histórico disponible.")).toBeTruthy();
    expect(screen.queryByTestId("history-row-0")).toBeNull();
  });
});
