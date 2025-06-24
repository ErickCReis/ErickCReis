import type { CursorPositionRouter } from "@ErickCReis/server/cursor-position-router";
import type { AppRouter } from "@ErickCReis/server/router";
import { PUBLIC_API_URL } from "astro:env/client";
import { createORPCClient } from "@orpc/client";
import { RPCLink as RPCFetchLink } from "@orpc/client/fetch";
import { experimental_RPCLink as RPCWebSocketLink } from "@orpc/client/websocket";
import type { RouterClient } from "@orpc/server";

const fetchLink = new RPCFetchLink({
  url: `${PUBLIC_API_URL}/rpc`,
  fetch: (request, init) =>
    globalThis.fetch(request, {
      ...init,
      credentials: "include",
    }),
});

const websocketLink = new RPCWebSocketLink({
  websocket: new WebSocket(
    `${PUBLIC_API_URL}/cursor-position`.replace("http", "ws"),
  ),
});

export const client: RouterClient<AppRouter> = createORPCClient(fetchLink);

export const clientCursorPosition: RouterClient<CursorPositionRouter> =
  createORPCClient(websocketLink);
