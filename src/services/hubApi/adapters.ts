import type {
  HubConfig,
  RelayState,
  SensorData,
  SensorReadingGroup,
  SensorReadingItem,
} from "../../types";
import {
  HubApiInvalidResponseError,
} from "./errors";
import { InvalidHubConfigError, validateHubConfig } from "./validation";

export function mapConfigurationResponse(payload: unknown): HubConfig {
  try {
    const config = validateHubConfig(payload);
    return {
      incubator_name: config.incubator_name,
      hash: config.hash,
      min_temperature: config.min_temperature,
      max_temperature: config.max_temperature,
      min_hum: config.min_hum,
      max_hum: config.max_hum,
      sensors: config.sensors.map((sensor) => ({
        type: sensor.type,
        enabled: sensor.enabled,
        config: deepCloneRecord(sensor.config),
        zones: sensor.zones ? [...sensor.zones] : undefined,
      })),
      relays: config.relays.map((relay) => ({
        type: relay.type,
        enabled: relay.enabled,
        config: deepCloneRecord(relay.config) as typeof relay.config,
      })),
    };
  } catch (error) {
    if (!(error instanceof InvalidHubConfigError)) {
      throw error;
    }
    throw new HubApiInvalidResponseError();
  }
}

const KEY_VAR_TEMPERATURE = 0;
const KEY_VAR_HUMIDITY = 1;
const KEY_VAR_CO2 = 2;
const KEY_VAR_PRESSURE = 4;
const MISSING_VALUE = "--";

export function mapSensorDataResponse(payload: unknown): SensorData {
  if (!isPlainObject(payload)) {
    throw new HubApiInvalidResponseError();
  }

  const data = payload as Record<string, unknown>;
  if (!isWifiStatus(data.wifi_status)) {
    throw new HubApiInvalidResponseError();
  }

  const hasLegacyFields =
    typeof data.a_temperature === "string" &&
    typeof data.a_humidity === "string" &&
    typeof data.a_co2 === "string" &&
    typeof data.a_pressure === "string" &&
    isErrorCollection(data.errors);

  const sensorGroups = parseSensorGroups(data.sensors);

  if (!hasLegacyFields && sensorGroups === undefined) {
    throw new HubApiInvalidResponseError();
  }

  const a_temperature = hasLegacyFields
    ? (data.a_temperature as string)
    : pickReading(sensorGroups, KEY_VAR_TEMPERATURE, "temp");
  const a_humidity = hasLegacyFields
    ? (data.a_humidity as string)
    : pickReading(sensorGroups, KEY_VAR_HUMIDITY, "humedad");
  const a_co2 = hasLegacyFields
    ? (data.a_co2 as string)
    : pickReading(sensorGroups, KEY_VAR_CO2, "co2");
  const a_pressure = hasLegacyFields
    ? (data.a_pressure as string)
    : pickReading(sensorGroups, KEY_VAR_PRESSURE, "presi");

  const errors: SensorData["errors"] = hasLegacyFields
    ? {
        temperature: [...(data.errors as SensorData["errors"]).temperature],
        humidity: [...(data.errors as SensorData["errors"]).humidity],
        sensors: [...(data.errors as SensorData["errors"]).sensors],
        wifi: [...(data.errors as SensorData["errors"]).wifi],
        rotation: [...(data.errors as SensorData["errors"]).rotation],
      }
    : {
        temperature: [],
        humidity: [],
        sensors: (sensorGroups ?? [])
          .filter((g) => g.error || !g.active)
          .map((g) => g.id ?? g.type),
        wifi:
          data.wifi_status === "disconnected" ? (["wifi"] as readonly string[]) : [],
        rotation: [],
      };

  const result: SensorData = {
    a_temperature,
    a_humidity,
    a_co2,
    a_pressure,
    wifi_status: data.wifi_status,
    errors,
  };

  return sensorGroups ? { ...result, sensors: sensorGroups } : result;
}

function parseSensorGroups(value: unknown): readonly SensorReadingGroup[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const groups: SensorReadingGroup[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj.type !== "string") {
      continue;
    }
    const readings = parseReadings(obj.readings);
    groups.push({
      type: obj.type,
      id: typeof obj.id === "string" ? obj.id : undefined,
      active: obj.active === true,
      error: obj.error === true,
      readings,
    });
  }
  return groups;
}

function parseReadings(value: unknown): readonly SensorReadingItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const out: SensorReadingItem[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) {
      continue;
    }
    const obj = entry as Record<string, unknown>;
    if (typeof obj.label !== "string" || typeof obj.unit !== "string") {
      continue;
    }
    const value = typeof obj.value === "string" ? obj.value : String(obj.value ?? "");
    out.push({
      label: obj.label,
      value,
      unit: obj.unit,
      status: typeof obj.status === "string" ? obj.status : undefined,
      id: typeof obj.id === "string" ? obj.id : undefined,
      key_var: typeof obj.key_var === "number" ? obj.key_var : undefined,
    });
  }
  return out;
}

function pickReading(
  groups: readonly SensorReadingGroup[] | undefined,
  keyVar: number,
  labelHint: string
): string {
  if (!groups) {
    return MISSING_VALUE;
  }
  for (const g of groups) {
    for (const r of g.readings) {
      if (r.key_var === keyVar && r.value !== "") {
        return r.value;
      }
    }
  }
  for (const g of groups) {
    for (const r of g.readings) {
      if (r.label.toLowerCase().includes(labelHint) && r.value !== "") {
        return r.value;
      }
    }
  }
  return MISSING_VALUE;
}

export function mapRelayListResponse(payload: unknown): readonly RelayState[] {
  if (!Array.isArray(payload)) {
    throw new HubApiInvalidResponseError();
  }

  return payload.map((relay) => {
    if (!isPlainObject(relay)) {
      throw new HubApiInvalidResponseError();
    }

    const data = relay as Record<string, unknown>;
    if (
      typeof data.type !== "string" ||
      typeof data.address !== "number" ||
      typeof data.alias !== "string" ||
      typeof data.active !== "boolean" ||
      !isBooleanTuple(data.state) ||
      !isBooleanTuple(data.input_state) ||
      !isOptionalStringArray(data.zones)
    ) {
      throw new HubApiInvalidResponseError();
    }

    return {
      type: data.type,
      address: data.address,
      alias: data.alias,
      active: data.active,
      state: [data.state[0], data.state[1]],
      input_state: [data.input_state[0], data.input_state[1]],
      zones: data.zones ? [...data.zones] : undefined,
    };
  });
}

export function mapToggleRelayResponse(payload: unknown): string {
  if (typeof payload !== "string") {
    throw new HubApiInvalidResponseError();
  }

  const value = payload.trim();
  if (value === "") {
    throw new HubApiInvalidResponseError();
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isErrorCollection(
  value: unknown
): value is SensorData["errors"] {
  return (
    isPlainObject(value) &&
    isStringArray(value.temperature) &&
    isStringArray(value.humidity) &&
    isStringArray(value.sensors) &&
    isStringArray(value.wifi) &&
    isStringArray(value.rotation)
  );
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isOptionalStringArray(
  value: unknown
): value is readonly string[] | undefined {
  return (
    value === undefined ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isBooleanTuple(
  value: unknown
): value is readonly [boolean, boolean] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "boolean" &&
    typeof value[1] === "boolean"
  );
}

function isWifiStatus(value: unknown): value is SensorData["wifi_status"] {
  return (
    value === "connected" ||
    value === "disconnected" ||
    value === "unknown"
  );
}

function deepCloneRecord<T extends Record<string, unknown>>(value: T): T {
  return deepCloneValue(value) as T;
}

function deepCloneValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => deepCloneValue(item));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, deepCloneValue(entry)])
    );
  }
  return value;
}
