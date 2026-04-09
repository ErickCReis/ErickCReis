import { cron, Patterns } from "@elysiajs/cron";
import { Resend } from "resend";
import { getBatteryInfo } from "@server/lib/battery";

const BATTERY_ALERT_THRESHOLD_PERCENT = 50;

const RESEND_API_KEY = Bun.env.RESEND_API_KEY?.trim() || null;
const BATTERY_ALERT_EMAIL_TO = Bun.env.BATTERY_ALERT_EMAIL_TO?.trim() || null;

const resend = RESEND_API_KEY && BATTERY_ALERT_EMAIL_TO ? new Resend(RESEND_API_KEY) : null;

let batteryAlertSent = false;
let lastBatteryStatus: string | null = null;

async function sendBatteryAlertEmail(batteryPercent: number) {
  if (!resend || !BATTERY_ALERT_EMAIL_TO) return false;

  const timestamp = new Date().toISOString();
  const { error } = await resend.emails.send({
    from: "Erick <erick@erickr.dev>",
    to: [BATTERY_ALERT_EMAIL_TO],
    subject: `Battery alert: ${batteryPercent}% and discharging`,
    text: [
      "Battery alert",
      "",
      `Your battery is at ${batteryPercent}% and is currently discharging.`,
      `Alert threshold: below ${BATTERY_ALERT_THRESHOLD_PERCENT}%.`,
      `Checked at: ${timestamp}.`,
    ].join("\n"),
    html: [
      "<h1>Battery alert</h1>",
      `<p>Your battery is at <strong>${batteryPercent}%</strong> and is currently <strong>discharging</strong>.</p>`,
      `<p>Alert threshold: below <strong>${BATTERY_ALERT_THRESHOLD_PERCENT}%</strong>.</p>`,
      `<p>Checked at: <code>${timestamp}</code>.</p>`,
    ].join(""),
  });

  return !error;
}

async function checkBatteryAndNotify() {
  if (resend == null) return;

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
