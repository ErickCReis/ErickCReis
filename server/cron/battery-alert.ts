import { cron, Patterns } from "@elysia/cron";
import { renderBatteryAlert } from "@server/email/battery-alert";
import { getBatteryInfo } from "@server/lib/battery";
import { isEmailConfigured, sendEmail } from "@server/lib/email";

const BATTERY_ALERT_DISCHARGING_MINUTES = 3;
const BATTERY_ALERT_DISCHARGING_MS = BATTERY_ALERT_DISCHARGING_MINUTES * 60_000;

let batteryAlertSent = false;
let lastBatteryStatus: string | null = null;
let lastBatteryStatusChangedAt = Date.now();

async function sendBatteryAlertEmail(batteryPercent: number) {
  const timestamp = new Date().toISOString();
  return sendEmail(
    renderBatteryAlert({
      batteryPercent,
      dischargingMinutes: BATTERY_ALERT_DISCHARGING_MINUTES,
      timestamp,
    }),
  );
}

async function checkBatteryAndNotify() {
  if (!isEmailConfigured()) return;

  const { batteryPercent, batteryStatus } = getBatteryInfo({ forceRefresh: true });
  const now = Date.now();

  if (batteryStatus !== lastBatteryStatus) {
    batteryAlertSent = false;
    lastBatteryStatus = batteryStatus;
    lastBatteryStatusChangedAt = now;
  }

  const shouldAlert =
    batteryStatus === "discharging" &&
    batteryPercent !== null &&
    now - lastBatteryStatusChangedAt >= BATTERY_ALERT_DISCHARGING_MS;

  if (!shouldAlert || batteryAlertSent) return;

  batteryAlertSent = await sendBatteryAlertEmail(batteryPercent);
}

export const batteryAlertCron = cron({
  name: "batteryAlert",
  pattern: Patterns.EVERY_5_SECONDS,
  run: checkBatteryAndNotify,
});
