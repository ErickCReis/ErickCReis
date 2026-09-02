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

type SpotifyTokenAlert = {
  errorDescription: string;
  timestamp: string;
};

function SpotifyTokenAlertEmail(props: SpotifyTokenAlert) {
  return (
    <EmailLayout preview="Spotify rejected the refresh token">
      <EmailCard>
        <EmailHeading>Spotify refresh token rejected</EmailHeading>
        <EmailText>
          Spotify rejected the configured refresh token. Now-playing updates have stopped.
        </EmailText>
        <EmailText>
          Reason: <code>{props.errorDescription}</code>.
        </EmailText>
        <EmailText>
          Generate a new token with <code>bun scripts/get-spotify-refresh-token.ts</code>.
        </EmailText>
        <EmailText>
          Update <code>SPOTIFY_REFRESH_TOKEN</code>, then restart the server.
        </EmailText>
        <EmailText>
          Detected at: <code>{props.timestamp}</code>.
        </EmailText>
      </EmailCard>
    </EmailLayout>
  );
}

export function renderSpotifyTokenAlert(alert: SpotifyTokenAlert) {
  return {
    subject: "Spotify refresh token expired or revoked",
    text: [
      "Spotify refresh token rejected",
      "",
      "Spotify rejected the configured refresh token. Now-playing updates have stopped.",
      `Reason: ${alert.errorDescription}.`,
      "Generate a new token with bun scripts/get-spotify-refresh-token.ts.",
      "Update SPOTIFY_REFRESH_TOKEN, then restart the server.",
      `Detected at: ${alert.timestamp}.`,
    ].join("\n"),
    html: renderEmail(() => <SpotifyTokenAlertEmail {...alert} />),
  };
}
