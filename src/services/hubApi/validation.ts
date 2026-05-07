import type { HubConfig } from "../../types";

const HUB_ID_REGEX = /^[a-fA-F0-9]{8,}$/;

export class InvalidHubConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidHubConfigError";
  }
}

export function validateHubConfig(config: unknown): HubConfig {
  if (!isPlainObject(config)) {
    throw new InvalidHubConfigError("El hub respondió con datos inválidos");
  }
  const c = config as Partial<HubConfig>;
  if (typeof c.hash !== "string" || !HUB_ID_REGEX.test(c.hash)) {
    throw new InvalidHubConfigError("El hub respondió con un ID inválido");
  }
  if (typeof c.incubator_name !== "string" || c.incubator_name.trim() === "") {
    throw new InvalidHubConfigError("El hub respondió sin nombre");
  }
  if (
    !Number.isFinite(c.min_temperature) ||
    !Number.isFinite(c.max_temperature) ||
    !Number.isFinite(c.min_hum) ||
    !Number.isFinite(c.max_hum) ||
    !Array.isArray(c.sensors) ||
    !Array.isArray(c.relays)
  ) {
    throw new InvalidHubConfigError("El hub respondió con datos inválidos");
  }
  const minTemperature = c.min_temperature as number;
  const maxTemperature = c.max_temperature as number;
  const minHumidity = c.min_hum as number;
  const maxHumidity = c.max_hum as number;
  if (minTemperature > maxTemperature || minHumidity > maxHumidity) {
    throw new InvalidHubConfigError("El hub respondió con rangos inválidos");
  }
  if (
    !c.sensors.every((sensor) => {
      if (!isPlainObject(sensor)) {
        return false;
      }
      if (
        typeof sensor.type !== "string" ||
        typeof sensor.enabled !== "boolean" ||
        !isPlainObject(sensor.config)
      ) {
        return false;
      }
      return (
        sensor.zones === undefined ||
        (Array.isArray(sensor.zones) &&
          sensor.zones.every((zone) => typeof zone === "string"))
      );
    }) ||
    !c.relays.every((relay) => {
      if (!isPlainObject(relay)) {
        return false;
      }
      if (
        typeof relay.type !== "string" ||
        typeof relay.enabled !== "boolean" ||
        !isPlainObject(relay.config)
      ) {
        return false;
      }
      const alias = relay.config.alias;
      if (typeof alias !== "string" || alias.trim() === "") {
        return false;
      }
      // Modbus 2-channel relays must declare a valid modbus slave address.
      // Other relay types (gpio, espnow, etc.) only need a non-empty alias —
      // their addressing is type-specific (pin, mac, ...) and validated
      // downstream when those types are actually used.
      if (relay.type === "relay_2ch") {
        const address = relay.config.address;
        return (
          typeof address === "number" &&
          Number.isInteger(address) &&
          address >= 1 &&
          address <= 247
        );
      }
      return true;
    })
  ) {
    throw new InvalidHubConfigError("El hub respondió con datos inválidos");
  }
  return c as HubConfig;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
