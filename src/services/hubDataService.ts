import type {
  HubConfig,
  SensorData,
  RelayState,
  Alarm,
  Recommendation,
} from "../types";
import { getHubApiClient } from "./hubApi/backend";
export {
  InvalidHubConfigError,
  validateHubConfig,
} from "./hubApi/validation";

export async function getConfig(_hubIp: string): Promise<HubConfig> {
  return getHubApiClient().getConfig(_hubIp);
}

export async function getActual(hubIp: string): Promise<SensorData> {
  return getHubApiClient().getActual(hubIp);
}

export async function getRelays(
  hubIp: string
): Promise<readonly RelayState[]> {
  return getHubApiClient().getRelays(hubIp);
}

export async function getAlarms(_hubIp: string): Promise<readonly Alarm[]> {
  return [];
}

export async function toggleRelay(
  hubIp: string,
  addr: number,
  ch: number
): Promise<string> {
  return getHubApiClient().toggleRelay(hubIp, addr, ch);
}

export async function getRecommendations(): Promise<readonly Recommendation[]> {
  return [];
}

export async function pingHub(_hubIp: string): Promise<boolean> {
  try {
    await getHubApiClient().getConfig(_hubIp);
    return true;
  } catch {
    return false;
  }
}
