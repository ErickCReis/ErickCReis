import { describe, expect, it } from "bun:test";
import { createSpotifyTokenAlert } from "@server/stats/spotify-token-alert";

describe("Spotify token alert", () => {
  const failure = {
    errorDescription: "Refresh token revoked",
    timestamp: "2026-09-02T18:00:00.000Z",
  };

  it("sends once until reset", async () => {
    let deliveries = 0;
    const alert = createSpotifyTokenAlert({
      isEmailConfigured: () => true,
      sendEmail: async () => {
        deliveries++;
        return true;
      },
    });

    expect(await alert.notify(failure)).toBe(true);
    expect(await alert.notify(failure)).toBe(false);
    expect(deliveries).toBe(1);

    alert.reset();
    expect(await alert.notify(failure)).toBe(true);
    expect(deliveries).toBe(2);
  });

  it("retries after delivery fails", async () => {
    let attempts = 0;
    const alert = createSpotifyTokenAlert({
      isEmailConfigured: () => true,
      sendEmail: async () => ++attempts > 1,
    });

    expect(await alert.notify(failure)).toBe(false);
    expect(await alert.notify(failure)).toBe(true);
    expect(attempts).toBe(2);
  });

  it("coalesces concurrent delivery attempts", async () => {
    let attempts = 0;
    const alert = createSpotifyTokenAlert({
      isEmailConfigured: () => true,
      sendEmail: async () => {
        attempts++;
        await Promise.resolve();
        return true;
      },
    });

    const results = await Promise.all([alert.notify(failure), alert.notify(failure)]);

    expect(results).toEqual([true, true]);
    expect(attempts).toBe(1);
  });
});
