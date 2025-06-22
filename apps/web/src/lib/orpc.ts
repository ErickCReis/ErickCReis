import type { AppRouter } from "@ErickCReis/server/router";
import { PUBLIC_API_URL } from "astro:env/client";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";

const link = new RPCLink({
  url: `${PUBLIC_API_URL}/rpc`,
  fetch: (request, init) =>
    globalThis.fetch(request, {
      ...init,
      credentials: "include",
    }),
});

export const client: RouterClient<AppRouter> = createORPCClient(link);
