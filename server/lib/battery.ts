import { readdirSync } from "node:fs";
import { readTextFile } from "@server/lib/file";

export type BatteryStatus = "charging" | "discharging" | "full" | "unknown";

export interface BatteryInfo {
  batteryPercent: number | null;
  batteryStatus: BatteryStatus | null;
}

const BATTERY_SUPPLY_ROOT = Bun.env.BATTERY_SUPPLY_ROOT ?? "/sys/class/power_supply";
const BATTERY_CACHE_MS = 15_000;

let cachedBatteryInfo: BatteryInfo = { batteryPercent: null, batteryStatus: null };
let cachedBatteryAt = 0;

function normalizeBatteryStatus(raw: string | null): BatteryStatus {
  const value = raw?.toLowerCase();
  if (value === "charging") return "charging";
  if (value === "discharging") return "discharging";
  if (value === "full") return "full";
  return "unknown";
}

function readBatteryInfo(): BatteryInfo {
  let entries: string[] = [];
  try {
    entries = readdirSync(BATTERY_SUPPLY_ROOT);
  } catch {
    return { batteryPercent: null, batteryStatus: null };
  }

  const batteryDir = entries.find((entry) => entry.startsWith("BAT"));
  if (!batteryDir) return { batteryPercent: null, batteryStatus: null };

  const capacityRaw = readTextFile(`${BATTERY_SUPPLY_ROOT}/${batteryDir}/capacity`);
  const statusRaw = readTextFile(`${BATTERY_SUPPLY_ROOT}/${batteryDir}/status`);
  const capacity = capacityRaw == null ? Number.NaN : Number(capacityRaw);

  return {
    batteryPercent:
      Number.isFinite(capacity) && capacity >= 0 && capacity <= 100
        ? Number(capacity.toFixed(2))
        : null,
    batteryStatus: statusRaw == null ? null : normalizeBatteryStatus(statusRaw),
  };
}

export function getBatteryInfo(options?: { forceRefresh?: boolean }): BatteryInfo {
  const forceRefresh = options?.forceRefresh ?? false;
  const now = Date.now();

  if (!forceRefresh && now - cachedBatteryAt < BATTERY_CACHE_MS) {
    return cachedBatteryInfo;
  }

  cachedBatteryInfo = readBatteryInfo();
  cachedBatteryAt = now;
  return cachedBatteryInfo;
}
