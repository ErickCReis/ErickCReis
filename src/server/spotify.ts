const SPOTIFY_TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const SPOTIFY_NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";
const SPOTIFY_ACTIVE_POLL_INTERVAL_MS = 2500;
const SPOTIFY_IDLE_POLL_INTERVAL_MS = 15000;
const SPOTIFY_RATE_LIMIT_FALLBACK_MS = 30_000;
const TOKEN_EXPIRY_SAFETY_MARGIN_MS = 60_000;

type SpotifyTokenCache = {
  accessToken: string;
  expiresAt: number;
};

export type SpotifyNowPlaying = {
  isConfigured: boolean;
  isPlaying: boolean;
  trackId: string | null;
  trackName: string | null;
  artistNames: string[];
  albumName: string | null;
  trackUrl: string | null;
  progressMs: number;
  durationMs: number;
  fetchedAt: number;
};

type SpotifyTrackPayload = {
  id: string;
  name: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: {
    name: string;
  };
  external_urls?: {
    spotify?: string;
  };
};

type SpotifyNowPlayingResponse = {
  is_playing: boolean;
  progress_ms: number | null;
  currently_playing_type: string;
  item: SpotifyTrackPayload | null;
};

function hasSpotifyCredentials() {
  return Boolean(Bun.env.SPOTIFY_CLIENT_ID && Bun.env.SPOTIFY_CLIENT_SECRET && Bun.env.SPOTIFY_REFRESH_TOKEN);
}

function createEmptyNowPlaying(isConfigured: boolean): SpotifyNowPlaying {
  return {
    isConfigured,
    isPlaying: false,
    trackId: null,
    trackName: null,
    artistNames: [],
    albumName: null,
    trackUrl: null,
    progressMs: 0,
    durationMs: 0,
    fetchedAt: Date.now(),
  };
}

let tokenCache: SpotifyTokenCache | null = null;
let latestNowPlaying = createEmptyNowPlaying(hasSpotifyCredentials());
let isPollerStarted = false;

function setUnconfiguredNowPlaying() {
  latestNowPlaying = createEmptyNowPlaying(false);
}

function getClientCredentials() {
  const clientId = Bun.env.SPOTIFY_CLIENT_ID;
  const clientSecret = Bun.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = Bun.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  return { clientId, clientSecret, refreshToken };
}

function createBasicAuthHeader(clientId: string, clientSecret: string) {
  const base64Auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${base64Auth}`;
}

function invalidateTokenCache() {
  tokenCache = null;
}

async function getSpotifyAccessToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + TOKEN_EXPIRY_SAFETY_MARGIN_MS) {
    return tokenCache.accessToken;
  }

  const credentials = getClientCredentials();
  if (!credentials) {
    throw new Error("Missing Spotify credentials");
  }

  const response = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: createBasicAuthHeader(credentials.clientId, credentials.clientSecret),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: credentials.refreshToken,
    }),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Spotify token refresh failed (${response.status}): ${responseText}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };

  return payload.access_token;
}

function parseRetryAfterMs(retryAfterHeaderValue: string | null) {
  const retryAfterSeconds = Number.parseInt(retryAfterHeaderValue ?? "", 10);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1000;
  }

  return SPOTIFY_RATE_LIMIT_FALLBACK_MS;
}

function getPollIntervalMs(isPlaying: boolean) {
  return isPlaying ? SPOTIFY_ACTIVE_POLL_INTERVAL_MS : SPOTIFY_IDLE_POLL_INTERVAL_MS;
}

async function requestNowPlaying(accessToken: string) {
  const response = await fetch(SPOTIFY_NOW_PLAYING_ENDPOINT, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 204) {
    return {
      nowPlaying: createEmptyNowPlaying(true),
      retryAfterMs: null,
    };
  }

  if (response.status === 401) {
    invalidateTokenCache();
    throw new Error("Spotify access token rejected");
  }

  if (response.status === 429) {
    return {
      nowPlaying: null,
      retryAfterMs: parseRetryAfterMs(response.headers.get("retry-after")),
    };
  }

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Spotify now-playing request failed (${response.status}): ${responseText}`);
  }

  const payload = (await response.json()) as SpotifyNowPlayingResponse;
  const item = payload.item;

  if (payload.currently_playing_type !== "track" || !item) {
    return {
      nowPlaying: createEmptyNowPlaying(true),
      retryAfterMs: null,
    };
  }

  return {
    nowPlaying: {
      isConfigured: true,
      isPlaying: payload.is_playing,
      trackId: item.id,
      trackName: item.name,
      artistNames: item.artists.map((artist) => artist.name),
      albumName: item.album.name,
      trackUrl: item.external_urls?.spotify ?? null,
      progressMs: payload.progress_ms ?? 0,
      durationMs: item.duration_ms ?? 0,
      fetchedAt: Date.now(),
    } satisfies SpotifyNowPlaying,
    retryAfterMs: null,
  };
}

async function refreshNowPlayingSnapshot() {
  if (!hasSpotifyCredentials()) {
    setUnconfiguredNowPlaying();
    return SPOTIFY_IDLE_POLL_INTERVAL_MS;
  }

  try {
    const token = await getSpotifyAccessToken();
    const { nowPlaying, retryAfterMs } = await requestNowPlaying(token);

    if (retryAfterMs !== null) {
      console.warn(`[spotify] Rate limited. Backing off for ${retryAfterMs}ms.`);
      return retryAfterMs;
    }

    if (nowPlaying) {
      latestNowPlaying = nowPlaying;
    }
  } catch (error) {
    console.error("[spotify] Failed to refresh now-playing snapshot", error);
    latestNowPlaying = {
      ...createEmptyNowPlaying(true),
      fetchedAt: Date.now(),
    };
  }

  return getPollIntervalMs(latestNowPlaying.isPlaying);
}

export function startSpotifyPoller() {
  const hasCredentials = hasSpotifyCredentials();
  if (isPollerStarted || !hasCredentials) {
    if (!hasCredentials) {
      setUnconfiguredNowPlaying();
    }
    return;
  }

  isPollerStarted = true;
  const tick = async () => {
    if (!isPollerStarted) {
      return;
    }

    const nextIntervalMs = await refreshNowPlayingSnapshot();
    if (!isPollerStarted) {
      return;
    }

    setTimeout(() => {
      void tick();
    }, nextIntervalMs);
  };

  void tick();
}

export function getLatestSpotifyNowPlaying(): SpotifyNowPlaying {
  return {
    ...latestNowPlaying,
    artistNames: [...latestNowPlaying.artistNames],
  };
}
