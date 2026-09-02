import { describe, expect, it } from "bun:test";
import { renderSpotifyTokenAlert } from "@server/email/spotify-token-alert";

describe("Spotify token alert email", () => {
  it("renders matching HTML and plain-text messages", () => {
    const message = renderSpotifyTokenAlert({
      errorDescription: "Refresh token revoked",
      timestamp: "2026-09-02T18:00:00.000Z",
    });

    expect(message.subject).toBe("Spotify refresh token expired or revoked");
    expect(message.text).toContain("Now-playing updates have stopped.");
    expect(message.text).toContain("Reason: Refresh token revoked.");
    expect(message.html).toStartWith("<!doctype html>");
    expect(message.html).toContain("SPOTIFY_REFRESH_TOKEN");
  });
});
