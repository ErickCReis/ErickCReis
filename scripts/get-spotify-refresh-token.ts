import * as v from "valibot";

const spotifyTokenResponseSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.object({
    error: v.optional(v.string()),
    error_description: v.optional(v.string()),
    refresh_token: v.optional(v.pipe(v.string(), v.nonEmpty())),
  }),
);

const clientId = Bun.env.SPOTIFY_CLIENT_ID;
const clientSecret = Bun.env.SPOTIFY_CLIENT_SECRET;
const scopes = Bun.env.SPOTIFY_SCOPES ?? "user-read-currently-playing";
const port = Number.parseInt(Bun.env.SPOTIFY_CALLBACK_PORT ?? "8888", 10);

if (!clientId || !clientSecret) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET before running this script.");
  process.exit(1);
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  console.error("SPOTIFY_CALLBACK_PORT must be a number between 1 and 65535.");
  process.exit(1);
}

const redirectUri = `http://127.0.0.1:${port}/callback`;
const state = crypto.randomUUID();
const authorizationUrl = new URL("https://accounts.spotify.com/authorize");

authorizationUrl.search = new URLSearchParams({
  client_id: clientId,
  response_type: "code",
  redirect_uri: redirectUri,
  scope: scopes,
  state,
  show_dialog: "true",
}).toString();

function openBrowser(url: string) {
  let command: string;
  let args: string[];

  switch (process.platform) {
    case "darwin":
      command = "open";
      args = [url];
      break;
    case "linux":
      command = "xdg-open";
      args = [url];
      break;
    case "win32":
      command = "cmd";
      args = ["/c", "start", "", url];
      break;
    default:
      return;
  }

  try {
    const browser = Bun.spawn([command, ...args], {
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
    });
    browser.unref();
  } catch {}
}

function waitForAuthorizationCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    let timeout: ReturnType<typeof setTimeout>;

    const server = Bun.serve({
      hostname: "127.0.0.1",
      port,
      fetch(request) {
        const callbackUrl = new URL(request.url);

        if (callbackUrl.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const finish = (
          status: number,
          message: string,
          result: { code: string } | { error: Error },
        ) => {
          clearTimeout(timeout);
          void server.stop();

          if ("error" in result) reject(result.error);
          else resolve(result.code);

          return new Response(message, {
            status,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        };

        if (callbackUrl.searchParams.get("state") !== state) {
          return finish(400, "Authorization failed. You can close this tab.", {
            error: new Error("State mismatch"),
          });
        }

        const spotifyError = callbackUrl.searchParams.get("error");
        if (spotifyError) {
          return finish(400, "Spotify authorization was denied. You can close this tab.", {
            error: new Error(`Spotify authorization failed: ${spotifyError}`),
          });
        }

        const code = callbackUrl.searchParams.get("code");
        if (!code) {
          return finish(400, "Authorization failed. You can close this tab.", {
            error: new Error("Missing authorization code"),
          });
        }

        return finish(200, "Refresh token created. You can close this tab.", { code });
      },
    });

    timeout = setTimeout(
      () => {
        void server.stop();
        reject(new Error("Spotify authorization timed out after five minutes"));
      },
      5 * 60 * 1000,
    );

    console.error(`Waiting for Spotify authorization at ${redirectUri}`);
    console.error(`If the browser does not open, visit:\n${authorizationUrl}`);
    openBrowser(authorizationUrl.toString());
  });
}

async function requestRefreshToken(code: string): Promise<string> {
  const credentials = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const responseText = await response.text();
  const result = v.safeParse(spotifyTokenResponseSchema, responseText);

  if (!result.success) {
    throw new Error(`Spotify returned an invalid response with status ${response.status}`);
  }

  if (!response.ok) {
    const message = result.output.error_description ?? result.output.error ?? "Unknown error";
    throw new Error(`Spotify token request failed with status ${response.status}: ${message}`);
  }

  if (!result.output.refresh_token) {
    throw new Error("Spotify did not return a refresh token");
  }

  return result.output.refresh_token;
}

try {
  const code = await waitForAuthorizationCode();
  const refreshToken = await requestRefreshToken(code);
  console.log(refreshToken);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
