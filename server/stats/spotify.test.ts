import { describe, expect, it } from "bun:test";
import { parseSpotifyTokenError } from "@server/stats/spotify";

describe("parseSpotifyTokenError", () => {
  it("reads an invalid_grant response", () => {
    expect(
      parseSpotifyTokenError(
        JSON.stringify({
          error: "invalid_grant",
          error_description: "Refresh token revoked",
        }),
      ),
    ).toEqual({
      error: "invalid_grant",
      errorDescription: "Refresh token revoked",
    });
  });

  it("rejects malformed JSON and invalid fields", () => {
    expect(parseSpotifyTokenError("Bad gateway")).toEqual({
      error: null,
      errorDescription: null,
    });
    expect(parseSpotifyTokenError('{"error":400}')).toEqual({
      error: null,
      errorDescription: null,
    });
  });
});
