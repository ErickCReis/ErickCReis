import type { AppRouter } from "@ErickCReis/server/router";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

const link = new RPCLink({
  url: "http://localhost:3000/rpc",
  fetch: (request, init) =>
    globalThis.fetch(request, {
      ...init,
      credentials: "include",
    }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);
