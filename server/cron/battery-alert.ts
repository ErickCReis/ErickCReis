import { cron, Patterns } from "@elysiajs/cron";
import { renderBatteryAlert } from "@server/email/battery-alert";
import { getBatteryInfo } from "@server/lib/battery";
import { isEmailConfigured, sendEmail } from "@server/lib/email";

const BATTERY_ALERT_THRESHOLD_PERCENT = 50;

let batteryAlertSent = false;
let lastBatteryStatus: string | null = null;

async function sendBatteryAlertEmail(batteryPercent: number) {
  const timestamp = new Date().toISOString();
  return sendEmail(
    renderBatteryAlert({
      batteryPercent,
      thresholdPercent: BATTERY_ALERT_THRESHOLD_PERCENT,
      timestamp,
    }),
  );
}

async function checkBatteryAndNotify() {
  if (!isEmailConfigured()) return;

  const { batteryPercent, batteryStatus } = getBatteryInfo({ forceRefresh: true });

  if (batteryStatus !== lastBatteryStatus) {
    batteryAlertSent = false;
    lastBatteryStatus = batteryStatus;
  }

  const shouldAlert =
    batteryStatus === "discharging" &&
    batteryPercent !== null &&
    batteryPercent < BATTERY_ALERT_THRESHOLD_PERCENT;

  if (!shouldAlert || batteryAlertSent) return;

  batteryAlertSent = await sendBatteryAlertEmail(batteryPercent);
}

export const batteryAlertCron = cron({
  name: "batteryAlert",
  pattern: Patterns.EVERY_5_SECONDS,
  run: checkBatteryAndNotify,
});
