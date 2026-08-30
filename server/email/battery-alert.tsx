/** @jsx emailElement */
/* oxlint-disable no-unused-vars -- emailElement is referenced by Bun's JSX transform. */

import {
  EmailCard,
  EmailHeading,
  EmailLayout,
  EmailText,
  emailElement,
  renderEmail,
} from "@server/email/components";

void emailElement;

type BatteryAlert = {
  batteryPercent: number;
  thresholdPercent: number;
  timestamp: string;
};

function BatteryAlertEmail(props: BatteryAlert) {
  return (
    <EmailLayout preview={`Battery alert: ${props.batteryPercent}% and discharging`}>
      <EmailCard>
        <EmailHeading>Battery alert</EmailHeading>
        <EmailText>
          Your battery is at <strong>{props.batteryPercent}%</strong> and is currently{" "}
          <strong>discharging</strong>.
        </EmailText>
        <EmailText>
          Alert threshold: below <strong>{props.thresholdPercent}%</strong>.
        </EmailText>
        <EmailText>
          Checked at: <code>{props.timestamp}</code>.
        </EmailText>
      </EmailCard>
    </EmailLayout>
  );
}

export function renderBatteryAlert(alert: BatteryAlert) {
  return {
    subject: `Battery alert: ${alert.batteryPercent}% and discharging`,
    text: [
      "Battery alert",
      "",
      `Your battery is at ${alert.batteryPercent}% and is currently discharging.`,
      `Alert threshold: below ${alert.thresholdPercent}%.`,
      `Checked at: ${alert.timestamp}.`,
    ].join("\n"),
    html: renderEmail(() => <BatteryAlertEmail {...alert} />),
  };
}
