import { describe, expect, it } from "bun:test";
import { renderBatteryAlert } from "@server/email/battery-alert";

describe("battery alert email", () => {
  it("renders matching HTML and plain-text messages", () => {
    const message = renderBatteryAlert({
      batteryPercent: 42,
      thresholdPercent: 50,
      timestamp: "2026-07-24T20:00:00.000Z",
    });

    expect(message.subject).toBe("Battery alert: 42% and discharging");
    expect(message.text).toContain("Alert threshold: below 50%.");
    expect(message.html).toStartWith("<!doctype html>");
    expect(message.html).toContain(">42%</strong>");
  });
});
